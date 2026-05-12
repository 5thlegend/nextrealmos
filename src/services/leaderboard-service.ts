import { createSupabaseServer } from "@/lib/supabase/server";

export type LeaderboardRow = {
  operator_id: string;
  callsign: string;
  xp: number;
  rank_name: string | null;
  rank_index: number | null;
};

export async function getGlobalLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("leaderboard_global").select("*").limit(limit);
  return (data ?? []) as LeaderboardRow[];
}

export type RealmLeaderboardRow = {
  operator_id: string;
  callsign: string;
  realm_xp: number;
  global_rank: string | null;
  joined_at: string;
  last_active_at: string | null;
};

/**
 * Per-realm leaderboard. Sorted by realm-scoped XP descending so each realm
 * has its own ladder. Joined to operator_profiles + ranks for display.
 */
export async function getRealmLeaderboard(realmId: string, limit = 20): Promise<RealmLeaderboardRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("operator_realms")
    .select("operator_id, realm_xp, joined_at, last_active_at, operator_profiles(callsign, ranks(name))")
    .eq("realm_id", realmId)
    .order("realm_xp", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const op = row.operator_profiles as { callsign?: string; ranks?: { name?: string } | null } | null;
    return {
      operator_id: row.operator_id as string,
      callsign: op?.callsign ?? "(unknown)",
      realm_xp: (row.realm_xp as number) ?? 0,
      global_rank: op?.ranks?.name ?? null,
      joined_at: row.joined_at as string,
      last_active_at: (row.last_active_at as string | null) ?? null,
    };
  });
}
