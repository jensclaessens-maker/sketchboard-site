// The Endless Sketchbookery — infinite-canvas engine.
// Preserved verbatim from the original static site; only change: image URLs
// are absolute ('/images/...') so they resolve correctly on every route.

// ╔══════════════════════════════════════════════════════════════════╗
//  STATE
// ╚══════════════════════════════════════════════════════════════════╝
const cv    = document.getElementById('cv');
const world = document.getElementById('world');
const empty = document.getElementById('empty');
const toast = document.getElementById('toast');

let ox = 0, oy = 0, sc = 1;
let sketches = [];
let token    = sessionStorage.getItem('sb_token') || null;

// Virtualization state
const mounted = new Map(); // sketch id → DOM element currently in the canvas
let draggingId = null;     // never cull the card being dragged

// ╔══════════════════════════════════════════════════════════════════╗
//  API HELPERS
// ╚══════════════════════════════════════════════════════════════════╝
async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body === 'object') {
    opts.body = JSON.stringify(opts.body);
    opts.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, opts);
  if (res.status === 401) {
    sessionStorage.removeItem('sb_token');
    token = null;
    showGate();
    throw new Error('unauthorized');
  }
  return res.json();
}

// ╔══════════════════════════════════════════════════════════════════╗
//  LOGIN GATE
// ╚══════════════════════════════════════════════════════════════════╝
const gate   = document.getElementById('gate');
const pinIn  = document.getElementById('pin');

function showGate() { gate.classList.remove('hide'); pinIn.focus(); }
function hideGate() { gate.classList.add('hide'); }

document.getElementById('btn-auth').addEventListener('click', async () => {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pinIn.value }),
  });
  if (res.ok) {
    const data = await res.json();
    token = data.token;
    sessionStorage.setItem('sb_token', token);
    pinIn.value = '';
    hideGate();
    loadAndRender();
  } else {
    pinIn.classList.remove('shake'); void pinIn.offsetWidth;
    pinIn.classList.add('shake');
    pinIn.value = ''; pinIn.focus();
  }
});
pinIn.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-auth').click(); });

// Validate any stored token against an auth-gated endpoint (/api/stats).
// (/api/data is public, so it would accept any token — including stale/forged.)
async function checkToken() {
  if (!token) return false;
  try {
    const r = await fetch('/api/stats', { headers: { 'Authorization': 'Bearer ' + token }});
    if (!r.ok) { sessionStorage.removeItem('sb_token'); token = null; return false; }
    return true;
  } catch { return false; }
}

// ╔══════════════════════════════════════════════════════════════════╗
//  TRANSFORM
// ╚══════════════════════════════════════════════════════════════════╝
function applyT() {
  world.style.transform = `translate(${ox}px,${oy}px) scale(${sc})`;
  cull();
}

