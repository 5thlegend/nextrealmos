"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatXp } from "@/lib/utils";

export function RankBar({
  xp,
  currentRank,
  nextRank,
  nextRankXp,
  className,
}: {
  xp: number;
  currentRank: string;
  nextRank: string | null;
  nextRankXp: number | null;
  className?: string;
}) {
  const pct = nextRankXp ? Math.min(100, Math.round((xp / nextRankXp) * 100)) : 100;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{currentRank}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {formatXp(xp)} XP {nextRank ? `/ ${formatXp(nextRankXp ?? 0)} → ${nextRank}` : "/ MAX"}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
