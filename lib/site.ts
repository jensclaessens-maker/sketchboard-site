// Single source of truth for SEO. Nothing else hardcodes the domain — everything
// (metadataBase, canonicals, OG image, robots, sitemap, JSON-LD) imports from here.
//
// Canonical origin is the apex (https://jensclaessens.com). The site also answers
// on www.jensclaessens.com and *.workers.dev; the canonical tags + robots host
// pointer tell search engines the apex is the one true URL (avoids duplicate-
// content splitting across the three hostnames).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://jensclaessens.com"
).replace(/\/$/, ""); // env override for previews; trailing slash stripped

export const SITE_NAME = "The Endless Sketchbookery of Jens Claessens";

export const SITE_DESCRIPTION =
  "An infinite, zoomable canvas of hand-drawn sketches by artist Jens Claessens — pan and explore an ever-growing wall of drawings.";

// Relative path to the committed static share image (resolved to absolute by
// metadataBase). Static PNG, not a dynamic next/og route — most robust on
// Cloudflare Workers (no WASM, no runtime font loading, zero CPU per request).
export const OG_IMAGE = "/og.png";

// The artist's profiles — used for JSON-LD sameAs (helps Google connect the site
// to the person). Kept in sync with the nav links in app/page.tsx.
export const SOCIAL_LINKS = [
  "https://www.instagram.com/jensclaessens/",
  "https://x.com/JensClaessens",
  "https://www.tiktok.com/@jensclaessens",
];

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
