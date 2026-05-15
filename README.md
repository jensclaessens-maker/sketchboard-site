# Sketchboard

An infinite canvas of your sketches. Two pages, one folder for everything, real image files in a real folder.

```
sketchboard/
├── server.js          ← the Node backend
├── package.json
├── data.json          ← positions live here (created on first run)
└── public/
    ├── index.html     ← the public canvas (what visitors see)
    ├── admin.html     ← your editor (password required)
    └── images/        ← uploaded files end up here
```

## Run it

```bash
cd sketchboard
npm install
npm start
```

Open:
- **http://localhost:3000** — the public canvas (what visitors see)
- **http://localhost:3000/admin.html** — your editor, asks for a password

## Set your password

The default password is `admin` — **change it before deploying anywhere public.**

Two ways:

1. Edit `server.js` and change the `PASSWORD` constant
2. Or set an environment variable when starting:

   ```bash
   SKETCHBOARD_PASSWORD=your-secret npm start
   ```

## How it works

- **Visitors** hit `/` → they see the canvas, can pan and zoom, can't change anything
- **You** hit `/admin.html` → log in once, then upload, drag images anywhere (overlap is fine), rename or delete
- Images are real files in `public/images/`
- Positions live in `data.json` — server writes to it on every change
- Images display at their **actual pixel size** (a 2000×1500 photo takes up 2000×1500 px in world space)

## Deploying

Anywhere that runs Node.js works:

- **Railway / Render / Fly.io** — connect your git repo, deploy
- **Any VPS** — clone, `npm install`, run with PM2 (`pm2 start server.js`)
- **Glitch / Replit** — paste the project in, hit run

Don't forget to set `SKETCHBOARD_PASSWORD` as an environment variable in production.

## AdSense

The viewer page (`index.html`) has slots ready for AdSense. Find the two `<ins class="adsbygoogle">` blocks and replace `ca-pub-YOUR_PUBLISHER_ID` plus the two slot IDs.

The admin page deliberately has no ads.
