import { notFound } from "next/navigation";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { getMission, getOperatorMissionProgress } from "@/services/mission-service";
import { getCurrentOperator } from "@/services/operator-service";
import { MissionActions } from "./mission-actions";

export default async function MissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mission, op] = await Promise.all([getMission(id), getCurrentOperator()]);
  if (!mission || !op) notFound();
  const progress = await getOperatorMissionProgress(op.profile.id);
  const mp = progress.find((p) => p.mission_id === mission.id);

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="nros-eyebrow">// mission · {mission.difficulty}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{mission.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge>+{mission.xp_reward} XP</Badge>
          {mission.tags.map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
          {mp?.state === "COMPLETED" && <Badge variant="accent">COMPLETED</Badge>}
        </div>
      </header>

      <Panel eyebrow="// briefing">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{mission.brief}</p>
      </Panel>

      <Panel eyebrow="// command">
        <MissionActions missionId={mission.id} state={mp?.state ?? null} />
      </Panel>
    </div>
  );
}
