// POST /api/aura/scan
//   { url, email? }  →  { token, status, score? }
//
// Public, rate-limited. Lead capture optional (collected post-result on
// the share page is the better conversion path; we accept it here too).

import { NextResponse } from "next/server";
import { z } from "zod";
import { startAuraScan } from "@/services/aura-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const Body = z.object({
  url:   z.string().min(3).max(2048),
  email: z.string().email().max(254).optional(),
});

async function ipDayHash(req: Request): Promise<string> {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}:${day}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  // 6 scans / minute / IP — generous but stops spammers
  const limited = await rateLimit(req, { bucket: "aura:scan", limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "invalid input" }, { status: 400 });
  }

  // Reject obvious garbage
  const url = parsed.data.url.trim();
  if (url.includes(" ") || url.length < 4) {
    return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
  }

  try {
    const ip_hash = await ipDayHash(req);
    const { row } = await startAuraScan({
      url,
      email: parsed.data.email ?? null,
      ipHash: ip_hash,
    });
    return NextResponse.json({
      token:  row.share_token,
      status: row.status,
      score:  row.aura_score,
      error:  row.error,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "scan failed" }, { status: 500 });
  }
}
