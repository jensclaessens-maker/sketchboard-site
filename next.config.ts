import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static pages (the canvas, about, privacy) are served from Cloudflare's
  // asset storage; the API route handlers run on the Worker.
};

export default nextConfig;

// Makes Cloudflare bindings (DB, IMAGES, secrets) available during `next dev`.
// No-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
