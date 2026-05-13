// GET /api/federation/pulse — federation-wide analytics (public, rate-limited)
// Drives the civilization HUD on /civilization and dashboard panels.

import { NextResponse } from "next/server";
import { getFederationPulse } from "@/services/analytics-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "fed:pulse", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const pulse = await getFederationPulse();
  return NextResponse.json({ pulse });
}
