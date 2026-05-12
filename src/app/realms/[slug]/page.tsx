import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Landmark, RadioTower, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";
import { createSupabaseServer } from "@/lib/supabase/server";
import { listTransmissions } from "@/services/transmission-service";
import { listWonders } from "@/services/wonder-service";
import { getRealmLeaderboard } from "@/services/leaderboard-service";

export const runtime = "edge";
export const revalidate = 30;

interface RealmRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_url: string | null;
  icon_url: string | null;
  status: string;
  vaulted_at: string | null;
  created_at: string;
}

export default async function PublicRealmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: realm } = await supabase
    .from("realms")
    .select("id, slug, name, description, base_url, icon_url, status, vaulted_at, created_at")
    .ilike("slug", slug)
    .maybeSingle();

  if (!realm) notFound();
  const r = realm as RealmRow;

  const [{ count: operatorCount }, transmissions, allWonders, leaderboard] = await Promise.all([
    supabase.from("operator_realms").select("operator_id", { count: "exact", head: true }).eq("realm_id", r.id),
    listTransmissions({ limit: 20, realmId: r.id }),
    listWonders(),
    getRealmLeaderboard(r.id, 12),
  ]);

  const wonders = allWonders.filter((w) => w.realm_id === r.id);
  const isVault = !!r.vaulted_at;
  const isLive  = !isVault && !!r.base_url;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nros-scanlines opacity-25" />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6 border-b border-border/40">
        <Link href="/civilization" className="font-mono text-xs tracking-[0.24em] uppercase hover:text-primary">
          ← civilization
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in?next=/grid">Sign in</Link>
          </Button>
          {isLive && (
            <Button asChild size="sm">
              <a href={r.base_url!} target="_blank" rel="noreferrer">
                Open realm <ArrowUpRight className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </header>

      <section
        className="relative z-10 border-b border-border/40"
        style={{
          backgroundImage: "radial-gradient(900px 400px at 0% 0%, hsla(178, 92%, 56%, 0.10), transparent 60%)",
        }}
      >
        <div className="px-6 lg:px-10 py-10 max-w-6xl mx-auto">
          <p className="nros-eyebrow">// realm dossier</p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{r.name}</h1>
            {isVault ? <Badge variant="accent">VAULTED</Badge> : isLive ? <Badge>LIVE</Badge> : <Badge variant="muted">IN DEVELOPMENT</Badge>}
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1">/{r.slug}</p>
          {r.description && <p className="mt-4 text-sm text-muted-foreground max-w-2xl">{r.description}</p>}
        </div>
      </section>

      <section className="relative z-10 px-6 lg:px-10 py-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="// operators" value={operatorCount ?? 0} hint="enlisted in this realm" />
          <Stat label="// wonders"   value={wonders.length} hint="federation marquee" trend={wonders.length > 0 ? "up" : "flat"} />
          <Stat label="// tx · live" value={transmissions.length} hint="recent events" />
          <Stat label="// since"     value={new Date(r.created_at).getFullYear()} hint="year of attach" />
        </div>

        {wonders.length > 0 && (
          <Panel eyebrow={`// wonders · ${wonders.length}`} title="Federation marquee builds">
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
                    {w.effect && <p className="text-xs italic mt-1" style={{ color: w.banner_color }}>{w.effect}</p>}
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

        <Panel
          eyebrow={`// transmissions · realm feed`}
          title="Recent activity"
          scanlines
          action={<RadioTower className="h-4 w-4 text-primary" />}
        >
          {transmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">// no recent transmissions from this realm.</p>
          ) : (
            <GalaxyTicker transmissions={transmissions as Array<Record<string, unknown>>} />
          )}
        </Panel>

        {!isLive && !isVault && (
          <Panel eyebrow="// status" title="In development">
            <p className="text-sm text-muted-foreground">
              This realm is registered in the federation but hasn&apos;t deployed a public surface yet.
              Check back later — or if you&apos;re the realm owner, sign in and add a base URL.
            </p>
          </Panel>
        )}

        {isVault && (
          <Panel eyebrow="// status" title="Vaulted">
            <p className="text-sm text-muted-foreground">
              This realm has been sent to the vault. Records preserved; deploy frozen. Recovery is a governance decision.
            </p>
          </Panel>
        )}
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 text-xs font-mono text-muted-foreground flex items-center justify-between">
        <span>// federation kernel v3</span>
        <Link href="/civilization" className="hover:text-primary">← back to civilization</Link>
      </footer>
    </main>
  );
}
