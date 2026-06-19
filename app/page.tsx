import Script from "next/script";

export const metadata = {
  title: "The Endless Sketchbookery of Jens Claessens",
  description: "An infinite canvas of sketches.",
};

const CSS = `    @font-face {
      font-family: 'Cormorant';
      font-style: italic;
      font-weight: 500;
      font-display: swap;
      src: url('/fonts/cormorant-italic.woff2') format('woff2');
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg:  #faf1e0;
      --dot: rgba(100, 88, 68, .18);
      --ui:  rgba(18, 14, 8, .9);
    }

    html, body { width: 100%; height: 100%; overflow: hidden; background: var(--bg); }

    /* ─── HEADER FADE OVERLAY ─── */
    /* A soft band of the page background fading downward, so the title and
       top-right links stay readable when sketches scroll behind them. */
    #header-fade {
      position: fixed; top: 0; left: 0; right: 0;
      height: 110px;
      background: linear-gradient(to bottom,
        rgba(250, 241, 224, 1) 0%,
        rgba(250, 241, 224, 1) 55%,
        rgba(250, 241, 224, 0) 75%);
      pointer-events: none;
      z-index: 90;   /* under #logo (100) and #header-links (100), above the canvas */
    }
    @media (max-width: 800px) {
      #header-fade { top: 0; height: 70px; }
    }

    /* ─── CANVAS ─── */
    #cv {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden; background: var(--bg);
      cursor: grab;
    }
    #cv.pan { cursor: grabbing; }

    #world {
      position: absolute; top: 0; left: 0; width: 0; height: 0;
      transform-origin: 0 0;
      will-change: transform;
    }

    /* ─── SKETCHES (public — no hover, no controls) ─── */
    .sk {
      position: absolute;
      user-select: none;
      pointer-events: none; /* viewer can't interact with images */
    }
    .sk img {
      display: block;
      width: 100%; height: 100%;
      pointer-events: none;
    }

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
      font-family: 'Caveat', cursive;
      font-size: 1.1rem; color: #12100a; opacity: .18;
    }

    /* ─── LOGO ─── */
    #logo {
      position: fixed; top: 16px; left: 16px; height: 48px; line-height: 48px;
      font-family: 'Cormorant', serif; font-style: italic; font-weight: 500;
      font-size: 2.2rem; color: #000; opacity: 1;
      pointer-events: none; z-index: 100;
      white-space: nowrap;
      max-width: calc(100vw - 32px);
      overflow: hidden; text-overflow: ellipsis;
    }
    @media (max-width: 800px) {
      #logo { top: 8px; font-size: 1.4rem; height: auto; line-height: 1.45; }
    }

    /* ─── HEADER LINKS (top-right) ─── */
    #header-links {
      position: fixed; top: 16px; right: 18px; height: 48px;
      display: flex; align-items: center; gap: 16px;
      font-family: 'Cormorant', serif; font-style: italic; font-weight: 500;
      font-size: 1.55rem;
      z-index: 100;
    }
    #header-links a {
      color: #000; text-decoration: none;
      display: inline-flex; align-items: center;
      transition: opacity .15s;
    }
    #header-links a:hover { opacity: .55; }
    #header-links svg {
      width: 23px; height: 23px;
      display: block;
    }
    /* Hamburger hidden on desktop; the mobile @media below reveals it (must come
       BEFORE the @media so the media rule's display:flex wins on mobile). */
    #menu-btn { display: none; }
    @media (max-width: 800px) {
      /* Links collapse into the #menu-btn hamburger; shown only when opened */
      #header-links { display: none; }
      #header-links.open {
        display: flex; flex-direction: column; align-items: center;
        top: auto; right: auto; left: 50%; bottom: 64px;
        transform: translateX(-50%); height: auto;
        gap: 16px; padding: 16px 24px; font-size: 1.15rem;
        background: var(--ui); backdrop-filter: blur(20px);
        border-radius: 16px; box-shadow: 0 6px 28px rgba(0,0,0,.4);
      }
      #header-links.open a { color: #fff; }
      #header-links svg { width: 22px; height: 22px; }
      #menu-btn {
        display: flex; align-items: center; justify-content: center;
        position: fixed; bottom: 12px; left: 50%; transform: translateX(72px);
        width: 42px; height: 42px; border: none; border-radius: 50%;
        background: var(--ui); backdrop-filter: blur(20px);
        color: rgba(255,255,255,.85); font-size: 1.3rem; line-height: 1;
        cursor: pointer; z-index: 400; box-shadow: 0 4px 24px rgba(0,0,0,.3);
      }
    }
    @media (max-width: 500px) {
      #header-links { font-size: .9rem; gap: 12px; }
      #header-links svg { width: 20px; height: 20px; }
    }

    /* ─── ZOOM CONTROL ─── */
    #tb {
      position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 2px; padding: 0 10px; height: 42px;
      background: var(--ui); backdrop-filter: blur(20px);
      border-radius: 100px; z-index: 400;
      box-shadow: 0 4px 24px rgba(0,0,0,.3);
    }
    .tbb {
      width: 34px; height: 34px; border: none; background: transparent;
      color: rgba(255,255,255,.6); border-radius: 50%; font-size: 1.05rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .12s, color .12s;
    }
    .tbb:hover { background: rgba(255,255,255,.12); color: #fff; }
    .tbb:disabled { opacity: .3; cursor: default; }
    .tbb:disabled:hover { background: transparent; color: rgba(255,255,255,.6); }

  `;

const BODY = `<div id="header-fade"></div>

<span id="logo">The Endless Sketchbookery of Jens Claessens</span>

<nav id="header-links">
  <a href="https://jensclaessens.gumroad.com/" target="_blank" rel="noopener">Shop</a>
  <a href="https://ko-fi.com/jensclaessens/shop" target="_blank" rel="noopener">Mentorships</a>
  <a href="mailto:jens.claessens@gmail.com">Contact</a>
  <a href="https://www.instagram.com/jensclaessens/" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/>
    </svg>
  </a>
  <a href="https://x.com/JensClaessens" target="_blank" rel="noopener" aria-label="X (Twitter)" title="X">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </a>
  <a href="https://www.tiktok.com/@jensclaessens" target="_blank" rel="noopener" aria-label="TikTok" title="TikTok">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.12z"/>
    </svg>
  </a>
</nav>

<div id="cv">
  <div id="world"></div>
  <div id="empty">
    <div class="ico">✏️</div>
    <h2>Canvas is empty</h2>
    <p>Check back soon</p>
  </div>
</div>

<div id="tb">
  <button class="tbb" id="btn-out">−</button>
  <button class="tbb" id="btn-in">+</button>
  <button class="tbb" id="btn-refresh" title="Jump to a random sketch" style="font-size:1rem">↻</button>
</div>

<button id="menu-btn" aria-label="Open menu" title="Menu">☰</button>`;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BODY }} />
      <Script src="/js/viewer.js" strategy="afterInteractive" />
    </>
  );
}
