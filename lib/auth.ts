// Stateless admin auth.
//
// The original Express server stored random session tokens in a Set persisted
// to disk. Cloudflare Workers have no disk, so instead we issue a signed token
// (HMAC-SHA256 over its own expiry). Nothing is stored server-side: a token is
// valid iff its signature checks out and it hasn't expired. The browser keeps
// sending `Authorization: Bearer <token>` exactly as before.

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function enc(s: string) {
  // Copy into a fresh ArrayBuffer-backed view. TextEncoder().encode() is typed
  // as Uint8Array<ArrayBufferLike>, which the Web Crypto (BufferSource) types
  // reject; re-wrapping guarantees an ArrayBuffer-backed Uint8Array.
  return new Uint8Array(new TextEncoder().encode(s));
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc(msg));
  return bytesToB64url(new Uint8Array(sig));
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc(s));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time comparison of two equal-length strings (avoids leaking how
// many leading characters matched via timing).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function signingSecret(env: CloudflareEnv): string {
  return env.AUTH_SECRET || env.SKETCHBOARD_PASSWORD || "";
}

/** True when `password` matches the configured admin password. */
export async function checkPassword(
  env: CloudflareEnv,
  password: string
): Promise<boolean> {
  const expected = env.SKETCHBOARD_PASSWORD || "";
  if (!expected) return false; // misconfigured: refuse rather than allow all
  const [a, b] = await Promise.all([
    sha256Hex(password ?? ""),
    sha256Hex(expected),
  ]);
  return timingSafeEqual(a, b);
}

/** Mint a fresh signed session token. */
export async function makeToken(env: CloudflareEnv): Promise<string> {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const sig = await hmac(signingSecret(env), exp);
  return `${exp}.${sig}`;
}

/** Verify a token's signature and expiry. */
export async function verifyToken(
  env: CloudflareEnv,
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;
  // Fail closed: with no signing secret we'd be HMAC-ing an empty key, whose
  // signature is publicly computable — so a misconfigured (secret-less) deploy
  // must reject every token rather than accept forged ones.
  if (!signingSecret(env)) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = await hmac(signingSecret(env), exp);
  return timingSafeEqual(sig, expected);
}

/** Verify the `Authorization: Bearer <token>` header on a request. */
export async function isAuthed(
  env: CloudflareEnv,
  request: Request
): Promise<boolean> {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return verifyToken(env, token);
}
