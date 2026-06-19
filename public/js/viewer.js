// The Endless Sketchbookery — infinite-canvas engine.
// Preserved verbatim from the original static site; only change: image URLs
// are absolute ('/images/...') so they resolve correctly on every route.

const cv    = document.getElementById('cv');
const world = document.getElementById('world');
const empty = document.getElementById('empty');

let ox = 0, oy = 0, sc = 1;
let sketches = [];

// ─────────────────────────────────────────
//  Transform
// ─────────────────────────────────────────
function applyT() {
  world.style.transform = `translate(${ox}px,${oy}px) scale(${sc})`;
  cull();
  syncZoomBtns();
}

function fitAll() {
  if (!sketches.length) { ox = cv.clientWidth / 2; oy = cv.clientHeight / 2; sc = 1; applyT(); return; }
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

// ─────────────────────────────────────────
//  Pan — mouse
// ─────────────────────────────────────────
let pan = false, px0 = 0, py0 = 0;
cv.addEventListener('mousedown', e => {
  pan = true; px0 = e.clientX - ox; py0 = e.clientY - oy;
  cv.classList.add('pan'); e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!pan) return;
  ox = e.clientX - px0; oy = e.clientY - py0; applyT();
});
document.addEventListener('mouseup', () => { pan = false; cv.classList.remove('pan'); });

// ─────────────────────────────────────────
//  Pan + pinch — touch
//  The tricky part is gesture transitions:
//  • finger A down → finger B down → finger A up should NOT make the canvas jump
//  • finger A down → finger A up → finger A down again should NOT use stale anchors
//  Solution: re-anchor pan/pinch state on every touchstart AND touchend,
//  using whichever touches are currently active.
// ─────────────────────────────────────────
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
    // Also anchor pan to the midpoint, so when a finger lifts and we drop
    // back to single-touch, the next touchend's re-anchor is correct.
    const mx = (touches[0].clientX + touches[1].clientX) / 2;
    const my = (touches[0].clientY + touches[1].clientY) / 2;
    t0x = mx - ox;
    t0y = my - oy;
  } else {
    pd = 0;
  }
}

cv.addEventListener('touchstart', e => {
  anchorTouches(e.touches);
}, { passive: true });

cv.addEventListener('touchend', e => {
  // Re-anchor against whatever fingers are still down — prevents the jump
  // when transitioning from 2→1 touches.
  anchorTouches(e.touches);
}, { passive: true });

cv.addEventListener('touchcancel', e => {
  anchorTouches(e.touches);
}, { passive: true });

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
    sc = Math.min(Math.max(sc * f, MIN_ZOOM), MAX_ZOOM);
    pd = d;
    // Keep pan anchor in sync with the midpoint so a finger-lift doesn't jump
    t0x = mx - ox;
    t0y = my - oy;
  }
  applyT();
}, { passive: false });

// ─────────────────────────────────────────
//  Wheel zoom
// ─────────────────────────────────────────
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
    sc = Math.min(Math.max(sc * f, MIN_ZOOM), MAX_ZOOM);
  }
  applyT();
}, { passive: false });

function zc(f) {
  const mx = cv.clientWidth / 2, my = cv.clientHeight / 2;
  ox = mx - (mx - ox) * f; oy = my - (my - oy) * f;
  sc = Math.min(Math.max(sc * f, MIN_ZOOM), MAX_ZOOM); applyT();
}
document.getElementById('btn-in' ).addEventListener('click', () => zc(1.25));
document.getElementById('btn-out').addEventListener('click', () => zc(1 / 1.25));
document.getElementById('btn-refresh').addEventListener('click', () => landRandom());

// Disable the "−" button once we've hit the most zoomed-out level.
const btnOut = document.getElementById('btn-out');
function syncZoomBtns() {
  if (btnOut) btnOut.disabled = sc <= MIN_ZOOM + 1e-4;
}

