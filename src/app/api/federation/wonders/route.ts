// GET /api/federation/wonders → public list of federation Wonders
// Wonders are permanent, federation-visible marquee builds. Reads only.

import { NextResponse } from "next/server";
import { listWonders } from "@/services/wonder-service";

export const runtime = "edge";

export async function GET() {
  const wonders = await listWonders();
  return NextResponse.json({ wonders, total: wonders.length });
}
