"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acceptMissionAction, completeMissionAction } from "@/app/(dashboard)/missions/[id]/actions";
import type { MissionProgressState } from "@/types/nros";

/**
 * Inline mission row actions used on the missions list + dashboard
 * mission queue. Accepts/completes without leaving the page.
 *
 * Long-session ergonomics: one-click accept, one-click complete, immediate
 * toast confirmation, no modal.
 */
export function MissionRowActions({
  missionId,
  state,
  xpReward,
}: {
  missionId: string;
  state: MissionProgressState | null;
  xpReward: number;
}) {
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      try {
        await acceptMissionAction(missionId);
        toast.success("Mission accepted", { description: `+${xpReward} XP on completion` });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not accept");
      }
    });
  }

  function complete() {
    startTransition(async () => {
      try {
        const r = await completeMissionAction(missionId);
        if (r.promoted && r.newRank) {
          toast.success(`Promoted → ${r.newRank.name}`, { description: `Total ${r.newXp.toLocaleString()} XP` });
        } else {
          toast.success(`+${xpReward} XP`, { description: `Total ${r.newXp.toLocaleString()} XP` });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not complete");
      }
    });
  }

  if (state === "COMPLETED") {
    return <Badge variant="accent">DONE</Badge>;
  }

  if (state === "ACCEPTED" || state === "IN_PROGRESS") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="warn">ACCEPTED</Badge>
        <Button size="sm" onClick={complete} disabled={pending} className="h-7">
          <Check className="h-3 w-3" />
          <span>Complete</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={accept} disabled={pending} className="h-7">
        <Plus className="h-3 w-3" />
        <span>Accept</span>
      </Button>
      <Button asChild size="sm" variant="ghost" className="h-7">
        <Link href={`/missions/${missionId}`}>Brief</Link>
      </Button>
    </div>
  );
}
