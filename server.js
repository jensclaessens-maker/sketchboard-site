// ═══════════════════════════════════════════════════════════════════
//  Sketchboard server
//  Serves the public canvas + admin page, handles uploads & positions.
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Owner password (CHANGE THIS or set SKETCHBOARD_PASSWORD env var) ──
const PASSWORD  = process.env.SKETCHBOARD_PASSWORD || 'admin';
const PASS_HASH = crypto.createHash('sha256').update(PASSWORD).digest('hex');

// ── Paths ──
const PUBLIC = path.join(__dirname, 'public');
const IMAGES = path.join(PUBLIC, 'images');
const DATA   = path.join(__dirname, 'data.json');

// Ensure storage exists
fs.mkdirSync(IMAGES, { recursive: true });
if (!fs.existsSync(DATA)) {
  fs.writeFileSync(DATA, JSON.stringify({ sketches: [] }, null, 2));
}

// ── Helpers ──
const EMPTY = { sketches: [] };
const readData = () => {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch {
    // File missing or unreadable — recreate it with an empty state.
    fs.writeFileSync(DATA, JSON.stringify(EMPTY, null, 2));
    return { ...EMPTY };
  }
};
const writeData = d => fs.writeFileSync(DATA, JSON.stringify(d, null, 2));

// ── File uploads → public/images/ ──
const storage = multer.diskStorage({
  destination: IMAGES,
  filename: (_req, file, cb) => {
    const ext  = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const safe = `sk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per image
  fileFilter: (_req, file, cb) => {
    cb(file.mimetype.startsWith('image/') ? null : new Error('Only images allowed'), true);
  },
});

// ── In-memory session tokens (good enough for a single-owner site) ──
const sessions = new Set();
const makeToken = () => crypto.randomBytes(24).toString('hex');

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (sessions.has(token)) return next();
  res.status(401).json({ error: 'unauthorized' });
}

// ═══════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════
app.use(express.json());
app.use(express.static(PUBLIC));

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  const hash = crypto.createHash('sha256').update(password || '').digest('hex');
  if (hash !== PASS_HASH) return res.status(401).json({ error: 'wrong password' });
  const token = makeToken();
  sessions.add(token);
  res.json({ token });
});

// Read all sketches (public — anyone can view the canvas)
app.get('/api/data', (_req, res) => {
  res.json(readData());
});

// Upload new sketch
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  const data = readData();
  const sk = {
    id:    'sk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    file:  req.file.filename,
    title: (req.body.title || '').trim(),
    x:     Math.round(parseFloat(req.body.x) || 0),
    y:     Math.round(parseFloat(req.body.y) || 0),
    w:     Math.round(parseFloat(req.body.w) || 300),
    h:     Math.round(parseFloat(req.body.h) || 300),
    z:     data.sketches.length, // top of stack
  };
  data.sketches.push(sk);
  writeData(data);
  res.json({ sketch: sk });
});

// Update a sketch (move / rename / restack)
app.patch('/api/sketches/:id', requireAuth, (req, res) => {
  const data = readData();
  const sk = data.sketches.find(s => s.id === req.params.id);
  if (!sk) return res.status(404).json({ error: 'not found' });

  ['x', 'y', 'z', 'title'].forEach(k => {
    if (req.body[k] !== undefined) sk[k] = req.body[k];
  });
  writeData(data);
  res.json({ sketch: sk });
});

// Delete a sketch + its image file
app.delete('/api/sketches/:id', requireAuth, (req, res) => {
  const data = readData();
  const idx  = data.sketches.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });

  const [removed] = data.sketches.splice(idx, 1);
  try { fs.unlinkSync(path.join(IMAGES, removed.file)); } catch (_) { /* file already gone */ }
  writeData(data);
  res.json({ ok: true });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n  Sketchboard running at http://localhost:${PORT}`);
  console.log(`  Admin password: ${PASSWORD === 'admin' ? '"admin" (CHANGE THIS!)' : '(set via env)'}\n`);
});
