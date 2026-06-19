-- Migration 0001 — create the sketches table.
-- Versioned form of schema.sql, for the `wrangler d1 migrations` workflow:
--   npx wrangler d1 migrations apply sketchboard-db --local
--   npx wrangler d1 migrations apply sketchboard-db --remote

CREATE TABLE IF NOT EXISTS sketches (
  id      TEXT PRIMARY KEY,
  file    TEXT NOT NULL,
  title   TEXT NOT NULL DEFAULT '',
  x       REAL NOT NULL DEFAULT 0,
  y       REAL NOT NULL DEFAULT 0,
  w       REAL NOT NULL DEFAULT 300,
  h       REAL NOT NULL DEFAULT 300,
  z       INTEGER NOT NULL DEFAULT 0,
  locked  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sketches_z ON sketches (z);
