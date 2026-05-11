import { createSupabaseServer } from "@/lib/supabase/server";
import { awardXp } from "./xp-service";
import type { Mission, MissionProgress } from "@/types/nros";

export async function listActiveMissions(): Promise<Mission[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("missions").select("*").eq("status", "ACTIVE").order("difficulty");
  return (data ?? []) as Mission[];
}

export async function getMission(id: string): Promise<Mission | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("missions").select("*").eq("id", id).maybeSingle();
  return (data as Mission) ?? null;
}

export async function getOperatorMissionProgress(operatorId: string): Promise<MissionProgress[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("mission_progress")
    .select("*")
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false });
  return (data ?? []) as MissionProgress[];
}

export async function acceptMission(operatorId: string, missionId: string) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("mission_progress").upsert(
    {
      operator_id: operatorId,
      mission_id: missionId,
      state: "ACCEPTED",
      progress_pct: 0,
    },
    { onConflict: "mission_id,operator_id" },
  );
  if (error) throw error;
}

export async function completeMission(operatorId: string, missionId: string) {
  const supabase = await createSupabaseServer();
  const mission = await getMission(missionId);
  if (!mission) throw new Error("Mission not found");

  const { error } = await supabase
    .from("mission_progress")
    .update({ state: "COMPLETED", progress_pct: 100, completed_at: new Date().toISOString() })
    .eq("operator_id", operatorId)
    .eq("mission_id", missionId);
  if (error) throw error;

  return awardXp({
    operatorId,
    delta: mission.xp_reward,
    reason: `Mission completed: ${mission.title}`,
    sourceType: "MISSION",
    sourceId: missionId,
  });
}
