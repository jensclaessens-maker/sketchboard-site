// D1 data access for sketches. Mirrors the shape the original server returned
// (and the canvas JS still expects): { id, file, title, x, y, w, h, z, locked }.

export interface Sketch {
  id: string;
  file: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  locked: boolean;
}

interface SketchRow {
  id: string;
  file: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  locked: number; // 0/1 in SQLite
}

const COLS = "id, file, title, x, y, w, h, z, locked";

function rowToSketch(r: SketchRow): Sketch {
  return {
    id: r.id,
    file: r.file,
    title: r.title,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    z: r.z,
    locked: !!r.locked,
  };
}

export async function listSketches(db: D1Database): Promise<Sketch[]> {
  const { results } = await db
    .prepare(`SELECT ${COLS} FROM sketches ORDER BY z ASC, rowid ASC`)
    .all<SketchRow>();
  return (results ?? []).map(rowToSketch);
}

export async function getSketch(
  db: D1Database,
  id: string
): Promise<Sketch | null> {
  const row = await db
    .prepare(`SELECT ${COLS} FROM sketches WHERE id = ?`)
    .bind(id)
    .first<SketchRow>();
  return row ? rowToSketch(row) : null;
}

export async function countSketches(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS c FROM sketches")
    .first<{ c: number }>();
  return row?.c ?? 0;
}

/** Highest existing z, or -1 when the canvas is empty. */
export async function maxZ(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT MAX(z) AS mz FROM sketches")
    .first<{ mz: number | null }>();
  return row?.mz ?? -1;
}

export async function insertSketch(db: D1Database, s: Sketch): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sketches (${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(s.id, s.file, s.title, s.x, s.y, s.w, s.h, s.z, s.locked ? 1 : 0)
    .run();
}

export async function deleteSketch(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM sketches WHERE id = ?").bind(id).run();
}

// Fields the admin is allowed to change after upload (matches the original
// PATCH whitelist: move / restack / rename / lock).
type PatchBody = Partial<Pick<Sketch, "x" | "y" | "z" | "title" | "locked">>;

/**
 * Apply a partial update with one atomic UPDATE (no read-modify-write, so
 * rapid drags can't lose each other). Returns the updated row, or null if the
 * id doesn't exist.
 */
export async function patchSketch(
  db: D1Database,
  id: string,
  body: PatchBody
): Promise<Sketch | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (body.x !== undefined) {
    sets.push("x = ?");
    vals.push(Number(body.x));
  }
  if (body.y !== undefined) {
    sets.push("y = ?");
    vals.push(Number(body.y));
  }
  if (body.z !== undefined) {
    sets.push("z = ?");
    vals.push(Number(body.z));
  }
  if (body.title !== undefined) {
    sets.push("title = ?");
    vals.push(String(body.title));
  }
  if (body.locked !== undefined) {
    sets.push("locked = ?");
    vals.push(body.locked ? 1 : 0);
  }

  if (sets.length > 0) {
    vals.push(id);
    await db
      .prepare(`UPDATE sketches SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...vals)
      .run();
  }

  // Return the current state (null => row not found => 404 at the route).
  return getSketch(db, id);
}
