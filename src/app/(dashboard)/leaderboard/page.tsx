import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { getGlobalLeaderboard } from "@/services/leaderboard-service";
import { getCurrentOperator } from "@/services/operator-service";
import { formatXp } from "@/lib/utils";

export default async function LeaderboardPage() {
  const [board, op] = await Promise.all([getGlobalLeaderboard(100), getCurrentOperator()]);

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// global ladder</p>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Top 100 operators ranked by total XP.</p>
      </header>

      <Panel eyebrow={`// ${board.length} operators`}>
        <ol className="divide-y divide-border/40">
          {board.map((row, i) => {
            const isYou = op?.profile.id === row.operator_id;
            return (
              <li
                key={row.operator_id}
                className={`flex items-center justify-between py-2 px-1 -mx-1 rounded ${
                  isYou ? "bg-primary/5 ring-1 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-8">#{i + 1}</span>
                  <span className="font-medium">{row.callsign}</span>
                  {row.rank_name && <Badge variant="muted">{row.rank_name}</Badge>}
                  {isYou && <Badge variant="accent">YOU</Badge>}
                </div>
                <span className="font-mono text-xs">{formatXp(row.xp)} XP</span>
              </li>
            );
          })}
          {board.length === 0 && <li className="py-6 text-sm text-muted-foreground">// no operators ranked</li>}
        </ol>
      </Panel>
    </div>
  );
}