function fitAll() {
  if (!sketches.length) {
    ox = cv.clientWidth / 2; oy = cv.clientHeight / 2; sc = 1; applyT(); return;
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  sketches.forEach(s => {
    x0 = Math.min(x0, s.x);          y0 = Math.min(y0, s.y);
    x1 = Math.max(x1, s.x + s.w);    y1 = Math.max(y1, s.y + s.h);
  });
  const mg = 40;
  sc = Math.min((cv.clientWidth - mg * 2) / (x1 - x0), (cv.clientHeight - mg * 2) / (y1 - y0), 2);
  ox = cv.clientWidth  / 2 - (x0 + (x1 - x0) / 2) * sc;
  oy = cv.clientHeight / 2 - (y0 + (y1 - y0) / 2) * sc;
  applyT();
}

// ╔══════════════════════════════════════════════════════════════════╗
//  PAN — mouse
//  Pans when clicking empty canvas, OR when clicking on a locked sketch.
//  Locked cards act as "background" — handy for densely packed canvases:
//  lock the sketches you've placed, then drag from anywhere over them to pan.
// ╚══════════════════════════════════════════════════════════════════╝
let pan = false, px0 = 0, py0 = 0;

cv.addEventListener('mousedown', e => {
  if (e.button !== 0) return; // left button only
  // Allow panning when target is the canvas itself or any descendant of a locked sketch
  const onEmpty  = e.target === cv || e.target === world;
  const onLocked = e.target.closest && e.target.closest('.sk.locked');
  if (!onEmpty && !onLocked) return;
  // Don't start a pan when clicking a button (lock toggle on the locked card)
  if (e.target.tagName === 'BUTTON') return;
  pan = true;
  px0 = e.clientX - ox; py0 = e.clientY - oy;
  cv.classList.add('pan');
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (!pan) return;
  ox = e.clientX - px0; oy = e.clientY - py0; applyT();
});
document.addEventListener('mouseup', () => { pan = false; cv.classList.remove('pan'); });

// ╔══════════════════════════════════════════════════════════════════╗
//  PAN — touch (and pinch)
//  Same gesture-transition fix as the viewer: re-anchor on every
//  touchstart and touchend so adding/lifting a finger doesn't jump.
// ╚══════════════════════════════════════════════════════════════════╝
let t0x = 0, t0y = 0, pd = 0;

function anchorTouches(touches) {
  if (touches.length === 1) {
    t0x = touches[0].clientX - ox;
    t0y = touches[0].clientY - oy;
    pd  = 0;
  } else if (touches.length >= 2) {
    pd = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
    const mx = (touches[0].clientX + touches[1].clientX) / 2;
    const my = (touches[0].clientY + touches[1].clientY) / 2;
    t0x = mx - ox;
    t0y = my - oy;
  } else {
    pd = 0;
  }
}

cv.addEventListener('touchstart',  e => anchorTouches(e.touches), { passive: true });
cv.addEventListener('touchend',    e => anchorTouches(e.touches), { passive: true });
cv.addEventListener('touchcancel', e => anchorTouches(e.touches), { passive: true });

cv.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    ox = e.touches[0].clientX - t0x;
    oy = e.touches[0].clientY - t0y;
  } else if (e.touches.length >= 2 && pd) {
    const d  = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const f  = d / pd;
    ox = mx - (mx - ox) * f;
    oy = my - (my - oy) * f;
    sc = Math.min(Math.max(sc * f, .04), 12);
    pd = d;
    t0x = mx - ox;
    t0y = my - oy;
  }
  applyT();
}, { passive: false });

// ╔══════════════════════════════════════════════════════════════════╗
//  ZOOM — wheel
// ╚══════════════════════════════════════════════════════════════════╝
// A horizontal component or a pinch is a sure sign of a trackpad; remember it
// briefly so plain vertical two-finger scrolls (deltaX 0) still pan, while a
// real mouse wheel (always purely vertical, never trackpad-flagged) keeps zooming.
let lastTrackpad = 0;
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const now = Date.now();
  if (e.deltaX !== 0 || e.ctrlKey) lastTrackpad = now;
  const onTrackpad = now - lastTrackpad < 1500;

  if (!e.ctrlKey && onTrackpad) {
    // Trackpad two-finger scroll → pan
    ox -= e.deltaX;
    oy -= e.deltaY;
  } else {
    // Pinch (ctrl+wheel) → smooth zoom; mouse wheel → stepped zoom — both at cursor
    const f  = e.ctrlKey
      ? Math.min(2, Math.max(0.5, Math.exp(-e.deltaY * 0.01)))
      : (e.deltaY < 0 ? 1.1 : 1 / 1.1);
    const r  = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    ox = mx - (mx - ox) * f; oy = my - (my - oy) * f;
    sc = Math.min(Math.max(sc * f, .04), 12);
  }
  applyT();
}, { passive: false });

function zc(f) {
  const mx = cv.clientWidth / 2, my = cv.clientHeight / 2;
  ox = mx - (mx - ox) * f; oy = my - (my - oy) * f;
  sc = Math.min(Math.max(sc * f, .04), 12); applyT();
}
document.getElementById('btn-in' ).addEventListener('click', () => zc(1.25));
document.getElementById('btn-out').addEventListener('click', () => zc(1 / 1.25));
document.getElementById('btn-fit').addEventListener('click', fitAll);

