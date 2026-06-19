// One-time migration: pull the 83 sketches from the old Express site, compress
// each image to WebP (keeping its EXACT pixel dimensions so the canvas layout is
// unchanged), upload to R2, and insert the rows into D1.
//
// Run from the project root, with the Cloudflare CLI logged in:
//   npm install --no-save sharp
//   node scripts/migrate-from-old.mjs
//
// `sharp` is only used here — it is NOT a Worker dependency (OpenNext bundles
// only modules imported by app/), so it never enters the deployed Worker.
//
// Idempotent: re-running re-puts the same .webp keys and INSERT OR REPLACEs the
// same rows (keyed on the original id). It won't touch sketches added later via
// the admin UI (different ids).

import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OLD_ORIGIN = "https://www.jensclaessens.com";
const BUCKET     = "sketchboard-images";
const DB         = "sketchboard-db";
const WEBP_Q     = 82;
const CACHE      = "public, max-age=31536000, immutable";

const tmp = mkdtempSync(join(tmpdir(), "sb-migrate-"));
const sqlEsc = (s) => String(s ?? "").replace(/'/g, "''");

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], { stdio: ["ignore", "pipe", "pipe"] }).toString();
}

async function main() {
  console.log(`Fetching sketch list from ${OLD_ORIGIN}/api/data …`);
  const res = await fetch(`${OLD_ORIGIN}/api/data`, { cache: "no-store" });
  if (!res.ok) throw new Error(`/api/data returned ${res.status}`);
  const { sketches } = await res.json();
  if (!Array.isArray(sketches) || !sketches.length) throw new Error("no sketches returned");
  console.log(`Got ${sketches.length} sketches.\n`);

  const rows = [];
  const failed = [];
  let i = 0;

  for (const s of sketches) {
    i++;
    const tag = `[${i}/${sketches.length}] ${s.file}`;
    try {
      // 1. Download the original image.
      const r = await fetch(`${OLD_ORIGIN}/images/${s.file}`);
      if (!r.ok) throw new Error(`image GET ${r.status}`);
      const inBuf = Buffer.from(await r.arrayBuffer());

      // 2. Re-encode to WebP at the SAME pixel size (no resize, no rotate) so
      //    stored w/h still match the bytes and the layout is unchanged.
      let outBuf, ext, contentType;
      const lower = (s.file || "").toLowerCase();
      if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
        outBuf = await sharp(inBuf).webp({ quality: WEBP_Q }).toBuffer();
        ext = "webp";
        contentType = "image/webp";
      } else {
        // Unknown/animated format (none expected): pass through untouched.
        outBuf = inBuf;
        ext = (s.file.split(".").pop() || "bin").toLowerCase();
        contentType = r.headers.get("content-type") || "application/octet-stream";
      }

      const base = s.file.replace(/\.[^.]+$/, "");
      const newFile = `${base}.${ext}`;

      // 3. Upload to R2 (only then will we emit the DB row).
      const tmpFile = join(tmp, newFile);
      writeFileSync(tmpFile, outBuf);
      wrangler([
        "r2", "object", "put", `${BUCKET}/${newFile}`,
        "--file", tmpFile,
        "--content-type", contentType,
        "--cache-control", CACHE,
        "--remote",
      ]);

      // 4. Queue the D1 row — everything except `file` copied verbatim.
      rows.push(
        `INSERT OR REPLACE INTO sketches (id,file,title,x,y,w,h,z,locked) VALUES (` +
        `'${sqlEsc(s.id)}','${sqlEsc(newFile)}','${sqlEsc(s.title)}',` +
        `${Number(s.x) || 0},${Number(s.y) || 0},${Number(s.w) || 0},${Number(s.h) || 0},` +
        `${Math.round(Number(s.z) || 0)},${s.locked ? 1 : 0});`
      );

      const pct = ((1 - outBuf.length / inBuf.length) * 100).toFixed(0);
      console.log(`  ${tag} → ${newFile}  ${(inBuf.length/1024).toFixed(0)}KB → ${(outBuf.length/1024).toFixed(0)}KB (${pct}% smaller)`);
    } catch (e) {
      console.error(`  ${tag}  FAILED: ${e.message}`);
      failed.push(s.id);
    }
  }

  if (!rows.length) throw new Error("nothing uploaded — aborting before D1 write");

  // 5. Apply all rows in one D1 call.
  const sqlFile = join(tmp, "migrate.sql");
  writeFileSync(sqlFile, rows.join("\n") + "\n");
  console.log(`\nApplying ${rows.length} rows to D1 (${DB}) …`);
  const out = wrangler(["d1", "execute", DB, "--remote", "--file", sqlFile]);
  console.log(out.split("\n").slice(-6).join("\n"));

  console.log(`\nDone. ${rows.length} migrated, ${failed.length} failed.`);
  if (failed.length) console.log(`Failed ids: ${failed.join(", ")}`);

  rmSync(tmp, { recursive: true, force: true });
}

main().catch((e) => { console.error("\nMigration error:", e.message); process.exit(1); });
