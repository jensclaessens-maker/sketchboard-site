# Sketchboard

An infinite canvas of sketches. A public canvas anyone can pan/zoom, plus a
password-protected `/admin` editor to upload, drag, restack, lock, and delete.

Built with **Next.js 15 (App Router)** and deployed to **Cloudflare Workers**
(free plan) via the [OpenNext](https://opennext.js.org/cloudflare) adapter.
Images live in **Cloudflare R2**; sketch positions live in **Cloudflare D1**.

> Previously a Node/Express app that stored images and a `data.json` on a
> persistent disk (which needs a paid host). It was ported to Cloudflare so it
> can run for **$0** — see [DEPLOY.md](./DEPLOY.md).

## Project layout

```
sketchboard-site/
├── app/
│   ├── page.tsx              ← public canvas (/)
│   ├── admin/page.tsx        ← editor (/admin, password)
│   ├── about/page.tsx        ← /about
│   ├── privacy/page.tsx      ← /privacy
│   ├── api/
│   │   ├── login/route.ts        POST  password -> token
│   │   ├── data/route.ts         GET   all sketches (public)
│   │   ├── stats/route.ts        GET   admin stats (count/files/bytes)
│   │   ├── upload/route.ts       POST  image -> R2 + D1
│   │   └── sketches/[id]/route.ts PATCH move/rename/restack/lock · DELETE
│   ├── images/[file]/route.ts ← serves an image from R2
│   └── layout.tsx
├── lib/
│   ├── auth.ts               ← stateless HMAC bearer-token auth
│   └── sketches.ts           ← D1 data access
├── public/js/
│   ├── viewer.js             ← canvas engine for / (unchanged from original)
│   └── admin.js              ← canvas engine for /admin (unchanged from original)
├── schema.sql                ← D1 table
├── wrangler.jsonc            ← Cloudflare bindings (R2 + D1) + Worker config
├── open-next.config.ts
└── next.config.ts
```

The pan/zoom/pinch/drag/virtualization logic in `public/js/*.js` is the original
vanilla-JS engine, preserved verbatim (only change: image URLs are now absolute,
`/images/...`, so they work on every route).

## Local development

```bash
npm install
# one time: create the local test database
npx wrangler d1 execute sketchboard-db --local --file=./schema.sql
npm run dev          # http://localhost:3000  (fast, auto-reloads)
# or:
npm run preview      # runs in the real Cloudflare Workers runtime
```

Local login password comes from `.dev.vars` (default `admin`). That file is
gitignored — production secrets are set in Cloudflare.

## Deploying

See **[DEPLOY.md](./DEPLOY.md)** for the full one-time setup. The short version,
once set up:

```bash
npm run deploy
```

## How it works

- **Visitors** hit `/` → pan/zoom the canvas, can't change anything. Each visit
  lands on a random sketch; images load only as they scroll into view.
- **You** hit `/admin` → log in once, then upload (drag/paste/click), move,
  reorder, lock, rename, or delete sketches.
- **Images** are stored in R2 and served at `/images/<file>` with a 1-year
  immutable cache. **Positions/titles** are rows in D1. **Login** issues a signed
  token (no server-side session storage).
- Images display at their **actual pixel size** in world space.

## AdSense

The publisher id (`ca-pub-9316815166015110`) is wired into `app/page.tsx`,
`app/about/page.tsx`, and `app/privacy/page.tsx`. Replace the `YOUR_SLOT_TOP` /
`YOUR_SLOT_CORNER` placeholders with real slot ids once AdSense approves them.
The admin page deliberately has no ads.
