// One-off generator for the static SEO images. Run with:
//   npm install --no-save satori sharp wawoff2 && node scripts/gen-seo-images.mjs
// satori/sharp/wawoff2 are NOT runtime deps (not imported by app/) — they only run
// here, so the Worker bundle stays lean. Outputs are committed:
//   public/og.png        1200x630  social share image (referenced via metadata)
//   public/icon-512.png  512x512   JSON-LD logo / Person image
//   app/apple-icon.png   180x180   Apple touch icon (file convention)
// The OG title uses the site's own brand font (public/fonts/cormorant-italic.woff2),
// decompressed to TTF for satori (satori can't read woff2 directly).
import satori from "satori";
import sharp from "sharp";
import { decompress } from "wawoff2";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const INK = "#12100a";
const MUTED = "#6a5e48";
const PAPER = "#faf1e0";

// ── Brand font (Cormorant Italic, the same woff2 the site's logo uses) ────────
async function loadFont() {
  const woff2 = await readFile(join(ROOT, "public/fonts/cormorant-italic.woff2"));
  const ttf = await decompress(woff2); // Uint8Array — satori needs TTF, not woff2
  return Buffer.from(ttf);
}

// satori VDOM helper (plain objects — this is a .mjs script, no JSX)
const el = (type, style, children) => ({ type, props: { style, ...(children !== undefined ? { children } : {}) } });

async function genOg(font) {
  const tree = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "90px",
      backgroundColor: PAPER,
      color: INK,
      fontFamily: "Cormorant",
    },
    [
      el("div", { fontSize: 30, color: MUTED, marginBottom: 16 }, "jensclaessens.com"),
      el("div", { fontSize: 86, lineHeight: 1.04 }, "The Endless Sketchbookery"),
      el("div", { fontSize: 86, lineHeight: 1.04 }, "of Jens Claessens"),
      el("div", { width: 150, height: 4, backgroundColor: INK, margin: "30px 0 24px" }),
      el("div", { fontSize: 40, color: MUTED }, "An infinite canvas of sketches"),
    ]
  );

  const svg = await satori(tree, {
    width: 1200,
    height: 630,
    fonts: [{ name: "Cormorant", data: font, weight: 500, style: "normal" }],
  });
  await sharp(Buffer.from(svg)).png().toFile(join(ROOT, "public/og.png"));
  console.log("✓ public/og.png (1200x630)");
}

async function genIcons() {
  const svg = await readFile(join(ROOT, "app/icon.svg"));
  await sharp(svg, { density: 600 }).resize(512, 512).png().toFile(join(ROOT, "public/icon-512.png"));
  console.log("✓ public/icon-512.png (512x512)");
  await sharp(svg, { density: 600 }).resize(180, 180).png().toFile(join(ROOT, "app/apple-icon.png"));
  console.log("✓ app/apple-icon.png (180x180)");
}

const font = await loadFont();
await genOg(font);
await genIcons();
console.log("done.");
