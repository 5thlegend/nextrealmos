import Link from "next/link";
import { ArrowUpRight, Activity, Users, Zap, Landmark, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { WondersStrip } from "@/components/nros/wonders-strip";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";
import { OperatorSearch } from "@/components/nros/operator-search";
import { FederationPulsePanel } from "@/components/nros/federation-pulse-panel";
import { getFederationPulse } from "@/services/analytics-service";
import { listPublicRealms } from "@/services/realm-service";
import { listTransmissions } from "@/services/transmission-service";
import { getCivilizationOverview } from "@/services/civilization-service";
import { listWonders } from "@/services/wonder-service";

export const runtime = "edge";
export const revalidate = 30;

/**
 * Public civilization view. The "galaxy view" — anyone can see the federation
 * without signing in. /grid stays as the authenticated governance surface.
 */
export default async function CivilizationPage() {
  const [realms, transmissions, overview, wonders, pulse] = await Promise.all([
    listPublicRealms({ includeVaulted: true }),
    listTransmissions({ limit: 20 }),
    getCivilizationOverview(),
    listWonders(),
    getFederationPulse(),
  ]);

  const active  = realms.filter((r) => r.status === "ACTIVE" && !r.vaulted_at);
  const vaulted = realms.filter((r) => r.vaulted_at);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nros-scanlines opacity-25" />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-mono text-sm tracking-[0.24em] uppercase hover:text-primary">
            NROS
          </Link>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            // civilization · public view
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in?next=/grid">Sign in for governance</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-in?next=/operator/onboarding">Enlist</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 px-6 lg:px-10 py-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="nros-eyebrow">// civilization · v3</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-1">
              The federation, live.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Every realm. Every wonder. Every transmission as it lands. Sign in to govern; this view is for everyone.
            </p>
          </div>
          <OperatorSearch className="w-full md:w-72 shrink-0" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="// realms" value={active.length} hint={`${vaulted.length} vaulted`} />
          <Stat label="// operators" value={overview?.total_operators ?? 0} hint="enlisted" />
          <Stat label="// wonders" value={wonders.length} hint="permanent builds" trend="up" />
          <Stat label="// agents" value={overview?.agents_running ?? 0} hint="running" trend={(overview?.agents_running ?? 0) > 0 ? "up" : "flat"} />
          <Stat label="// tx · 24h" value={overview?.transmissions_24h ?? 0} hint="federation traffic" trend={(overview?.transmissions_24h ?? 0) > 0 ? "up" : "flat"} />
        </div>

        <WondersStrip wonders={wonders} />

        <FederationPulsePanel pulse={pulse} />

        <Panel
          eyebrow="// federation feed · live"
          title="Transmissions"
          scanlines
          action={<RadioTower className="h-4 w-4 text-primary animate-pulse" />}
        >
          {transmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">// the feed is quiet right now. check back when realms start shipping.</p>
          ) : (
            <GalaxyTicker transmissions={transmissions as Array<Record<string, unknown>>} />
          )}
        </Panel>

        <Panel eyebrow={`// realms · ${realms.length}`} title="The federation">
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...active, ...vaulted].map((r) => {
              const isLive = !r.vaulted_at && !!r.base_url;
              const isVault = !!r.vaulted_at;
              const accent = isVault ? "border-l-violet-400" : isLive ? "border-l-primary" : "border-l-border";
              return (
                <li
                  key={r.id}
                  className={`nros-deck p-4 hover:border-primary/40 transition-colors border-l-[3px] ${accent}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground truncate">
                      /{r.slug}
                    </span>
                    {isVault ? (
                      <Badge variant="accent">vault</Badge>
                    ) : isLive ? (
                      <Badge>live</Badge>
                    ) : (
                      <Badge variant="muted">in dev</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm">{r.name}</h3>
                  {r.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.description}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <Link href={`/realms/${r.slug}`} className="font-mono text-[11px] text-primary hover:underline">
                      view dossier →
                    </Link>
                    {r.base_url && (
                      <a href={r.base_url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-muted-foreground hover:text-primary">
                        open <ArrowUpRight className="inline h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 text-xs font-mono text-muted-foreground flex items-center justify-between">
        <span>// federation kernel v3 · DIVINE-SYNC</span>
        <Link href="/" className="hover:text-primary">← home</Link>
      </footer>
    </main>
  );
}
