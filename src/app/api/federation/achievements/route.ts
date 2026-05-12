// GET /api/federation/achievements
//   ?operator_id=<uuid>  → list with unlocked status for that operator
//   ?callsign=<text>     → ditto, by callsign
//   (no params)          → catalog only
//
// Public read — no auth required. Achievements are civilization-public.

import { NextResponse } from "next/server";
import {
  listAllAchievements,
  listOperatorAchievements,
  listOperatorAchievementsByCallsign,
} from "@/services/achievement-service";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const operatorId = url.searchParams.get("operator_id");
  const callsign = url.searchParams.get("callsign");

  if (operatorId) {
    const list = await listOperatorAchievements(operatorId);
    return NextResponse.json({
      achievements: list,
      unlocked_count: list.filter((a) => a.unlocked).length,
      total: list.length,
    });
  }

  if (callsign) {
    const result = await listOperatorAchievementsByCallsign(callsign);
    if (!result) return NextResponse.json({ error: "operator not found" }, { status: 404 });
    return NextResponse.json({
      callsign: result.callsign,
      unlocked: result.unlocked,
      locked: result.locked,
      unlocked_count: result.unlocked.length,
    });
  }

  const catalog = await listAllAchievements();
  return NextResponse.json({ achievements: catalog, total: catalog.length });
}
