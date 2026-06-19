// Cloudflare binding types for this Worker.
//
// Hand-authored minimal definitions so `next build` typechecks without
// pulling the full @cloudflare/workers-types global ambient types (which
// clash with the DOM lib Next.js relies on). You can OPTIONALLY regenerate
// this file with the complete Wrangler types via:  npm run cf-typegen
// (that command overwrites this file from wrangler.jsonc).

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  first<V = unknown>(column: string): Promise<V | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2HTTPMetadata {
  contentType?: string;
  cacheControl?: string;
}

interface R2Object {
  key: string;
  size: number;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}

type R2PutValue =
  | ReadableStream
  | ArrayBuffer
  | ArrayBufferView
  | string
  | null
  | Blob;

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: R2PutValue,
    options?: { httpMetadata?: R2HTTPMetadata }
  ): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: {
    cursor?: string;
    limit?: number;
    prefix?: string;
  }): Promise<R2Objects>;
}

interface Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

interface CloudflareEnv {
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  DB: D1Database;
  IMAGES: R2Bucket;
  /** Admin login password. Set as a Worker secret in production. */
  SKETCHBOARD_PASSWORD: string;
  /**
   * Token-signing secret. Recommended: set a dedicated random value (separate
   * from the password). Falls back to SKETCHBOARD_PASSWORD if unset; with
   * neither set, token verification fails closed (all writes rejected).
   */
  AUTH_SECRET?: string;
}
