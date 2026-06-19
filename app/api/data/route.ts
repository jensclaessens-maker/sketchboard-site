import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listSketches } from "@/lib/sketches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/data  ->  { sketches: [...] }   (public — anyone can view the canvas)
export async function GET() {
  const { env } = getCloudflareContext();
  const sketches = await listSketches(env.DB);
  return Response.json(
    { sketches },
    { headers: { "Cache-Control": "no-store" } }
  );
}
