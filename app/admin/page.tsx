import Script from "next/script";

export const metadata = {
  title: "Admin",
  description: "Manage the canvas.",
  // The admin UI is private (client-side password gate); keep it out of search
  // indexes entirely. Also Disallowed in robots.ts.
  robots: { index: false, follow: false },
};

const CSS = `    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg:    #faf1e0;
      --dot:   rgba(100, 88, 68, .18);
      --ui:    rgba(18, 14, 8, .92);
      --red:   #b03020;
      --green: #2e7d52;
    }

    html, body { width: 100%; height: 100%; overflow: hidden; background: var(--bg); }

    /* ─── LOGIN GATE ─── */
    #gate {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: #19150f;
      z-index: 1000;
    }
    #gate.hide { display: none; }
    #gate-box {
      width: 360px; max-width: 90vw;
      padding: 32px 28px;
      background: #221c14;
      border-radius: 14px;
      box-shadow: 0 18px 60px rgba(0,0,0,.45);
    }
    #gate-box h1 {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 1.7rem; color: #fff; margin-bottom: 4px;
    }
    #gate-box p {
      font-family: 'Caveat', cursive;
      font-size: 1rem; color: rgba(255,255,255,.4);
      margin-bottom: 22px;
    }
    #gate input {
      width: 100%; padding: 12px 16px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px; color: #fff;
      font-family: 'Caveat', cursive; font-size: 1.1rem;
      outline: none; transition: border-color .15s;
      margin-bottom: 12px;
    }
    #gate input:focus { border-color: rgba(255,255,255,.4); }
    #gate input.shake { animation: shake .4s; border-color: rgba(180,40,30,.8); }
    @keyframes shake {
      0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)}
      40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
    }
    #gate button {
      width: 100%; padding: 12px;
      background: rgba(255,255,255,.13); border: none;
      border-radius: 10px; color: #fff;
      font-family: 'Caveat', cursive; font-size: 1.1rem; font-weight: 600;
      cursor: pointer; transition: background .14s;
    }
    #gate button:hover { background: rgba(255,255,255,.22); }

    /* ─── HEADER ─── */
    header {
      position: fixed; top: 0; left: 0; right: 0; height: 56px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 0 22px;
      background: var(--ui); backdrop-filter: blur(20px);
      color: #fff; z-index: 350;
    }
    header .h-logo {
      display: flex; align-items: baseline; gap: 8px;
      min-width: 0;        /* allow flex children to ellipsis */
      flex: 1 1 auto;
    }
    header .h-logo strong {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 1.1rem; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    header .h-logo span {
      font-family: 'Caveat', cursive; color: rgba(255,255,255,.45);
      font-size: .95rem; flex-shrink: 0;
    }
    .h-stats {
      font-family: ui-monospace, monospace; font-size: .8rem;
      color: rgba(255,255,255,.65);
      padding: 5px 10px; border-radius: 6px;
      background: rgba(255,255,255,.06);
      white-space: nowrap; flex-shrink: 0;
    }
    .h-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .h-btn {
      height: 34px; padding: 0 16px; border: none; border-radius: 100px;
      background: rgba(255,255,255,.12); color: #fff;
      font-family: 'Caveat', cursive; font-size: .98rem; font-weight: 600;
      cursor: pointer; transition: background .14s;
      display: inline-flex; align-items: center; gap: 5px;
      text-decoration: none;
    }
    .h-btn:hover { background: rgba(255,255,255,.22); }
    .h-btn.primary { background: #fff; color: #19150f; }
    .h-btn.primary:hover { background: #ede7d3; }
    @media (max-width: 900px) {
      .h-stats { display: none; }
      header .h-logo strong { font-size: 1rem; }
    }
    @media (max-width: 600px) {
      header .h-logo span { display: none; }
    }

    /* ─── CANVAS ─── */
    #cv {
      position: fixed; top: 56px; left: 0; right: 0; bottom: 0;
      overflow: hidden; background: var(--bg);
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 24 24'%3E%3Cpath fill='%2312100a' d='M9 3a1 1 0 0 0-1 1v7H6.5A1.5 1.5 0 0 0 5 12.5v.5a7 7 0 0 0 7 7h1a7 7 0 0 0 7-7v-3a1.5 1.5 0 0 0-3 0v-1a1.5 1.5 0 0 0-3 0v-.5A1.5 1.5 0 0 0 12.5 7H12V4a1 1 0 0 0-1-1H9Z'/%3E%3C/svg%3E") 5 2, grab;
    }
    #cv.pan { cursor: grabbing; }

    #world {
      position: absolute; top: 0; left: 0; width: 0; height: 0;
      transform-origin: 0 0;
    }

    /* ─── SKETCH CARDS (admin) ─── */
    .sk {
      position: absolute;
      user-select: none;
      cursor: grab;
      outline: 2px solid transparent;
      transition: outline-color .15s;
    }
    .sk:hover { outline-color: rgba(18,14,8,.5); }
    .sk.dragging {
      cursor: grabbing;
      outline-color: #19150f;
      z-index: 9999;
    }
    .sk img {
      display: block; width: 100%; height: 100%;
      pointer-events: none;
    }
    .sk-cap {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 8px 10px;
      background: linear-gradient(transparent, rgba(0,0,0,.6));
      color: #fff; font-family: 'Caveat', cursive; font-size: 15px;
      opacity: 0; transition: opacity .15s; pointer-events: none;
    }
    .sk:hover .sk-cap { opacity: 1; }
    .sk-del {
      position: absolute; top: 6px; right: 6px;
      width: 28px; height: 28px;
      background: var(--red); color: #fff;
      border: none; border-radius: 50%;
      font-size: 16px; cursor: pointer; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .15s;
      z-index: 5;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .sk:hover .sk-del { opacity: 1; }
    .sk-front, .sk-back {
      position: absolute; top: 6px;
      width: 28px; height: 28px;
      background: rgba(18,14,8,.85); color: #fff;
      border: none; border-radius: 50%;
      font-size: 13px; cursor: pointer; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .15s;
      z-index: 5;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .sk-front { right: 40px; }
    .sk-back  { right: 74px; }
    .sk:hover .sk-front, .sk:hover .sk-back { opacity: 1; }

    /* Lock toggle sits centred on the card so it can't be hidden by overlapping sketches */
    .sk-lock {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 44px; height: 44px;
      background: rgba(18,14,8,.85); color: #fff;
      border: none; border-radius: 50%;
      font-size: 18px; cursor: pointer; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .15s, background .15s;
      z-index: 6;
      box-shadow: 0 4px 14px rgba(0,0,0,.35);
    }
    .sk:hover .sk-lock { opacity: 1; }
    .sk-lock:hover { background: rgba(18,14,8,1); }

    /* Locked state: dimmed outline, no grab cursor, lock stays subtly visible */
    .sk.locked { cursor: default; }
    .sk.locked:hover { outline-color: rgba(18,14,8,.18); }
    .sk.locked .sk-lock { opacity: .55; }
    .sk.locked:hover .sk-lock { opacity: 1; }
    /* Hide delete/front/back on locked cards to prevent accidents */
    .sk.locked .sk-del,
    .sk.locked .sk-front,
    .sk.locked .sk-back { display: none; }

    /* ─── EMPTY ─── */
    #empty {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px; pointer-events: none;
    }
    #empty .ico { font-size: 4rem; opacity: .12; }
    #empty h2 {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 2rem; color: #12100a; opacity: .18;
    }
    #empty p {
      font-family: 'Caveat', cursive; font-size: 1.1rem; color: #12100a; opacity: .18;
    }

    /* ─── ZOOM CONTROL ─── */
    #tb {
      position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 2px; padding: 0 10px; height: 42px;
      background: var(--ui); backdrop-filter: blur(20px);
      border-radius: 100px; z-index: 300;
      box-shadow: 0 4px 24px rgba(0,0,0,.3);
    }
    .tbb {
      width: 34px; height: 34px; border: none; background: transparent;
      color: rgba(255,255,255,.6); border-radius: 50%; font-size: 1.05rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .12s, color .12s;
    }
    .tbb:hover { background: rgba(255,255,255,.12); color: #fff; }

    /* ─── UPLOAD DRAWER ─── */
    #overlay {
      position: fixed; inset: 0; background: rgba(10,8,4,.55);
      z-index: 500; opacity: 0; pointer-events: none; transition: opacity .3s;
    }
    #overlay.open { opacity: 1; pointer-events: all; }

    #drawer {
      position: fixed; bottom: 0; left: 50%;
      transform: translateX(-50%) translateY(110%);
      width: min(640px, 100vw);
      background: #19150f; color: rgba(255,255,255,.85);
      border-radius: 22px 22px 0 0;
      box-shadow: 0 -10px 60px rgba(0,0,0,.45);
      z-index: 501;
      transition: transform .38s cubic-bezier(.22,.61,.36,1);
      max-height: 90vh; overflow-y: auto;
      padding: 24px 28px 40px;
    }
    #drawer.open { transform: translateX(-50%) translateY(0); }

    .handle {
      width: 40px; height: 4px; background: rgba(255,255,255,.18);
      border-radius: 2px; margin: 0 auto 22px;
    }
    .drawer-title {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 1.8rem; margin-bottom: 4px;
    }
    .drawer-sub {
      font-family: 'Caveat', cursive; font-size: 1rem;
      opacity: .38; margin-bottom: 20px;
    }

    #dz {
      border: 2px dashed rgba(255,255,255,.18); border-radius: 12px;
      padding: 42px 20px; text-align: center; cursor: pointer;
      transition: border-color .2s, background .2s; margin-bottom: 18px;
    }
    #dz.over { border-color: rgba(255,255,255,.5); background: rgba(255,255,255,.04); }
    #dz.gone { display: none; }
    #dz .dzico { font-size: 2.4rem; margin-bottom: 8px; }
    #dz h3 {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 1.3rem; margin-bottom: 5px;
    }
    #dz small { font-family: 'Caveat', cursive; font-size: .92rem; opacity: .35; }
    #dz kbd {
      font-family: ui-monospace, monospace; font-size: .78rem;
      padding: 1px 6px; border-radius: 4px;
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
      color: rgba(255,255,255,.55);
    }
    #fin { display: none; }

    #pform { display: none; gap: 18px; margin-bottom: 18px; align-items: flex-start; }
    #pform.on { display: flex; }
    #pthumb {
      width: 130px; height: 130px; object-fit: contain;
      background: rgba(255,255,255,.05); border-radius: 6px; flex-shrink: 0;
    }
    .fc { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .fc label {
      font-family: 'Caveat', cursive; font-size: .88rem; opacity: .4;
      display: block; margin-bottom: 2px;
    }
    .fc input[type="text"] {
      width: 100%; padding: 10px 13px;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px; color: #fff;
      font-family: 'Caveat', cursive; font-size: 1.05rem;
      outline: none; transition: border-color .15s;
    }
    .fc input[type="text"]:focus { border-color: rgba(255,255,255,.4); }
    .dim {
      font-family: 'Caveat', cursive; font-size: .88rem;
      color: rgba(255,255,255,.4);
    }
    .brow { display: flex; gap: 10px; }
    .badd {
      flex: 1; padding: 10px 20px; border: none; border-radius: 100px;
      background: #fff; color: #19150f;
      font-family: 'Caveat', cursive; font-size: 1.05rem; font-weight: 700;
      cursor: pointer; transition: background .14s;
    }
    .badd:hover { background: #ede7d3; }
    .badd:disabled { opacity: .5; cursor: wait; }
    .bsec {
      padding: 10px 16px; border: 1px solid rgba(255,255,255,.14);
      border-radius: 100px; background: transparent; color: rgba(255,255,255,.6);
      font-family: 'Caveat', cursive; font-size: .95rem;
      cursor: pointer; transition: border-color .14s;
    }
    .bsec:hover { border-color: rgba(255,255,255,.3); }

    /* ─── TOAST ─── */
    #toast {
      position: fixed; bottom: 68px; left: 50%;
      transform: translateX(-50%) translateY(14px);
      background: #12100a; color: #fff;
      font-family: 'Caveat', cursive; font-size: 1rem;
      padding: 9px 22px; border-radius: 100px;
      opacity: 0; pointer-events: none;
      transition: opacity .25s, transform .25s; z-index: 600;
    }
    #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    #toast.ok   { background: var(--green); }
    #toast.err  { background: var(--red); }
  `;

