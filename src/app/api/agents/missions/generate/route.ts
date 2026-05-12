// POST /api/agents/missions/generate — GENUBRA Mission Architect
//
// Body: { focus?: string; realmContext?: string; publish?: boolean }
//   focus        — operator's one-line objective ("ship a SaaS this month")
//   realmContext — optional: realm context to anchor missions
//   publish      — if true, also inserts missions into the missions table as
//                  status='ACTIVE'. Otherwise returns suggestions only.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOperator } from "@/services/operator-service";
import { generateMissions, xpForDifficulty } from "@/agents/mission-generator";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const Body = z.object({
  focus:         z.string().max(800).optional(),
  realmContext:  z.string().max(800).optional(),
  publish:       z.boolean().optional(),
});

export async function POST(req: Request) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await rateLimit(req, { bucket: "agents:missions", limit: 20, windowMs: 60_000, identifier: op.profile.id });
  if (limited) return limited;

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  // Count completed missions for rank-calibration context
  const admin = createSupabaseAdmin();
  const { count: completed } = await admin
    .from("mission_progress")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", op.profile.id)
    .eq("state", "COMPLETED");

  let result;
  try {
    result = await generateMissions({
      operator: op.profile,
      rank: op.rank,
      recentMissionsCompleted: completed ?? 0,
      focusBrief: parsed.data.focus,
      realmContext: parsed.data.realmContext,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }

  if (parsed.data.publish) {
    const rows = result.missions.map((m) => ({
      title:      m.title,
      brief:      m.brief,
      status:     "ACTIVE" as const,
      difficulty: m.difficulty,
      xp_reward:  Math.max(25, Math.min(2000, m.xp_reward || xpForDifficulty(m.difficulty))),
      tags:       m.tags,
      created_by: op.profile.id,
    }));
    const { data: inserted } = await admin
      .from("missions")
      .insert(rows)
      .select("id, title, difficulty, xp_reward, tags");
    return NextResponse.json({ generated: result.missions, published: inserted ?? [] }, { status: 201 });
  }

  return NextResponse.json({ generated: result.missions });
}
