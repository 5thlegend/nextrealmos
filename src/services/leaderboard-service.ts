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
