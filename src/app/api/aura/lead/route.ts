// POST /api/aura/lead  { token, email }
// Attach a lead email to an existing scan post-result.

import { NextResponse } from "next/server";
import { z } from "zod";
import { attachEmailToScan } from "@/services/aura-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const Body = z.object({
  token: z.string().min(8).max(64),
  email: z.string().email().max(254),
});

export async function POST(req: Request) {
  const limited = await rateLimit(req, { bucket: "aura:lead", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "invalid input" }, { status: 400 });
  }

  try {
    await attachEmailToScan(parsed.data.token, parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "lead failed" }, { status: 500 });
  }
}
