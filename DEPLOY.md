# Deploying Sketchboard to Cloudflare (free)

This site now runs on Cloudflare's **free** plan:

| Piece | Cloudflare service | Free allowance |
|------|--------------------|----------------|
| The site + API | **Workers** | 100,000 requests/day |
| Sketch images | **R2** object storage | 10 GB stored, **free egress** |
| Sketch positions/titles | **D1** (SQLite) | 5 GB, 5M reads/day |

You only do the setup below **once**. After that, updating the canvas is just
visiting `/admin` and uploading — no commands needed.

Everything is driven by `wrangler` (Cloudflare's command-line tool), which is
already installed in this project. Commands are copy-paste ready. Run them from
this folder:

```
cd ~/Dev/sketchboard-site
```

---

## One-time setup (≈10 minutes)

### 1. Log in to Cloudflare

```
npx wrangler login
```

A browser window opens — click **Allow**. (If you don't have a Cloudflare
account yet, create a free one first at dash.cloudflare.com, then run this.)

### 2. Turn on R2 (one click, free)

Go to **dash.cloudflare.com → R2** in your browser and click the button to
enable R2. It asks for a card but **stays free** within the 10 GB / free-egress
allowance. You only do this once per account.

### 3. Create the image bucket

```
npx wrangler r2 bucket create sketchboard-images
```

### 4. Create the database

```
npx wrangler d1 create sketchboard-db
```

This prints a block that ends with a line like:

```
"database_id": "abc12345-6789-..."
```

**Copy that id.** Open `wrangler.jsonc` in this folder and replace
`REPLACE_WITH_ID_FROM_wrangler_d1_create` with it. Save the file.

### 5. Create the table in the database

```
npx wrangler d1 execute sketchboard-db --remote --file=./schema.sql
```

(The `--remote` flag is important — it sets up the real online database, not a
local test copy.)

### 6. Deploy the site

```
npm run deploy
```

When it finishes it prints your live URL, e.g.
`https://sketchboard.<your-subdomain>.workers.dev`. Open it — you should see the
(empty) canvas.

### 7. Set your admin password (and a signing secret)

The site is live but won't let you log in to `/admin` until you set a password.
Run these two commands; each asks you to paste a value and press Enter:

```
npx wrangler secret put SKETCHBOARD_PASSWORD
```
→ type the password you want to use for `/admin`, press Enter.

```
npx wrangler secret put AUTH_SECRET
```
→ paste a long random string. Generate one with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy its output and paste it as the `AUTH_SECRET` value. (This secret signs the
login token. It never needs to be memorised — just set it once.)

Secrets take effect immediately; **no redeploy needed.** That's it — visit
`https://your-site/admin`, log in, and upload sketches.

---

## Updating the site later

- **Adding/moving/deleting sketches:** just go to `/admin` and use the canvas.
  Nothing to deploy — images go to R2 and positions to D1 instantly.
- **Changing the code** (layout, text, etc.): edit, then run `npm run deploy`
  again. Or set up auto-deploy ↓.

### Optional: auto-deploy on every `git push`

So you don't have to run `npm run deploy` by hand:

1. Push this folder to GitHub (it already has a repo at
   `github.com/jensclaessens-maker/sketchboard-site`).
2. In the dashboard: **Workers & Pages → `sketchboard` → Settings → Builds →
   Connect** and pick the repo.
3. Set these two build settings (the defaults are wrong for this kind of app):
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
4. Save. Now every `git push` rebuilds and redeploys automatically. Your
   bindings (R2/D1) come from `wrangler.jsonc`, and the secrets you set in step 7
   stay attached — you don't re-enter them.

### Optional: use your own domain

In the dashboard: **Workers & Pages → `sketchboard` → Settings → Domains &
Routes → Add → Custom Domain**, and enter a domain you've added to Cloudflare.
Free.

---

## Running it on your own computer (optional)

For previewing changes locally before deploying:

```
# one time: create the local test database
npx wrangler d1 execute sketchboard-db --local --file=./schema.sql

# fast dev server (auto-reloads on edits) — http://localhost:3000
npm run dev

# OR run it exactly like Cloudflare will (real Workers runtime)
npm run preview
```

Local login uses the password in the `.dev.vars` file (default: `admin`). That
file is for your machine only and is never uploaded.

---

## Things to know

- **Existing sketches?** This new version starts with an empty canvas. The old
  site's images/positions are not carried over automatically — if you have a
  live old version with sketches you want to keep, tell Claude and it can write a
  one-time import.
- **Cost:** within the free allowances this is **$0/month**. The limit you'd hit
  first is Workers' **100,000 requests/day** — every page view, API call, and
  image counts as one. Two things keep that low: the viewer only loads images as
  they scroll into view, and each image carries a 1-year cache header so a
  visitor's browser re-downloads it at most once. Note the `*.workers.dev` URL
  has **no Cloudflare edge cache**, so the first time *each browser* loads an
  image it does hit the Worker. For a hobby art site that's still fine for a lot
  of traffic. **If the site gets popular,** the clean fix is serving images
  straight from an **R2 custom domain** (edge-cached, doesn't touch the Worker at
  all) — ask Claude when the time comes; the code is structured for it.
- **Protect the admin login.** There's no built-in lockout on `/api/login`
  (same as the old version), so use a **strong, long password** in step 7. If you
  want extra protection, add a free Cloudflare **WAF rate-limit rule** on
  `POST /api/login` (e.g. 10 requests/min per IP) in the dashboard.
- **Don't commit secrets.** `.dev.vars` is gitignored on purpose. Production
  secrets live only in Cloudflare (set via `wrangler secret put`). Setting a
  dedicated `AUTH_SECRET` (step 7) — separate from your password — is
  recommended: it keeps the login token's signing key independent of the
  password.