// ─────────────────────────────────────────
//  Virtualized render — only mount sketches near the viewport.
//  Saves bandwidth: browser never requests off-screen images.
// ─────────────────────────────────────────
const mounted = new Map(); // id → element

function makeEl(sk) {
  const el = document.createElement('div');
  el.className = 'sk';
  el.style.cssText = `left:${sk.x}px; top:${sk.y}px; width:${sk.w}px; height:${sk.h}px; z-index:${sk.z || 0};`;
  const img = document.createElement('img');
  img.src = '/images/' + sk.file;
  img.alt = sk.title || '';
  img.loading  = 'lazy';     // browser-level deferral as a second safety net
  img.decoding = 'async';
  img.draggable = false;
  el.appendChild(img);
  return el;
}

// Test whether a sketch's box intersects the visible viewport (world coords).
// Overscan = render slightly outside the viewport so images are ready before they scroll in.
function visible(sk, vx0, vy0, vx1, vy1) {
  return sk.x + sk.w >= vx0 && sk.x <= vx1 &&
         sk.y + sk.h >= vy0 && sk.y <= vy1;
}

function cull() {
  if (!sketches.length) return;

  // Convert viewport rect (screen px) to world coords, add an overscan buffer.
  const overscan = 400; // px of world space beyond each edge
  const vx0 = (-ox) / sc - overscan;
  const vy0 = (-oy) / sc - overscan;
  const vx1 = (cv.clientWidth  - ox) / sc + overscan;
  const vy1 = (cv.clientHeight - oy) / sc + overscan;

  // Mount any visible sketches that aren't in the DOM yet
  sketches.forEach(sk => {
    const inView   = visible(sk, vx0, vy0, vx1, vy1);
    const isMounted = mounted.has(sk.id);
    if (inView && !isMounted) {
      const el = makeEl(sk);
      mounted.set(sk.id, el);
      world.appendChild(el);
    } else if (!inView && isMounted) {
      // Remove the element entirely so the browser drops the image from memory
      mounted.get(sk.id).remove();
      mounted.delete(sk.id);
    }
  });
}

// Full reset — called when the sketches list itself changes
function render() {
  mounted.forEach(el => el.remove());
  mounted.clear();
  empty.style.display = sketches.length ? 'none' : 'flex';
  cull();
}

// ─────────────────────────────────────────
//  Pick a random sketch and centre the viewport on it at a comfortable zoom.
//  Used as the landing view so we don't have to fetch every image up-front.
// ─────────────────────────────────────────
const LANDING_ZOOM = 0.4; // matches one "−" press from the previous 0.5 landing
// Minimum zoom: 3 "−" ticks below the landing zoom (0.4 × 0.8³ ≈ 0.205) — one
// step further out than the original limit, but still not the whole collection.
const MIN_ZOOM = LANDING_ZOOM * (1 / 1.25) * (1 / 1.25) * (1 / 1.25);
const MAX_ZOOM = 12;
function landRandom() {
  if (!sketches.length) {
    ox = cv.clientWidth / 2; oy = cv.clientHeight / 2; sc = 1;
    applyT();
    return;
  }
  const sk = sketches[Math.floor(Math.random() * sketches.length)];
  sc = LANDING_ZOOM;
  ox = cv.clientWidth  / 2 - (sk.x + sk.w / 2) * sc;
  oy = cv.clientHeight / 2 - (sk.y + sk.h / 2) * sc;
  applyT();
}

// ─────────────────────────────────────────
//  Load from server
// ─────────────────────────────────────────
let firstLoad = true;
async function loadData() {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const d   = await res.json();
    sketches  = d.sketches || [];
    render();
    if (firstLoad) {
      landRandom();   // pick a random sketch, centre on it at 1:1
      firstLoad = false;
    }
  } catch (e) {
    console.error('Could not load sketches:', e);
  }
}

loadData();

// Poll for updates every 30 s so the public canvas stays fresh
setInterval(loadData, 30000);
