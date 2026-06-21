import Script from "next/script";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for The Endless Sketchbookery of Jens Claessens.",
  alternates: { canonical: "/privacy" },
};

const CSS = `    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --bg: #faf1e0; --ink: #12100a; --muted: #6a5e48; --rule: rgba(18,14,8,.12); }
    html, body {
      background: var(--bg); color: var(--ink);
      font-family: 'Inter', system-ui, sans-serif;
      line-height: 1.65;
    }
    body { min-height: 100vh; }

    header {
      max-width: 760px; margin: 0 auto;
      padding: 30px 24px 18px;
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--rule);
    }
    header .logo {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 1.5rem; color: var(--ink); text-decoration: none;
      letter-spacing: -.01em; line-height: 1.1;
    }
    @media (max-width: 600px) {
      header .logo { font-size: 1.2rem; }
    }
    header nav a {
      color: var(--muted); text-decoration: none;
      font-size: .95rem; margin-left: 18px; transition: color .15s;
    }
    header nav a:hover { color: var(--ink); }

    main {
      max-width: 760px; margin: 0 auto;
      padding: 48px 24px 80px;
    }
    h1 {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 300;
      font-size: 2.6rem; margin-bottom: 6px; letter-spacing: -.02em;
    }
    .updated {
      font-family: 'Caveat', cursive; font-size: 1.1rem;
      color: var(--muted); margin-bottom: 36px;
    }
    h2 {
      font-family: 'Fraunces', serif; font-style: italic; font-weight: 500;
      font-size: 1.35rem; margin: 36px 0 10px;
    }
    p { margin-bottom: 14px; font-size: 1rem; }
    ul { margin: 0 0 16px 22px; }
    ul li { margin-bottom: 6px; font-size: 1rem; }
    a { color: var(--ink); }

    footer {
      max-width: 760px; margin: 0 auto;
      padding: 28px 24px;
      border-top: 1px solid var(--rule);
      display: flex; justify-content: space-between; align-items: center;
      font-size: .9rem; color: var(--muted);
    }
    footer nav a {
      color: var(--muted); text-decoration: none;
      margin-left: 16px; transition: color .15s;
    }
    footer nav a:hover { color: var(--ink); }

    @media (max-width: 520px) {
      header, footer { flex-direction: column; gap: 8px; align-items: flex-start; }
      footer nav a { margin: 0 14px 0 0; }
    }
  `;

const BODY = `<header>
  <a class="logo" href="/">The Endless Sketchbookery<br>of Jens Claessens</a>
  <nav>
    <a href="/">← Back to canvas</a>
    <a href="/about">About</a>
    <a href="/privacy">Privacy</a>
  </nav>
</header>

<main>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: <span id="updated">May 2026</span></p>

  <p>This page explains what data this site collects when you visit, how it is used, and the choices you have. The Endless Sketchbookery of Jens Claessens is run by an individual creator and only collects what is needed to keep the site working and to support it through advertising.</p>

  <h2>What we collect directly</h2>
  <p>This site does not require you to create an account, sign in, or submit any personal information to browse the canvas. We do not collect names, email addresses, or other identifying details from visitors.</p>
  <p>The server keeps standard access logs (IP address, browser type, requested page, timestamp) for short periods, which are used only to keep the service running and to spot abuse or technical errors. These logs are not shared with third parties except as required by law.</p>

  <h2>Cookies and similar technologies</h2>
  <p>This site uses a small amount of browser storage to remember your zoom and pan position during a visit. This data stays on your device and is not transmitted to the server.</p>
  <p>This site uses no advertising, analytics, or other third-party services, so no third-party cookies are set. You can disable cookies in your browser settings; the canvas will continue to work normally.</p>

  <h2>Fonts</h2>
  <p>All fonts are served directly from this site. No third-party font service (such as Google Fonts) is used, so your browser never contacts an outside server to display the page.</p>

  <h2>Children</h2>
  <p>This site is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided personal information through the site, please contact us so we can remove it.</p>

  <h2>Your rights</h2>
  <p>If you are in the European Economic Area, the United Kingdom, or another jurisdiction with a comparable data protection law, you have rights regarding personal data we hold about you, including the right to access, correct, or delete that data, and the right to lodge a complaint with your local supervisory authority.</p>
  <p>Because this site does not collect personal information directly and uses no third-party services, there is little or no such data held elsewhere; for anything held by our server, please contact us at the address below.</p>

  <h2>Changes to this policy</h2>
  <p>This policy may be updated from time to time to reflect changes in the site, in the services we use, or in applicable law. The "Last updated" date above will reflect any revisions. Continued use of the site after changes means you accept the updated policy.</p>

  <h2>Contact</h2>
  <p>If you have questions about this privacy policy or about how the site handles your data, you can reach us at <a href="mailto:jens.claessens@gmail.com">jens.claessens@gmail.com</a>.</p>
</main>

<footer>
  <span>© <span id="year">2026</span> Jens Claessens</span>
  <nav>
    <a href="/">Canvas</a>
    <a href="/about">About</a>
    <a href="/privacy">Privacy</a>
  </nav>
</footer>`;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BODY }} />
      <Script id="year" strategy="afterInteractive">{`document.getElementById('year').textContent = new Date().getFullYear();`}</Script>
    </>
  );
}
