// POST /api/agents/briefing — GENUBRA daily briefing for the operator
// Returns: { briefing: string }

import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/services/operator-service";
import { genubraDailyBriefing } from "@/agents/genubra";
import { listTransmissions } from "@/services/transmission-service";
import { listActiveMissions, getOperatorMissionProgress } from "@/services/mission-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: Request) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await rateLimit(req, { bucket: "agents:briefing", limit: 12, windowMs: 60_000, identifier: op.profile.id });
  if (limited) return limited;

  // Pull recent context — keep small to stay fast and cheap
  const [recentTx, missions, progress] = await Promise.all([
    listTransmissions({ limit: 8 }),
    listActiveMissions(),
    getOperatorMissionProgress(op.profile.id),
  ]);

  const acceptedIds = new Set(progress.filter((p) => p.state !== "COMPLETED").map((p) => p.mission_id));
  const inFlight = missions.filter((m) => acceptedIds.has(m.id)).map((m) => `${m.title} [${m.difficulty}]`);
  const recents = recentTx.map((tx) => {
    const t = tx as { event_name?: string | null; title: string; realms?: { slug?: string } | null };
    return `${t.event_name ? `[${t.event_name}] ` : ""}${t.title}${t.realms?.slug ? ` (/${t.realms.slug})` : ""}`;
  });

  const completed = progress.filter((p) => p.state === "COMPLETED").length;

  try {
    const briefing = await genubraDailyBriefing({
      ctx: {
        operator: op.profile,
        rank: op.rank,
        recentMissionsCompleted: completed,
        activeWorkflows: 0,
      },
      recentTransmissions: recents,
      inFlightMissions: inFlight,
      operatorId: op.profile.id,
    });
    return NextResponse.json({ briefing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Briefing failed" }, { status: 500 });
  }
}
