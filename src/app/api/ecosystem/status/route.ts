// GET /api/ecosystem/status
//   Live ecosystem snapshot — each layer's HTTP status + latency + metric.
//   Public, rate-limited. Drives /dashboard/ecosystem and any external
//   monitoring you want to wire up later.

import { NextResponse } from "next/server";
import { getEcosystemSnapshot, getRoadmap } from "@/services/ecosystem-status-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "ecosystem:status", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const [snapshot, roadmap] = await Promise.all([
    getEcosystemSnapshot(),
    Promise.resolve(getRoadmap()),
  ]);

  return NextResponse.json({ snapshot, roadmap });
}
