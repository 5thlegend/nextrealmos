// Edge-compatible rate limiter. Uses Cloudflare Workers KV when bound; falls
// back to in-memory map for local dev / when KV not present.
//
// Usage in any route handler:
//
//   const limited = await rateLimit(req, { bucket: "fed:tx:get", limit: 60, windowMs: 60_000 });
//   if (limited) return limited;
//
// When the limit is exceeded the helper returns a fully-formed 429 NextResponse
// so the caller can early-return. Otherwise returns null.

import { NextResponse } from "next/server";

type LimitOpts = {
  /** Logical bucket identifier — typically "<surface>:<verb>". */
  bucket: string;
  /** Max requests per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Optional explicit identifier — defaults to client IP. */
  identifier?: string;
};

// In-memory fallback (per-isolate; OK for local + cheap protection).
const mem = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  );
}

async function getKv(): Promise<KVNamespace | null> {
  try {
    // Lazy import — only present in Cloudflare runtime.
    const { getRequestContext } = await import("@cloudflare/next-on-pages");
    const env = getRequestContext().env as { RATE_LIMIT_KV?: KVNamespace };
    return env.RATE_LIMIT_KV ?? null;
  } catch {
    return null;
  }
}

export async function rateLimit(req: Request, opts: LimitOpts): Promise<NextResponse | null> {
  const id  = opts.identifier ?? clientIp(req);
  const key = `rl:${opts.bucket}:${id}`;
  const now = Date.now();
  const winSec = Math.ceil(opts.windowMs / 1000);

  const kv = await getKv();
  if (kv) {
    const raw = await kv.get(key);
    let count = raw ? parseInt(raw, 10) : 0;
    if (Number.isNaN(count)) count = 0;
    if (count >= opts.limit) {
      return new NextResponse(
        JSON.stringify({ error: "rate_limited", retry_after_seconds: winSec }),
        { status: 429, headers: { "content-type": "application/json", "retry-after": String(winSec) } },
      );
    }
    await kv.put(key, String(count + 1), { expirationTtl: winSec });
    return null;
  }

  // In-memory fallback
  const cur = mem.get(key);
  if (!cur || cur.resetAt < now) {
    mem.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (cur.count >= opts.limit) {
    return new NextResponse(
      JSON.stringify({ error: "rate_limited", retry_after_seconds: Math.ceil((cur.resetAt - now) / 1000) }),
      { status: 429, headers: { "content-type": "application/json", "retry-after": String(Math.ceil((cur.resetAt - now) / 1000)) } },
    );
  }
  cur.count += 1;
  return null;
}

// KVNamespace shape for typing — minimal, edge-only
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