// ╔══════════════════════════════════════════════════════════════════╗
//  BUILD CARD
// ╚══════════════════════════════════════════════════════════════════╝
function buildCard(sk) {
  const el = document.createElement('div');
  el.className     = 'sk';
  el.style.left    = sk.x + 'px';
  el.style.top     = sk.y + 'px';
  el.style.width   = sk.w + 'px';
  el.style.height  = sk.h + 'px';
  el.style.zIndex  = sk.z || 0;
  el.dataset.id    = sk.id;

  const img = document.createElement('img');
  img.src = '/images/' + sk.file;
  img.alt = sk.title || '';
  img.loading  = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  el.appendChild(img);

  if (sk.title) {
    const cap = document.createElement('div');
    cap.className = 'sk-cap';
    cap.textContent = sk.title;
    el.appendChild(cap);
  }

  // Apply locked state to the element (used by lock toggle + initial render)
  function applyLockedState() {
    el.classList.toggle('locked', !!sk.locked);
    lock.textContent = sk.locked ? '🔒' : '🔓';
    lock.title       = sk.locked ? 'Unlock (allow moving)' : 'Lock in place';
  }

  // ── Lock toggle
  const lock = document.createElement('button');
  lock.className = 'sk-lock';
  lock.addEventListener('mousedown', e => e.stopPropagation());
  lock.addEventListener('click', async e => {
    e.stopPropagation();
    sk.locked = !sk.locked;
    applyLockedState();
    try { await api(`/api/sketches/${sk.id}`, { method: 'PATCH', body: { locked: sk.locked } }); }
    catch { /* gate already shown */ }
  });
  el.appendChild(lock);
  applyLockedState(); // reflect current state on initial mount

  // ── Bring to front
  const front = document.createElement('button');
  front.className = 'sk-front';
  front.title     = 'Bring to front';
  front.textContent = '↑';
  front.addEventListener('mousedown', e => e.stopPropagation());
  front.addEventListener('click', async e => {
    e.stopPropagation();
    const maxZ = Math.max(0, ...sketches.map(s => s.z || 0));
    sk.z = maxZ + 1;
    el.style.zIndex = sk.z;
    try { await api(`/api/sketches/${sk.id}`, { method: 'PATCH', body: { z: sk.z } }); }
    catch { /* gate already shown */ }
  });
  el.appendChild(front);

  // ── Send to back
  const back = document.createElement('button');
  back.className = 'sk-back';
  back.title     = 'Send to back';
  back.textContent = '↓';
  back.addEventListener('mousedown', e => e.stopPropagation());
  back.addEventListener('click', async e => {
    e.stopPropagation();
    const minZ = Math.min(0, ...sketches.map(s => s.z || 0));
    sk.z = minZ - 1;
    el.style.zIndex = sk.z;
    try { await api(`/api/sketches/${sk.id}`, { method: 'PATCH', body: { z: sk.z } }); }
    catch {}
  });
  el.appendChild(back);

  // ── Delete
  const del = document.createElement('button');
  del.className   = 'sk-del';
  del.title       = 'Delete sketch';
  del.textContent = '×';
  del.addEventListener('mousedown', e => e.stopPropagation());
  del.addEventListener('click', async e => {
    e.stopPropagation();
    if (sk.locked) { showToast('Unlock it first to delete', false); return; }
    if (!confirm('Delete this sketch? This removes the image file too.')) return;
    try {
      await api(`/api/sketches/${sk.id}`, { method: 'DELETE' });
      sketches = sketches.filter(s => s.id !== sk.id);
      const mountedEl = mounted.get(sk.id);
      if (mountedEl) { mountedEl.remove(); mounted.delete(sk.id); }
      empty.style.display = sketches.length ? 'none' : 'flex';
      showToast('Deleted', true);
      updateStats();
    } catch {
      showToast('Could not delete', false);
    }
  });
  el.appendChild(del);

  // ── Drag the card (skipped when locked)
  let cd = false, cx0, cy0, sx0, sy0, moved = false;
  el.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    if (sk.locked) return;        // ← respect the lock; pan handler takes over instead
    e.stopPropagation();
    cd = true; moved = false;
    draggingId = sk.id; // keep this card mounted while dragging
    cx0 = e.clientX; cy0 = e.clientY;
    sx0 = sk.x; sy0 = sk.y;
    el.classList.add('dragging');
  });
  document.addEventListener('mousemove', e => {
    if (!cd) return;
    const dx = (e.clientX - cx0) / sc;
    const dy = (e.clientY - cy0) / sc;
    if (Math.hypot(e.clientX - cx0, e.clientY - cy0) > 3) moved = true;
    sk.x = Math.round(sx0 + dx);
    sk.y = Math.round(sy0 + dy);
    el.style.left = sk.x + 'px';
    el.style.top  = sk.y + 'px';
  });
  document.addEventListener('mouseup', async () => {
    if (!cd) return;
    cd = false;
    draggingId = null;
    el.classList.remove('dragging');
    if (moved) {
      try { await api(`/api/sketches/${sk.id}`, { method: 'PATCH', body: { x: sk.x, y: sk.y } }); }
      catch { showToast('Could not save position', false); }
      cull(); // dragged card may have moved out of view
    }
  });

  return el;
}

function renderCanvas() {
  mounted.forEach(el => el.remove());
  mounted.clear();
  empty.style.display = sketches.length ? 'none' : 'flex';
  cull();
}

