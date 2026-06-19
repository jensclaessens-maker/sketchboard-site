-- Sketchboard D1 schema.
-- Apply with:
--   npx wrangler d1 execute sketchboard-db --local  --file=./schema.sql   (local dev)
--   npx wrangler d1 execute sketchboard-db --remote --file=./schema.sql   (production)

CREATE TABLE IF NOT EXISTS sketches (
  id      TEXT PRIMARY KEY,
  file    TEXT NOT NULL,
  title   TEXT NOT NULL DEFAULT '',
  x       REAL NOT NULL DEFAULT 0,
  y       REAL NOT NULL DEFAULT 0,
  w       REAL NOT NULL DEFAULT 300,
  h       REAL NOT NULL DEFAULT 300,
  z       INTEGER NOT NULL DEFAULT 0,
  locked  INTEGER NOT NULL DEFAULT 0  -- 0/1; SQLite has no native boolean
);

-- The viewer reads every sketch ordered by z; index keeps that cheap as the
-- collection grows.
CREATE INDEX IF NOT EXISTS idx_sketches_z ON sketches (z);
