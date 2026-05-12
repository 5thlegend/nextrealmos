import { createSupabaseServer } from "@/lib/supabase/server";
import type { OperatorProfile, Rank } from "@/types/nros";

/**
 * Loads the current authenticated operator profile (with rank). Returns null
 * if not signed in or profile not yet provisioned (edge case during onboarding).
 */
export async function getCurrentOperator(): Promise<{
  profile: OperatorProfile;
  rank: Rank | null;
  nextRank: Rank | null;
} | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("operator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: ranks } = await supabase.from("ranks").select("*").order("order_index");
  const list = (ranks ?? []) as Rank[];
  const current = list.find((r) => r.id === profile.rank_id) ?? list[0] ?? null;
  const next = current ? list.find((r) => r.order_index === current.order_index + 1) ?? null : null;

  return { profile: profile as OperatorProfile, rank: current, nextRank: next };
}

/**
 * Per-operator activity sparkline data — XP earned per day for the last N
 * days. Used by the public dossier and the dashboard to render a Steam-
 * style activity heatmap.
 */
export async function getOperatorActivity(operatorId: string, days = 30): Promise<Array<{ day: string; xp: number; events: number }>> {
  const { createSupabaseAdmin } = await import("@/lib/supabase/server");
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await admin
    .from("xp_logs")
    .select("delta, created_at")
    .eq("operator_id", operatorId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const map = new Map<string, { xp: number; events: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { xp: 0, events: 0 });
  }

  for (const r of ((rows ?? []) as Array<{ delta: number; created_at: string }>)) {
    const day = r.created_at.slice(0, 10);
    const cur = map.get(day);
    if (cur) {
      cur.xp += Math.max(0, r.delta);
      cur.events += 1;
    }
  }

  return Array.from(map.entries())
    .map(([day, v]) => ({ day, xp: v.xp, events: v.events }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export async function ensureOperatorProfile(callsign?: string) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("operator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: rank } = await supabase.from("ranks").select("id").eq("tier", "INITIATE").maybeSingle();
  const fallback = callsign ?? `OP-${user.id.slice(0, 6).toUpperCase()}`;
  const { data, error } = await supabase
    .from("operator_profiles")
    .insert({ user_id: user.id, callsign: fallback, rank_id: rank?.id ?? null, xp: 0 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