// ── Virtualization: mount sketches inside (or near) viewport, unmount the rest
function cull() {
  if (!sketches.length) return;

  const overscan = 400;
  const vx0 = (-ox) / sc - overscan;
  const vy0 = (-oy) / sc - overscan;
  const vx1 = (cv.clientWidth  - ox) / sc + overscan;
  const vy1 = (cv.clientHeight - oy) / sc + overscan;

  sketches.forEach(sk => {
    const inView = sk.x + sk.w >= vx0 && sk.x <= vx1 &&
                   sk.y + sk.h >= vy0 && sk.y <= vy1;
    const isMounted = mounted.has(sk.id);

    if (inView && !isMounted) {
      const el = buildCard(sk);
      mounted.set(sk.id, el);
      world.appendChild(el);
    } else if (!inView && isMounted && sk.id !== draggingId) {
      // never unmount the card being dragged
      mounted.get(sk.id).remove();
      mounted.delete(sk.id);
    }
  });
}

// ╔══════════════════════════════════════════════════════════════════╗
//  UPLOAD DRAWER
// ╚══════════════════════════════════════════════════════════════════╝
const overlay = document.getElementById('overlay');
const drawer  = document.getElementById('drawer');
const dz      = document.getElementById('dz');
const fin     = document.getElementById('fin');
const pform   = document.getElementById('pform');
const pthumb  = document.getElementById('pthumb');
const tin     = document.getElementById('tin');
const dimLbl  = document.getElementById('dim-lbl');
const btnAdd  = document.getElementById('btn-add');

let pendingFile = null;
let pendingW    = 0;
let pendingH    = 0;

// ── Image compression (client-side, before upload) ──────────────────
// Re-encode uploads to WebP and cap the long side so sketches are stored
// small. Runs for EVERY upload path (file picker, drag-drop, clipboard
// paste) because they all funnel through preview(). Always falls back to
// the original file if anything fails, so an upload can never be blocked.
const MAX_SIDE     = 2400;   // px — long-side cap for new uploads
const WEBP_QUALITY = 0.85;

// Read an image file's natural (browser-oriented) pixel size.
function naturalSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { const w = img.naturalWidth, h = img.naturalHeight; URL.revokeObjectURL(url); resolve({ w, h }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
}

// Compress to WebP. Always resolves to { file, w, h, resized, ow, oh } —
// never throws. GIF/SVG and tiny files pass through untouched.
async function compressImage(file) {
  const skip = file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size < 50 * 1024;

  let bitmap;
  try {
    // imageOrientation:'from-image' bakes in EXIF rotation (upright phone photos).
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try { const d = await naturalSize(file); return { file, w: d.w, h: d.h, resized: false, ow: d.w, oh: d.h }; }
    catch { return { file, w: 0, h: 0, resized: false, ow: 0, oh: 0 }; }
  }

  const bw = bitmap.width, bh = bitmap.height;
  const orig = { file, w: bw, h: bh, resized: false, ow: bw, oh: bh };

  if (skip) { bitmap.close(); return orig; }

  const scale = Math.min(MAX_SIDE / bw, MAX_SIDE / bh, 1);
  const w = Math.max(1, Math.round(bw * scale));
  const h = Math.max(1, Math.round(bh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); return orig; }
  ctx.drawImage(bitmap, 0, 0, w, h);   // no bg fill → PNG transparency carries to WebP alpha
  bitmap.close();

  const blob = await new Promise(res => { try { canvas.toBlob(res, 'image/webp', WEBP_QUALITY); } catch { res(null); } });
  if (!blob || blob.size === 0) return orig;

  const base = (file.name || 'sketch').replace(/\.[^.]+$/, '') || 'sketch';
  const webpFile = new File([blob], base + '.webp', { type: 'image/webp' });
  return { file: webpFile, w, h, resized: (w !== bw || h !== bh), ow: bw, oh: bh };
}

function openDrawer()  { overlay.classList.add('open');  drawer.classList.add('open');  }
function closeDrawer() { overlay.classList.remove('open'); drawer.classList.remove('open'); resetPreview(); }

document.getElementById('btn-open').addEventListener('click', openDrawer);
overlay.addEventListener('click', closeDrawer);

dz.addEventListener('click',    () => fin.click());
fin.addEventListener('change',  () => { const f = fin.files[0]; if (f) preview(f); fin.value = ''; });
dz.addEventListener('dragover', e  => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave',() => dz.classList.remove('over'));
dz.addEventListener('drop', e  => {
  e.preventDefault(); dz.classList.remove('over');
  const f = e.dataTransfer.files[0]; if (f) preview(f);
});

async function preview(file) {
  if (!file.type.startsWith('image/')) { showToast('Please pick an image file.', false); return; }

  // Thumbnail preview from the original file.
  const reader = new FileReader();
  reader.onload = e => { pthumb.src = e.target.result; };
  reader.readAsDataURL(file);

  // Use original filename when possible, fall back to a timestamp for clipboard pastes
  tin.value = file.name && file.name !== 'image.png'
    ? file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    : '';
  dz.classList.add('gone');
  pform.classList.add('on');
  // Open the drawer if a paste arrived while it was closed
  if (!drawer.classList.contains('open')) openDrawer();
  tin.focus();

  // Compress to WebP before upload. Disable the upload button until it
  // settles so a fast click can't send mismatched dimensions. Falls back
  // to the original file on any failure.
  pendingFile = file; pendingW = 0; pendingH = 0;
  btnAdd.disabled = true;
  dimLbl.textContent = 'compressing…';
  const r = await compressImage(file);
  pendingFile = r.file;
  pendingW    = r.w;
  pendingH    = r.h;
  dimLbl.textContent = r.resized
    ? `${r.w} × ${r.h} px (resized from ${r.ow} × ${r.oh})`
    : `${r.w} × ${r.h} px`;
  btnAdd.disabled = false;
}

// ── Clipboard paste — works anywhere on the admin page ──
// Listens for paste events globally; if the clipboard contains an image,
// it's fed through the same preview flow as drag-drop or file-picker.
document.addEventListener('paste', e => {
  // Don't intercept paste when the user is editing a text field
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;

  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        preview(file);
        return;
      }
    }
  }
});

