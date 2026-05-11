import Link from "next/link";
import { ArrowRight, Brain, ScrollText, Workflow } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { RankBar } from "@/components/nros/rank-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentOperator } from "@/services/operator-service";
import { listActiveMissions, getOperatorMissionProgress } from "@/services/mission-service";
import { listWorkflows } from "@/services/workflow-service";
import { getGlobalLeaderboard } from "@/services/leaderboard-service";
import { formatXp } from "@/lib/utils";

export default async function DashboardPage() {
  const op = (await getCurrentOperator())!;
  const [missions, progress, workflows, board] = await Promise.all([
    listActiveMissions(),
    getOperatorMissionProgress(op.profile.id),
    listWorkflows(op.profile.id),
    getGlobalLeaderboard(10),
  ]);

  const completed = progress.filter((p) => p.state === "COMPLETED").length;
  const inFlight = progress.filter((p) => p.state !== "COMPLETED").length;
  const myRank = board.findIndex((r) => r.operator_id === op.profile.id);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="// xp" value={formatXp(op.profile.xp)} hint={op.rank?.name ?? "Initiate"} trend="up" />
        <Stat label="// missions complete" value={completed} hint={`${inFlight} in flight`} />
        <Stat label="// workflows" value={workflows.length} hint="OBLISK forged" />
        <Stat label="// board position" value={myRank >= 0 ? `#${myRank + 1}` : "—"} hint="global top 10" />
      </div>

      <Panel eyebrow="// progression" title="Rank trajectory" scanlines>
        <RankBar
          xp={op.profile.xp}
          currentRank={op.rank?.name ?? "Initiate"}
          nextRank={op.nextRank?.name ?? null}
          nextRankXp={op.nextRank?.min_xp ?? null}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          eyebrow="// active missions"
          title="Mission queue"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/missions">All missions <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          }
        >
          <ul className="space-y-3">
            {missions.slice(0, 4).map((m) => {
              const mp = progress.find((p) => p.mission_id === m.id);
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-none last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/missions/${m.id}`} className="font-medium hover:text-primary">{m.title}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.brief}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="muted">{m.difficulty}</Badge>
                    <Badge>+{m.xp_reward} XP</Badge>
                    {mp?.state === "COMPLETED" && <Badge variant="accent">DONE</Badge>}
                  </div>
                </li>
              );
            })}
            {missions.length === 0 && <li className="text-sm text-muted-foreground">// no active missions</li>}
          </ul>
        </Panel>

        <Panel
          eyebrow="// oblisk"
          title="Workflows"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/workflows"><Workflow className="h-3 w-3" /> Forge</Link>
            </Button>
          }
        >
          {workflows.length === 0 ? (
            <div className="text-sm space-y-3">
              <p className="text-muted-foreground">No workflows yet. Decompose your first objective.</p>
              <Button asChild size="sm">
                <Link href="/workflows/new">New workflow <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {workflows.slice(0, 5).map((w) => (
                <li key={w.id}>
                  <Link href={`/workflows/${w.id}`} className="flex items-start justify-between gap-3 hover:text-primary">
                    <span className="font-medium truncate">{w.title}</span>
                    <Badge variant="muted">{w.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel eyebrow="// global ladder" title="Top operators"
        action={<Button asChild variant="outline" size="sm"><Link href="/leaderboard">Full ladder</Link></Button>}
      >
        <ol className="divide-y divide-border/40">
          {board.map((row, i) => (
            <li key={row.operator_id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground w-6">#{i + 1}</span>
                <span className="font-medium">{row.callsign}</span>
                {row.rank_name && <Badge variant="muted">{row.rank_name}</Badge>}
              </div>
              <span className="font-mono text-xs">{formatXp(row.xp)} XP</span>
            </li>
          ))}
          {board.length === 0 && <li className="py-4 text-sm text-muted-foreground">// ladder unfilled</li>}
        </ol>
      </Panel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/missions" className="nros-deck p-4 hover:border-primary/50 transition-colors">
          <ScrollText className="h-5 w-5 text-primary" />
          <p className="mt-3 font-medium">Missions</p>
          <p className="text-xs text-muted-foreground">Accept objectives, earn XP, climb ranks.</p>
        </Link>
        <Link href="/workflows/new" className="nros-deck p-4 hover:border-primary/50 transition-colors">
          <Workflow className="h-5 w-5 text-primary" />
          <p className="mt-3 font-medium">Forge a Workflow</p>
          <p className="text-xs text-muted-foreground">Decompose an objective with OBLISK.</p>
        </Link>
        <Link href="/squads" className="nros-deck p-4 hover:border-primary/50 transition-colors">
          <Brain className="h-5 w-5 text-primary" />
          <p className="mt-3 font-medium">Squads</p>
          <p className="text-xs text-muted-foreground">Recruit, federate, dominate boards.</p>
        </Link>
      </div>
    </div>
  );
}
