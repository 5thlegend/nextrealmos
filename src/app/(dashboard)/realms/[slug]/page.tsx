import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Landmark } from "lucide-react";
import { getRealmBySlug } from "@/services/realm-service";
import { listTransmissions } from "@/services/transmission-service";
import { listWonders } from "@/services/wonder-service";
import { getRealmLeaderboard } from "@/services/leaderboard-service";
import { getCurrentOperator } from "@/services/operator-service";
import { relativeTime } from "@/lib/utils";
import { VaultControls } from "./vault-controls";

export const runtime = "edge";

export default async function RealmDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) notFound();

  const [feed, op, allWonders, leaderboard] = await Promise.all([
    listTransmissions({ realmId: realm.id, limit: 30 }),
    getCurrentOperator(),
    listWonders(),
    getRealmLeaderboard(realm.id, 12),
  ]);
  const wonders = allWonders.filter((w) => w.realm_id === realm.id);
  const isOwner = op?.profile.id === realm.owner_operator_id;
  const isVaulted = !!realm.vaulted_at;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="nros-eyebrow">// realm · /{realm.slug}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{realm.name}</h1>
        {realm.description && <p className="text-sm text-muted-foreground">{realm.description}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant={isVaulted ? "accent" : realm.status === "ACTIVE" ? "default" : "muted"}>
            {isVaulted ? "VAULTED" : realm.status}
          </Badge>
          {isOwner && <Badge variant="accent">YOU OWN THIS</Badge>}
          {wonders.length > 0 && <Badge variant="warn"><Landmark className="h-2.5 w-2.5" /> {wonders.length} wonder{wonders.length === 1 ? "" : "s"}</Badge>}
          {realm.base_url && (
            <a href={realm.base_url} target="_blank" rel="noreferrer" className="badge-outline text-primary hover:underline">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">↗ {new URL(realm.base_url).host}</span>
            </a>
          )}
          <Button asChild variant="ghost" size="sm" className="h-6 px-2">
            <Link href={`/realms/${realm.slug}`} target="_blank" rel="noreferrer">
              <span className="font-mono text-[10px]">public dossier</span> <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </Button>
        </div>
      </header>

      {isOwner && (
        <Panel eyebrow="// integration" title="Connect your realm">
          <p className="text-sm text-muted-foreground mb-3">Install the SDK and start pushing transmissions:</p>
          <pre className="nros-deck p-4 text-xs font-mono overflow-x-auto"><code>{`import { NrosClient } from "@nros/sdk";

const nros = new NrosClient({
  baseUrl: "${process.env.NEXT_PUBLIC_APP_URL ?? "https://nextrealmos.pages.dev"}",
  apiKey:  process.env.NROS_API_KEY!,
});

await nros.transmissions.push({
  kind: "MISSION_COMPLETED",
  event_name: "deployment.launch",
  title: "Operator shipped X",
  callsign: "OPERATOR_CALLSIGN",
});`}</code></pre>
        </Panel>
      )}

      {isOwner && (
        <Panel eyebrow="// governance" title={isVaulted ? "Vault" : "Vault controls"}>
          <VaultControls slug={realm.slug} vaulted={isVaulted} />
        </Panel>
      )}

      {wonders.length > 0 && (
        <Panel eyebrow={`// wonders · ${wonders.length}`} title="Federation marquee">
          <ul className="space-y-2">
            {wonders.map((w) => (
              <li
                key={w.id}
                className="rounded-md border bg-card/70 p-3 flex items-start gap-3"
                style={{ borderLeftColor: w.banner_color, borderLeftWidth: 3 }}
              >
                <Landmark className="h-4 w-4 shrink-0 mt-0.5" style={{ color: w.banner_color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.tagline}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] shrink-0" style={{ color: w.banner_color }}>
                  {w.era.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {leaderboard.length > 0 && (
        <Panel eyebrow={`// realm ladder · ${leaderboard.length}`} title="Top operators in this realm">
          <ol className="divide-y divide-border/40">
            {leaderboard.map((row, i) => (
              <li key={row.operator_id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                  <Link
                    href={`/operator/${encodeURIComponent(row.callsign)}`}
                    className="font-medium hover:text-primary truncate"
                  >
                    {row.callsign}
                  </Link>
                  {row.global_rank && <Badge variant="muted">{row.global_rank}</Badge>}
                </div>
                <span className="font-mono text-xs tabular-nums">{row.realm_xp.toLocaleString()} XP</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <Panel eyebrow={`// transmissions · ${feed.length}`} title="Realm activity">
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no transmissions yet — the realm has not pushed events</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {feed.map((tx) => {
              const t = tx as { id: string; title: string; body?: string | null; kind: string; event_name?: string | null; created_at: string };
              return (
                <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.body && <p className="text-xs text-muted-foreground mt-0.5">{t.body}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {t.event_name && <Badge>{t.event_name}</Badge>}
                    <Badge variant="muted">{t.kind}</Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(t.created_at)}</span>
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
