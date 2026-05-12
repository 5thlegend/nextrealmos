import Link from "next/link";
import { ArrowRight, Award, Brain, ScrollText, Workflow } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { RankBar } from "@/components/nros/rank-bar";
import { AchievementCard } from "@/components/nros/achievement-card";
import { MissionRowActions } from "@/components/nros/mission-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentOperator } from "@/services/operator-service";
import { listActiveMissions, getOperatorMissionProgress } from "@/services/mission-service";
import { listWorkflows } from "@/services/workflow-service";
import { getGlobalLeaderboard } from "@/services/leaderboard-service";
import { getCivilizationProgress, listOperatorAchievements, getNextAchievements } from "@/services/achievement-service";
import { formatXp } from "@/lib/utils";

export const runtime = "edge";

const DIFF_COLOR: Record<string, string> = {
  T1: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  T2: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  T3: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  T4: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  T5: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export default async function DashboardPage() {
  const op = (await getCurrentOperator())!;
  const [missions, progress, workflows, board, civProgress, achievements, nextUnlocks] = await Promise.all([
    listActiveMissions(),
    getOperatorMissionProgress(op.profile.id),
    listWorkflows(op.profile.id),
    getGlobalLeaderboard(10),
    getCivilizationProgress(op.profile.id),
    listOperatorAchievements(op.profile.id),
    getNextAchievements(op.profile.id, 3),
  ]);

  const completed = progress.filter((p) => p.state === "COMPLETED").length;
  const inFlight = progress.filter((p) => p.state !== "COMPLETED").length;
  const myRank = board.findIndex((r) => r.operator_id === op.profile.id);

  // Mission rotation: surface in-flight first, then top un-accepted
  const stateByMission = new Map(progress.map((p) => [p.mission_id, p]));
  const inFlightMissions = missions.filter((m) => {
    const p = stateByMission.get(m.id);
    return p && p.state !== "COMPLETED";
  });
  const openMissions = missions.filter((m) => !stateByMission.has(m.id));
  const queue = [...inFlightMissions, ...openMissions].slice(0, 4);

  // Recent achievement cards (max 3)
  const recentAchievements = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.awarded_at ?? "").localeCompare(a.awarded_at ?? ""))
    .slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="// xp" value={formatXp(op.profile.xp)} hint={op.rank?.name ?? "Initiate"} trend="up" />
        <Stat label="// missions" value={completed} hint={`${inFlight} in flight`} />
        <Stat
          label="// streak"
          value={`${op.profile.current_streak_days ?? 0}d`}
          hint={`best · ${op.profile.longest_streak_days ?? 0}d`}
          trend={(op.profile.current_streak_days ?? 0) > 0 ? "up" : "flat"}
        />
        <Stat
          label="// civilization"
          value={`${civProgress.pct}%`}
          hint={`${civProgress.unlocked}/${civProgress.total}`}
          trend={civProgress.pct > 0 ? "up" : "flat"}
        />
        <Stat label="// board" value={myRank >= 0 ? `#${myRank + 1}` : "—"} hint="global top 10" />
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
            {queue.map((m) => {
              const mp = stateByMission.get(m.id);
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-none last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/missions/${m.id}`} className="font-medium hover:text-primary">{m.title}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.brief}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${DIFF_COLOR[m.difficulty] ?? ""}`}>
                        {m.difficulty}
                      </span>
                      <Badge>+{m.xp_reward} XP</Badge>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <MissionRowActions missionId={m.id} state={mp?.state ?? null} xpReward={m.xp_reward} />
                  </div>
                </li>
              );
            })}
            {queue.length === 0 && <li className="text-sm text-muted-foreground">// no active missions</li>}
          </ul>
        </Panel>

        <Panel
          eyebrow="// civilization marks"
          title={recentAchievements.length > 0 ? "Recent achievements" : "Next unlocks"}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/achievements"><Award className="h-3 w-3" /> Trophy hall</Link>
            </Button>
          }
        >
          {recentAchievements.length === 0 && nextUnlocks.length === 0 ? (
            <div className="text-sm space-y-3">
              <p className="text-muted-foreground">All visible achievements unlocked. Hidden ones await discovery.</p>
              <Button asChild size="sm">
                <Link href="/achievements">View tech tree <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {recentAchievements.length > 0
                ? recentAchievements.map((a) => <AchievementCard key={a.id} a={a} compact />)
                : nextUnlocks.map((a) => <AchievementCard key={a.id} a={a} compact />)}
              {recentAchievements.length > 0 && nextUnlocks[0] && (
                <div className="border-t border-border/40 pt-2 mt-1">
                  <p className="nros-eyebrow mb-2">// next unlock target</p>
                  <AchievementCard a={nextUnlocks[0]} compact />
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Panel eyebrow="// global ladder" title="Top operators"
          action={<Button asChild variant="outline" size="sm"><Link href="/leaderboard">Full ladder</Link></Button>}
        >
          <ol className="divide-y divide-border/40">
            {board.slice(0, 8).map((row, i) => (
              <li key={row.operator_id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-6">#{i + 1}</span>
                  <Link
                    href={`/operator/${encodeURIComponent(row.callsign)}`}
                    className="font-medium hover:text-primary"
                  >
                    {row.callsign}
                  </Link>
                  {row.rank_name && <Badge variant="muted">{row.rank_name}</Badge>}
                </div>
                <span className="font-mono text-xs">{formatXp(row.xp)} XP</span>
              </li>
            ))}
            {board.length === 0 && <li className="py-4 text-sm text-muted-foreground">// ladder unfilled</li>}
          </ol>
        </Panel>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
        <Link href="/achievements" className="nros-deck p-4 hover:border-primary/50 transition-colors">
          <Award className="h-5 w-5 text-primary" />
          <p className="mt-3 font-medium">Trophy hall</p>
          <p className="text-xs text-muted-foreground">Civilization marks. Mythic to common.</p>
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
