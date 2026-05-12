import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Plus } from "lucide-react";
import { listRealms, listOperatorRealms } from "@/services/realm-service";
import { getCurrentOperator } from "@/services/operator-service";
import { relativeTime } from "@/lib/utils";

export const runtime = "edge";

export default async function RealmsPage() {
  const op = (await getCurrentOperator())!;
  const [allRealms, mine] = await Promise.all([listRealms(), listOperatorRealms(op.profile.id)]);
  const ownedIds = new Set(allRealms.filter((r) => r.owner_operator_id === op.profile.id).map((r) => r.id));

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="nros-eyebrow">// federation</p>
          <h1 className="text-2xl font-semibold tracking-tight">Realms</h1>
          <p className="text-sm text-muted-foreground">Sovereign operator worlds connected to NROS.</p>
        </div>
        <Button asChild><Link href="/realms/new"><Plus className="h-4 w-4" /> Register Realm</Link></Button>
      </header>

      <Panel eyebrow={`// active · ${allRealms.filter((r) => r.status === "ACTIVE").length}`} title="The federation">
        {allRealms.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no realms registered yet — be the first signal</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {allRealms.map((r) => {
              const owned = ownedIds.has(r.id);
              return (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <Link href={`/realms/${r.slug}`} className="min-w-0 hover:text-primary">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="font-medium">{r.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">/{r.slug}</span>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 ml-6">{r.description}</p>}
                  </Link>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={r.status === "ACTIVE" ? "default" : "muted"}>{r.status}</Badge>
                    {owned && (
                      <Link href={`/realms/${r.slug}/admin`} className="text-[10px]">
                        <Badge variant="accent">YOURS · ADMIN →</Badge>
                      </Link>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(r.created_at)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel eyebrow={`// your memberships · ${mine.length}`} title="Realms you're active in">
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no realm memberships — you'll appear here when a realm reports activity for your callsign</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {mine.map((m) => {
              const row = m as { realm_id: string; realm_xp?: number; last_active_at?: string | null; realms?: { name?: string; slug?: string } | null };
              return (
                <li key={row.realm_id} className="py-2 flex items-center justify-between">
                  <Link
                    href={row.realms?.slug ? `/realms/${row.realms.slug}` : "#"}
                    className="font-medium hover:text-primary"
                  >
                    {row.realms?.name ?? row.realm_id}
                  </Link>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-muted-foreground">{row.realm_xp ?? 0} realm XP</span>
                    {row.last_active_at && <span className="text-muted-foreground">{relativeTime(row.last_active_at)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
