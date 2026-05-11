import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { RankBar } from "@/components/nros/rank-bar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentOperator } from "@/services/operator-service";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatXp, relativeTime } from "@/lib/utils";

export default async function OperatorPage() {
  const op = (await getCurrentOperator())!;
  const supabase = await createSupabaseServer();

  const [{ data: xpLogs }, { data: missions }, { data: workflows }] = await Promise.all([
    supabase.from("xp_logs").select("*").eq("operator_id", op.profile.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("mission_progress").select("*, missions(title)").eq("operator_id", op.profile.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("workflows").select("id, title, status, updated_at").eq("operator_id", op.profile.id).order("updated_at", { ascending: false }).limit(8),
  ]);

  const initials = op.profile.callsign.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex items-center gap-4">
        <Avatar className="h-16 w-16"><AvatarFallback className="text-lg">{initials}</AvatarFallback></Avatar>
        <div>
          <p className="nros-eyebrow">// operator</p>
          <h1 className="text-3xl font-semibold tracking-tight">{op.profile.callsign}</h1>
          <div className="flex flex-wrap gap-2 mt-1">
            {op.rank && <Badge>{op.rank.name}</Badge>}
            <Badge variant="muted">{formatXp(op.profile.xp)} XP</Badge>
          </div>
        </div>
      </header>

      <Panel eyebrow="// progression">
        <RankBar
          xp={op.profile.xp}
          currentRank={op.rank?.name ?? "Initiate"}
          nextRank={op.nextRank?.name ?? null}
          nextRankXp={op.nextRank?.min_xp ?? null}
        />
      </Panel>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="// xp logs" value={xpLogs?.length ?? 0} hint="last 20" />
        <Stat label="// mission engagements" value={missions?.length ?? 0} hint="last 8" />
        <Stat label="// workflows" value={workflows?.length ?? 0} hint="forged" />
      </div>

      <Panel eyebrow="// xp ledger" title="Recent XP">
        <ul className="divide-y divide-border/40">
          {(xpLogs ?? []).map((l: any) => (
            <li key={l.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">{l.reason}</p>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  {l.source_type} · {relativeTime(l.created_at)}
                </p>
              </div>
              <span className={`font-mono text-sm ${l.delta >= 0 ? "text-primary" : "text-destructive"}`}>
                {l.delta >= 0 ? "+" : ""}{l.delta}
              </span>
            </li>
          ))}
          {(xpLogs ?? []).length === 0 && <li className="py-4 text-sm text-muted-foreground">// no XP movements yet</li>}
        </ul>
      </Panel>
    </div>
  );
}