function resetPreview() {
  pform.classList.remove('on');
  dz.classList.remove('gone');
  pthumb.src = '';
  pendingFile = null; pendingW = 0; pendingH = 0;
  tin.value = '';
  dimLbl.textContent = '—';
}
document.getElementById('btn-new').addEventListener('click', resetPreview);

// ── UPLOAD ──
btnAdd.addEventListener('click', async () => {
  if (!pendingFile) return;
  btnAdd.disabled = true;
  btnAdd.textContent = 'Uploading…';

  // Drop new sketch centred on current viewport
  const wcx = (cv.clientWidth  / 2 - ox) / sc;
  const wcy = (cv.clientHeight / 2 - oy) / sc;
  const x   = Math.round(wcx - pendingW / 2);
  const y   = Math.round(wcy - pendingH / 2);

  const fd = new FormData();
  fd.append('image', pendingFile);
  fd.append('title', tin.value.trim());
  fd.append('x', x); fd.append('y', y);
  fd.append('w', pendingW); fd.append('h', pendingH);

  try {
    const res = await api('/api/upload', { method: 'POST', body: fd });
    sketches.push(res.sketch);
    cull(); // new sketch is centred on viewport so it'll mount immediately
    empty.style.display = 'none';
    showToast('Uploaded! 🎉', true);
    resetPreview();
    closeDrawer();
    updateStats();
  } catch {
    showToast('Upload failed', false);
  } finally {
    btnAdd.disabled = false;
    btnAdd.textContent = 'Upload to canvas ↗';
  }
});

// ╔══════════════════════════════════════════════════════════════════╗
//  TOAST
// ╚══════════════════════════════════════════════════════════════════╝
let tt;
function showToast(msg, ok = true) {
  clearTimeout(tt);
  toast.textContent = msg;
  toast.className   = 'show ' + (ok ? 'ok' : 'err');
  tt = setTimeout(() => { toast.className = ''; }, 3000);
}

// ╔══════════════════════════════════════════════════════════════════╗
//  INIT
// ╚══════════════════════════════════════════════════════════════════╝

// Fetch sketch count and total disk size, render into the header pill.
const statsEl = document.getElementById('stats');
function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
  return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
async function updateStats() {
  try {
    const s = await api('/api/stats');
    if (!s) return;
    statsEl.textContent = `${s.count} sketches · ${formatBytes(s.bytes)}`;
  } catch (_) { /* auth gate already triggered if needed */ }
}

async function loadAndRender() {
  try {
    const d  = await fetch('/api/data', { cache: 'no-store' }).then(r => r.json());
    sketches = d.sketches || [];
    renderCanvas();
    fitAll();
    updateStats();
  } catch (e) {
    console.error('Could not load:', e);
  }
}

(async () => {
  if (await checkToken()) {
    hideGate();
    loadAndRender();
  } else {
    showGate();
  }
})();
