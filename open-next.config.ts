import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext config. This site has no ISR/on-demand revalidation
// (the canvas pages are static and data loads client-side), so the default
// in-memory cache is fine — no extra R2/KV cache bucket needed.
export default defineCloudflareConfig({});
