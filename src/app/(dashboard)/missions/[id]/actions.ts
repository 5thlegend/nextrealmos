"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOperator } from "@/services/operator-service";
import { acceptMission, completeMission } from "@/services/mission-service";

export async function acceptMissionAction(missionId: string) {
  const op = await getCurrentOperator();
  if (!op) throw new Error("Not authenticated");
  await acceptMission(op.profile.id, missionId);
  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  revalidatePath("/dashboard");
}

export async function completeMissionAction(missionId: string) {
  const op = await getCurrentOperator();
  if (!op) throw new Error("Not authenticated");
  const result = await completeMission(op.profile.id, missionId);
  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  revalidatePath("/dashboard");
  return result;
}
