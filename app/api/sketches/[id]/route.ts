import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAuthed } from "@/lib/auth";
import { deleteSketch, getSketch, patchSketch } from "@/lib/sketches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/sketches/:id  { x?, y?, z?, title?, locked? }  ->  { sketch }
export async function PATCH(request: Request, { params }: Params) {
  const { env } = getCloudflareContext();
  if (!(await isAuthed(env, request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty/invalid body -> no-op update, returns the current row
  }

  const sketch = await patchSketch(env.DB, id, body);
  if (!sketch) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ sketch });
}

// DELETE /api/sketches/:id  ->  { ok: true }   (also removes the image file)
export async function DELETE(request: Request, { params }: Params) {
  const { env } = getCloudflareContext();
  if (!(await isAuthed(env, request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await getSketch(env.DB, id);
  if (!existing) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  // Best-effort image cleanup, then remove the row.
  try {
    await env.IMAGES.delete(existing.file);
  } catch {
    // object already gone — ignore
  }
  await deleteSketch(env.DB, id);

  return Response.json({ ok: true });
}
