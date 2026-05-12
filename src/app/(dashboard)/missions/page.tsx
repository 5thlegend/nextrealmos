import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { Badge } from "@/components/ui/badge";
import { MissionRowActions } from "@/components/nros/mission-row-actions";
import { listActiveMissions, getOperatorMissionProgress } from "@/services/mission-service";
import { getCurrentOperator } from "@/services/operator-service";

export const runtime = "edge";

const DIFF_COLOR: Record<string, string> = {
  T1: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  T2: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  T3: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  T4: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  T5: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export default async function MissionsPage() {
  const op = (await getCurrentOperator())!;
  const [missions, progress] = await Promise.all([
    listActiveMissions(),
    getOperatorMissionProgress(op.profile.id),
  ]);
  const stateByMission = new Map(progress.map((p) => [p.mission_id, p]));

  const accepted  = progress.filter((p) => p.state === "ACCEPTED" || p.state === "IN_PROGRESS").length;
  const completed = progress.filter((p) => p.state === "COMPLETED").length;
  const earned    = progress.filter((p) => p.state === "COMPLETED")
    .reduce((sum, p) => sum + (missions.find((m) => m.id === p.mission_id)?.xp_reward ?? 0), 0);
  const available = missions.filter((m) => !stateByMission.has(m.id)).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// objectives · accept · complete · ascend</p>
        <h1 className="text-2xl font-semibold tracking-tight">Mission queue</h1>
        <p className="text-sm text-muted-foreground">One-click accept, one-click complete. XP fires the moment you mark done.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="// available"  value={available} hint="ready to accept" />
        <Stat label="// in flight"  value={accepted}  hint="accepted, not done" trend={accepted > 0 ? "up" : "flat"} />
        <Stat label="// completed"  value={completed} hint="all-time" />
        <Stat label="// xp earned"  value={earned.toLocaleString()} hint="from missions" trend="up" />
      </div>

      {accepted > 0 && (
        <Panel eyebrow={`// in flight · ${accepted}`} title="Your active missions" scanlines>
          <ul className="divide-y divide-border/40">
            {missions
              .filter((m) => {
                const p = stateByMission.get(m.id);
                return p && p.state !== "COMPLETED";
              })
              .map((m) => {
                const mp = stateByMission.get(m.id);
                return <MissionListItem key={m.id} m={m} state={mp?.state ?? null} />;
              })}
          </ul>
        </Panel>
      )}

      <Panel eyebrow={`// available · ${available}`} title="Open contracts">
        <ul className="divide-y divide-border/40">
          {missions
            .filter((m) => !stateByMission.has(m.id))
            .map((m) => <MissionListItem key={m.id} m={m} state={null} />)}
          {available === 0 && (
            <li className="py-6 text-sm text-muted-foreground">// nothing open. accept everything? respect.</li>
          )}
        </ul>
      </Panel>

      {completed > 0 && (
        <Panel eyebrow={`// archive · ${completed}`} title="Completed missions">
          <ul className="divide-y divide-border/40">
            {missions
              .filter((m) => stateByMission.get(m.id)?.state === "COMPLETED")
              .slice(0, 12)
              .map((m) => <MissionListItem key={m.id} m={m} state="COMPLETED" />)}
          </ul>
        </Panel>
      )}

      {missions.length === 0 && (
        <Panel eyebrow="// no active missions">
          <p className="text-sm text-muted-foreground">No missions published yet. Founders will seed the next batch shortly.</p>
        </Panel>
      )}
    </div>
  );
}

function MissionListItem({
  m,
  state,
}: {
  m: { id: string; title: string; brief: string; difficulty: string; xp_reward: number; tags: string[] };
  state: import("@/types/nros").MissionProgressState | null;
}) {
  return (
    <li className="py-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Link href={`/missions/${m.id}`} className="font-medium hover:text-primary">
          {m.title}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.brief}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${DIFF_COLOR[m.difficulty] ?? ""}`}>
            {m.difficulty}
          </span>
          <Badge>+{m.xp_reward} XP</Badge>
          {m.tags.slice(0, 3).map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">
        <MissionRowActions missionId={m.id} state={state} xpReward={m.xp_reward} />
      </div>
    </li>
  );
}