const BODY = `<!-- ─── LOGIN GATE ─── -->
<div id="gate">
  <div id="gate-box">
    <h1>Admin</h1>
    <p>Enter your password to manage the canvas.</p>
    <input id="pin" type="password" placeholder="Password…" autocomplete="current-password">
    <button id="btn-auth">Enter</button>
  </div>
</div>

<header>
  <div class="h-logo">
    <strong>The Endless Sketchbookery of Jens Claessens</strong>
    <span>/ admin</span>
  </div>
  <div class="h-stats" id="stats">—</div>
  <div class="h-actions">
    <a class="h-btn" href="/" target="_blank">View site ↗</a>
    <button class="h-btn primary" id="btn-open">+ Upload</button>
  </div>
</header>

<div id="cv">
  <div id="world"></div>
  <div id="empty">
    <div class="ico">✏️</div>
    <h2>Canvas is empty</h2>
    <p>Upload your first sketch to begin</p>
  </div>
</div>

<div id="tb">
  <button class="tbb" id="btn-out">−</button>
  <button class="tbb" id="btn-in">+</button>
  <button class="tbb" id="btn-fit" style="font-size:.8rem">⌂</button>
</div>

<div id="overlay"></div>
<div id="drawer">
  <div class="handle"></div>
  <div class="drawer-title">Add a sketch</div>
  <p class="drawer-sub">Drops onto the canvas at full size. Move it after.</p>

  <div id="dz">
    <div class="dzico">🖼️</div>
    <h3>Drop, paste, or click to browse</h3>
    <small>JPG PNG GIF WEBP · <kbd>Ctrl/⌘+V</kbd> works too</small>
    <input id="fin" type="file" accept="image/*">
  </div>

  <div id="pform">
    <img id="pthumb" src="" alt="Preview">
    <div class="fc">
      <div>
        <label for="tin">Caption (optional)</label>
        <input id="tin" type="text" placeholder="e.g. Saturday doodle…" maxlength="80">
      </div>
      <div class="dim" id="dim-lbl">—</div>
      <div class="brow">
        <button class="badd" id="btn-add">Upload to canvas ↗</button>
        <button class="bsec" id="btn-new">Choose another</button>
      </div>
    </div>
  </div>
</div>

<div id="toast"></div>`;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BODY }} />
      <Script src="/js/admin.js" strategy="afterInteractive" />
    </>
  );
}
