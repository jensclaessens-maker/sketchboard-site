import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /images/:file  ->  the image bytes streamed from R2.
// R2 egress is free. The 1-year immutable cache header lets each visitor's
// BROWSER cache the image, so a given viewer re-downloads it at most once.
// (Note: on the *.workers.dev domain there is no Cloudflare edge cache, so a
// first/cold view per browser still hits the Worker + R2. To add edge caching,
// serve from an R2 custom domain — see DEPLOY.md.)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { env } = getCloudflareContext();
  const { file } = await params;

  const object = await env.IMAGES.get(file);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers); // copies stored Content-Type + Cache-Control
  headers.set("etag", object.httpEtag);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  // Don't let a stored object be sniffed into an executable type.
  headers.set("x-content-type-options", "nosniff");

  return new Response(object.body, { status: 200, headers });
}
