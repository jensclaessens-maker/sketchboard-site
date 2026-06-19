import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "The Endless Sketchbookery of Jens Claessens",
  description: "An infinite canvas of sketches.",
};

// The canvas CSS references the font families by name ("Fraunces", "Caveat",
// "Inter"), so we load them via the real Google Fonts stylesheet rather than
// next/font (which would rename them). React hoists these <link>s into <head>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,500&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {children}
      </body>
    </html>
  );
}
