import Link from "next/link";
import { ArrowUpRight, Lock, Shield } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listArmoryEntries } from "@/services/monetization-service";
import { getCurrentOperator } from "@/services/operator-service";

export const runtime = "edge";

const RANK_ORDER = ["INITIATE", "OPERATOR", "VANGUARD", "ARCHITECT", "WARDEN", "SOVEREIGN"] as const;

function rankIndex(tier: string | null): number {
  if (!tier) return 0;
  return Math.max(0, RANK_ORDER.indexOf(tier as typeof RANK_ORDER[number]));
}

export default async function ArmoryPage() {
  const op = (await getCurrentOperator())!;
  const entries = await listArmoryEntries();

  const myRankIdx = rankIndex(op.rank?.tier ?? "INITIATE");

  const totalRevenue = entries.reduce((s, e) => s + (e.monthly_revenue_cents ?? 0), 0);
  const accessible = entries.filter((e) => rankIndex(e.unlock_rank_tier) <= myRankIdx).length;
  const locked = entries.length - accessible;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// money factory · restricted armory</p>
        <h1 className="text-2xl font-semibold tracking-tight">Armory</h1>
        <p className="text-sm text-muted-foreground">
          Rank-gated, deployable apps. Each entry is a sovereign realm with a real revenue path.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="// armory entries" value={entries.length} hint={`${accessible} unlocked · ${locked} locked`} />
        <Stat label="// your rank" value={op.rank?.tier ?? "INITIATE"} hint={op.rank?.name ?? "Initiate"} />
        <Stat
          label="// total revenue"
          value={totalRevenue > 0 ? `$${Math.round(totalRevenue / 100).toLocaleString()}/mo` : "—"}
          hint="across the armory"
        />
        <Stat label="// next unlock" value={RANK_ORDER[Math.min(myRankIdx + 1, RANK_ORDER.length - 1)]} hint="advance to access more" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map((e) => {
          const reqIdx = rankIndex(e.unlock_rank_tier);
          const accessible = reqIdx <= myRankIdx;
          return (
            <article
              key={e.realm_id}
              className={`nros-deck p-4 transition-all ${accessible ? "" : "opacity-70"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    /{e.realm_slug}
                  </p>
                  <h3 className="font-semibold mt-0.5">{e.realm_name}</h3>
                </div>
                {accessible ? (
                  <Badge variant="default">UNLOCKED</Badge>
                ) : (
                  <Badge variant="muted">
                    <Lock className="h-2.5 w-2.5" /> {e.unlock_rank_tier}
                  </Badge>
                )}
              </div>

              {e.realm_description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{e.realm_description}</p>
              )}
              {e.notes && (
                <p className="text-xs text-foreground/85 italic mb-3">{e.notes}</p>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {e.category && <Badge variant="muted">{e.category}</Badge>}
                  {e.monthly_revenue_cents > 0 && (
                    <span className="font-mono text-xs text-nros-warn">
                      ${Math.round(e.monthly_revenue_cents / 100).toLocaleString()}/mo
                    </span>
                  )}
                </div>
                {accessible && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/realms/${e.realm_slug}`}>
                      Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Panel eyebrow="// note">
        <p className="text-xs text-muted-foreground">
          Each armory entry corresponds to a sovereign realm. Unlocked entries open the realm&apos;s
          dossier; locked entries reveal as you ascend ranks. Revenue figures will tick up
          automatically once the Stripe ledger is wired in the next wave.
        </p>
      </Panel>
    </div>
  );
}
