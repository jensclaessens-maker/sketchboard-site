import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./fonts.css";

export const metadata: Metadata = {
  title: "The Endless Sketchbookery of Jens Claessens",
  description: "An infinite canvas of sketches.",
};

// Fonts are self-hosted (fonts.css + the Cormorant @font-face in page.tsx), so
// the site makes ZERO third-party requests — no Google Fonts, nothing to flag
// as tracking/fingerprinting.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
