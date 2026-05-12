import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";

export type AchievementRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "MYTHIC";
export type CivilizationEra =
  | "ANCIENT" | "CLASSICAL" | "MEDIEVAL" | "RENAISSANCE"
  | "INDUSTRIAL" | "MODERN" | "INFORMATION" | "FUTURE";

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  xp_bonus: number;
  rarity: AchievementRarity;
  era: CivilizationEra;
  banner_color: string;
  order_index: number;
  secret: boolean;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  awarded_at: string | null;
}

export async function listAllAchievements(): Promise<Achievement[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("achievements")
    .select("id, code, name, description, icon, xp_bonus, rarity, era, banner_color, order_index, secret")
    .order("order_index", { ascending: true });
  return (data ?? []) as Achievement[];
}

export async function listOperatorAchievements(operatorId: string): Promise<AchievementWithStatus[]> {
  const supabase = await createSupabaseServer();
  const [{ data: all }, { data: unlocked }] = await Promise.all([
    supabase
      .from("achievements")
      .select("id, code, name, description, icon, xp_bonus, rarity, era, banner_color, order_index, secret")
      .order("order_index", { ascending: true }),
    supabase
      .from("operator_achievements")
      .select("achievement_id, awarded_at")
      .eq("operator_id", operatorId),
  ]);

  const unlockedMap = new Map(
    ((unlocked ?? []) as Array<{ achievement_id: string; awarded_at: string }>).map((r) => [
      r.achievement_id,
      r.awarded_at,
    ]),
  );

  return ((all ?? []) as Achievement[]).map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    awarded_at: unlockedMap.get(a.id) ?? null,
  }));
}

export async function listOperatorAchievementsByCallsign(callsign: string): Promise<{
  callsign: string;
  unlocked: AchievementWithStatus[];
  locked: AchievementWithStatus[];
} | null> {
  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("operator_profiles")
    .select("id, callsign")
    .ilike("callsign", callsign)
    .maybeSingle();
  if (!profile) return null;

  const all = await listOperatorAchievements(profile.id);
  return {
    callsign: profile.callsign,
    unlocked: all.filter((a) => a.unlocked),
    locked: all.filter((a) => !a.unlocked && !a.secret),
  };
}

/**
 * Force-evaluate achievements for an operator. Useful from server actions
 * (e.g. after a manual mission complete) since the DB triggers already do
 * this; this is a safety net + a way to trigger from non-trigger paths.
 */
export async function evaluateAchievements(operatorId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.rpc("nros_evaluate_achievements", { p_operator: operatorId });
}

/**
 * Returns the next 3 visible achievements an operator hasn't unlocked yet,
 * sorted by progression (lowest rarity first, then order_index). Drives
 * the "next unlock" hint on the dashboard so dopamine has a clear target.
 */
export async function getNextAchievements(operatorId: string, limit = 3): Promise<AchievementWithStatus[]> {
  const all = await listOperatorAchievements(operatorId);
  const RARITY_RANK: Record<AchievementRarity, number> = {
    COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, MYTHIC: 4,
  };
  return all
    .filter((a) => !a.unlocked && !a.secret)
    .sort((a, b) => {
      const r = RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
      if (r !== 0) return r;
      return a.order_index - b.order_index;
    })
    .slice(0, limit);
}

export async function getCivilizationProgress(operatorId: string): Promise<{
  unlocked: number;
  total: number;
  pct: number;
  byRarity: Record<AchievementRarity, { unlocked: number; total: number }>;
}> {
  const supabase = await createSupabaseServer();
  const { data: all } = await supabase.from("achievements").select("id, rarity, secret");
  const { data: mine } = await supabase
    .from("operator_achievements")
    .select("achievement_id")
    .eq("operator_id", operatorId);

  const list = (all ?? []) as Array<{ id: string; rarity: AchievementRarity; secret: boolean }>;
  const visible = list.filter((a) => !a.secret);
  const mineSet = new Set(((mine ?? []) as Array<{ achievement_id: string }>).map((m) => m.achievement_id));

  const byRarity = {
    COMMON:   { unlocked: 0, total: 0 },
    UNCOMMON: { unlocked: 0, total: 0 },
    RARE:     { unlocked: 0, total: 0 },
    EPIC:     { unlocked: 0, total: 0 },
    MYTHIC:   { unlocked: 0, total: 0 },
  } as Record<AchievementRarity, { unlocked: number; total: number }>;

  for (const a of visible) {
    byRarity[a.rarity].total += 1;
    if (mineSet.has(a.id)) byRarity[a.rarity].unlocked += 1;
  }

  const unlocked = visible.filter((a) => mineSet.has(a.id)).length;
  const total = visible.length || 1;
  return { unlocked, total, pct: Math.round((unlocked / total) * 100), byRarity };
}
