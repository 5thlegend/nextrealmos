import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { Rank, XpLog } from "@/types/nros";

/**
 * Award XP to an operator and (if threshold crossed) promote rank.
 * Uses the service-role client because XP grants happen on behalf of the
 * system (mission completion, achievement unlock, AI-graded workflow).
 */
export async function awardXp(input: {
  operatorId: string;
  delta: number;
  reason: string;
  sourceType: XpLog["source_type"];
  sourceId?: string | null;
}): Promise<{ newXp: number; newRank: Rank | null; promoted: boolean }> {
  if (input.delta === 0) {
    const op = await getOperatorXp(input.operatorId);
    return { newXp: op?.xp ?? 0, newRank: null, promoted: false };
  }

  const admin = createSupabaseAdmin();

  const { data: profile, error: pErr } = await admin
    .from("operator_profiles")
    .select("id, xp, rank_id")
    .eq("id", input.operatorId)
    .single();
  if (pErr) throw pErr;

  const newXp = Math.max(0, profile.xp + input.delta);

  const { data: ranks } = await admin.from("ranks").select("*").order("order_index");
  const sortedRanks = (ranks ?? []) as Rank[];

  const eligibleRank = sortedRanks
    .slice()
    .reverse()
    .find((r) => newXp >= r.min_xp) ?? sortedRanks[0];

  const promoted = !!(eligibleRank && eligibleRank.id !== profile.rank_id);

  await admin
    .from("operator_profiles")
    .update({ xp: newXp, rank_id: eligibleRank?.id ?? profile.rank_id, updated_at: new Date().toISOString() })
    .eq("id", input.operatorId);

  await admin.from("xp_logs").insert({
    operator_id: input.operatorId,
    delta: input.delta,
    reason: input.reason,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
  });

  if (promoted && eligibleRank) {
    await admin.from("notifications").insert({
      operator_id: input.operatorId,
      kind: "RANK",
      title: `Rank ascended → ${eligibleRank.name}`,
      body: `You crossed ${eligibleRank.min_xp} XP. New tier: ${eligibleRank.tier}.`,
    });
  }

  return { newXp, newRank: promoted ? eligibleRank ?? null : null, promoted };
}

async function getOperatorXp(operatorId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("operator_profiles").select("xp").eq("id", operatorId).maybeSingle();
  return data;
}
