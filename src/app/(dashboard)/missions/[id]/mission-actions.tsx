"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptMissionAction, completeMissionAction } from "./actions";
import type { MissionProgressState } from "@/types/nros";

export function MissionActions({ missionId, state }: { missionId: string; state: MissionProgressState | null }) {
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      try {
        await acceptMissionAction(missionId);
        toast.success("Mission accepted");
      } catch (e: any) {
        toast.error(e?.message ?? "Could not accept");
      }
    });
  }

  function complete() {
    startTransition(async () => {
      try {
        const r = await completeMissionAction(missionId);
        toast.success(r.promoted ? `Promoted → ${r.newRank?.name}` : `+XP awarded — total ${r.newXp}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not complete");
      }
    });
  }

  if (state === "COMPLETED") {
    return <p className="text-sm text-muted-foreground">// mission archived in your operator log</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {!state && <Button onClick={accept} disabled={pending}>Accept mission</Button>}
      {state && <Button onClick={complete} disabled={pending}>Mark complete</Button>}
      {state && <Button variant="outline" onClick={accept} disabled={pending}>Re-affirm</Button>}
    </div>
  );
}
