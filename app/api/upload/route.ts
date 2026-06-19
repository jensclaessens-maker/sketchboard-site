import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAuthed } from "@/lib/auth";
import { insertSketch, maxZ, type Sketch } from "@/lib/sketches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB, same as the original multer limit

// Derive the extension from the MIME type (never the client filename).
// SVG is deliberately excluded — it can carry inline scripts that would run
// same-origin if the file URL were opened directly, and a raster sketch canvas
// has no need for it.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

function num(v: FormDataEntryValue | null, fallback: number): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

// POST /api/upload  (multipart: image, title, x, y, w, h)  ->  { sketch }
export async function POST(request: Request) {
  const { env } = getCloudflareContext();
  if (!(await isAuthed(env, request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return Response.json({ error: "no file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return Response.json({ error: "only raster images allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "file too large (max 25 MB)" }, { status: 413 });
  }

  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const filename = `sk_${Date.now()}_${rand()}.${ext}`;

  // Buffer the file (<=25 MB) and store it in R2 with a 1-year immutable cache
  // (filenames are unique per upload, so they're safe to cache forever).
  const bytes = await file.arrayBuffer();
  await env.IMAGES.put(filename, bytes, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const sketch: Sketch = {
    id: `sk_${Date.now()}_${rand()}`,
    file: filename,
    title: String(form.get("title") ?? "").trim(),
    x: Math.round(num(form.get("x"), 0)),
    y: Math.round(num(form.get("y"), 0)),
    w: Math.round(num(form.get("w"), 300)),
    h: Math.round(num(form.get("h"), 300)),
    z: (await maxZ(env.DB)) + 1,
    locked: false,
  };

  await insertSketch(env.DB, sketch);
  return Response.json({ sketch });
}
