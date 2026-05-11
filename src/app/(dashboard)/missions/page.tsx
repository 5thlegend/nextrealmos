import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { listActiveMissions, getOperatorMissionProgress } from "@/services/mission-service";
import { getCurrentOperator } from "@/services/operator-service";

export default async function MissionsPage() {
  const op = (await getCurrentOperator())!;
  const [missions, progress] = await Promise.all([
    listActiveMissions(),
    getOperatorMissionProgress(op.profile.id),
  ]);
  const stateByMission = new Map(progress.map((p) => [p.mission_id, p]));

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// objectives</p>
        <h1 className="text-2xl font-semibold tracking-tight">Mission queue</h1>
        <p className="text-sm text-muted-foreground">Accept missions to earn XP and ascend ranks.</p>
      </header>

      <Panel eyebrow={`// active · ${missions.length}`}>
        <ul className="divide-y divide-border/40">
          {missions.map((m) => {
            const mp = stateByMission.get(m.id);
            return (
              <li key={m.id} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/missions/${m.id}`} className="font-medium hover:text-primary">{m.title}</Link>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.brief}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.tags.map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="muted">{m.difficulty}</Badge>
                  <Badge>+{m.xp_reward} XP</Badge>
                  {mp?.state === "COMPLETED" && <Badge variant="accent">DONE</Badge>}
                  {mp?.state === "ACCEPTED" && <Badge variant="warn">ACCEPTED</Badge>}
                </div>
              </li>
            );
          })}
          {missions.length === 0 && <li className="py-6 text-sm text-muted-foreground">// no active missions</li>}
        </ul>
      </Panel>
    </div>
  );
}
