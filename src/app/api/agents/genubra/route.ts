import { z } from "zod";
import { genubraStream } from "@/agents/genubra";
import { streamToResponse } from "@/agents/ai-router";
import { getCurrentOperator } from "@/services/operator-service";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({ question: z.string().min(2).max(2000) });

export const runtime = "edge";

export async function POST(req: Request) {
  const op = await getCurrentOperator();
  if (!op) return new Response("Unauthorized", { status: 401 });

  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return new Response("Invalid body", { status: 400 });

  const supabase = await createSupabaseServer();
  const [{ count: missionsDone }, { count: activeWfs }] = await Promise.all([
    supabase.from("mission_progress").select("id", { count: "exact", head: true }).eq("operator_id", op.profile.id).eq("state", "COMPLETED"),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("operator_id", op.profile.id).eq("status", "ACTIVE"),
  ]);

  const stream = genubraStream({
    operatorId: op.profile.id,
    ctx: {
      operator: op.profile,
      rank: op.rank,
      recentMissionsCompleted: missionsDone ?? 0,
      activeWorkflows: activeWfs ?? 0,
    },
    question: parsed.data.question,
  });

  return streamToResponse(stream);
}
