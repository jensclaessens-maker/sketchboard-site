import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

// Metadata-route convention → served at /robots.txt with the correct content-type.
// Do NOT add `export const runtime = 'edge'` — OpenNext wants the Node runtime.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
