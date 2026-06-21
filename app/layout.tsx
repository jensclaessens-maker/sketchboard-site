import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./fonts.css";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, OG_IMAGE } from "../lib/site";

// Fonts are self-hosted (fonts.css + the Cormorant @font-face in page.tsx), so
// the site makes ZERO third-party requests — no Google Fonts, nothing to flag
// as tracking/fingerprinting.
//
// SEO: metadataBase is the single most important defensive setting on Cloudflare/
// OpenNext — it resolves the relative og:image + canonicals to absolute URLs from
// a hardcoded origin instead of the worker's reconstructed request.url.
// openGraph here deliberately omits title/description AND url so each page
// auto-derives its own (Next shallow-merges openGraph; the pages here never
// override it, so they all inherit siteName + the default image). Pinning url
// to SITE_URL would wrongly give /about & /privacy the homepage's og:url while
// their canonical points elsewhere.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Jens Claessens" }],
  creator: "Jens Claessens",
  keywords: [
    "Jens Claessens",
    "sketchbook",
    "sketches",
    "drawing",
    "drawings",
    "illustration",
    "art",
    "infinite canvas",
    "digital sketchbook",
    "artist portfolio",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@JensClaessens",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// Mobile browser chrome tint (the paper cream), matching the site background.
export const viewport: Viewport = {
  themeColor: "#faf1e0",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
