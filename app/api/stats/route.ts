import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAuthed } from "@/lib/auth";
import { countSketches } from "@/lib/sketches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/stats  ->  { count, files, bytes }   (admin only)
export async function GET(request: Request) {
  const { env } = getCloudflareContext();
  if (!(await isAuthed(env, request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const count = await countSketches(env.DB);

  // Total image count + bytes stored in R2 (paginated; buckets list 1000/page).
  let files = 0;
  let bytes = 0;
  let cursor: string | undefined;
  do {
    const listing = await env.IMAGES.list({ cursor, limit: 1000 });
    for (const obj of listing.objects) {
      files++;
      bytes += obj.size;
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  return Response.json({ count, files, bytes });
}
