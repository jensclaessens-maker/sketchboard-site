import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

// Metadata-route convention → served at /sitemap.xml with the correct content-type.
// The site has one real public page (the canvas) plus the static About + Privacy
// pages. Sketches have no individual URLs (they all live on the one canvas), so
// there are no per-sketch entries. Fully static → prerendered, no DB read needed.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
