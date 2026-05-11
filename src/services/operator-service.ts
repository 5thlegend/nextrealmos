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
