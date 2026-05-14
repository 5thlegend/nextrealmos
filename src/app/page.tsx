import Link from "next/link";
import { Activity, ArrowUpRight, Brain, GitBranch, Landmark, RadioTower, Shield, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPublicRealms } from "@/services/realm-service";
import { listTransmissions } from "@/services/transmission-service";
import { getCivilizationOverview } from "@/services/civilization-service";
import { listWonders } from "@/services/wonder-service";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";

// Always render fresh — the public landing is the federation's storefront
export const runtime = "edge";
export const revalidate = 30;

const layers = [
  { icon: Brain,     name: "GENUBRA",         role: "cognition",       desc: "Memory, reasoning, operator graph" },
  { icon: GitBranch, name: "REALM GRAPH",     role: "governance",      desc: "Visual civilization control surface" },
  { icon: Workflow,  name: "OBLISK",          role: "execution",       desc: "Workflow + realm manifestation engine" },
  { icon: Activity,  name: "EVENT SPINE",     role: "synchronization", desc: "Federated transmission feed" },
  { icon: Shield,    name: "IDENTITY LAYER",  role: "operators",       desc: "Universal callsign across realms" },
  { icon: Zap,       name: "AGENT GRID",      role: "automation",      desc: "AI workers attached to realms" },
];

export default async function Home() {
  const [realms, transmissions, overview, wonders] = await Promise.all([
    listPublicRealms({ includeVaulted: true }),
    listTransmissions({ limit: 12 }),
    getCivilizationOverview(),
    listWonders(),
  ]);

  const active  = realms.filter((r) => r.status === "ACTIVE" && !r.vaulted_at);
  const vaulted = realms.filter((r) => r.vaulted_at);

  // Sort: deployed (has base_url) first, then in-development, vaulted last
  const sortedRealms = [
    ...active.filter((r) => r.base_url),
    ...active.filter((r) => !r.base_url),
    ...vaulted,
  ];

  return (
    <main className="relative min-h-screen overflow-hidden nr-skin">
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm border grid place-items-center"
               style={{ borderColor: "hsla(var(--nr-magma), 0.6)", background: "hsla(var(--nr-magma), 0.08)" }}>
            <span className="font-mono text-[10px] nr-magma">NR</span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: "hsl(var(--nr-text))" }}>
            NEXT REALM · OS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/forge" className="nr-btn">Forge</Link>
          <Link href="/aura" className="nr-btn">Aura Scan</Link>
          <Link href="/ecosystem" className="nr-btn">Ecosystem</Link>
          <Link href="/sign-in?next=/dashboard" className="nr-btn">Sign in</Link>
          <Link href="/sign-in?next=/operator/onboarding" className="nr-btn nr-btn-magma">Enlist</Link>
        </div>
      </header>

      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-10 max-w-6xl mx-auto">
        <p className="nr-eyebrow mb-8">— internal command center · NEXT REALM ECOSYSTEM</p>

        <h1 className="nr-display text-5xl md:text-7xl max-w-5xl"
            style={{ color: "hsl(var(--nr-text))" }}>
          Cinematic operator infrastructure for the <span className="nr-magma italic">next civilization</span>.
        </h1>

        <div className="nr-rule mt-10 max-w-md" />

        <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed"
           style={{ color: "hsl(var(--nr-muted))" }}>
          The internal command layer behind the Next Realm ecosystem.
          Sovereign operators. Federated realms. One identity, one signal, one economy —
          orchestrated through this kernel.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/sign-in?next=/operator/onboarding" className="nr-btn nr-btn-magma">
            Enlist as operator
          </Link>
          <Link href="/civilization" className="nr-btn">
            See the civilization <ArrowUpRight className="h-3 w-3" />
          </Link>
          <a
            href="https://github.com/5thlegend/nextrealmos/blob/main/docs/FEDERATION_PROTOCOL.md"
            target="_blank" rel="noreferrer"
            className="nr-btn nr-btn-gold"
          >
            Read the protocol
          </a>
        </div>
      </section>

      {/* Live civilization HUD */}
      <section className="relative z-10 px-6 lg:px-10 pb-8 max-w-6xl mx-auto">
        <div className="nros-deck p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <HudStat label="active realms" value={active.length} />
          <HudStat label="operators"     value={overview?.total_operators ?? 0} />
          <HudStat label="wonders"       value={wonders.length}       accent="warn" />
          <HudStat label="agents live"   value={overview?.agents_running ?? 0} accent="signal" />
          <HudStat label="tx · 24h"      value={overview?.transmissions_24h ?? 0} pulse />
        </div>
      </section>

      {/* Live transmissions ticker */}
      {transmissions.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <RadioTower className="h-3 w-3 text-primary animate-pulse" />
            <p className="nros-eyebrow">// live transmissions · federation feed</p>
          </div>
          <GalaxyTicker transmissions={transmissions as Array<Record<string, unknown>>} />
        </section>
      )}

      {/* Federated realms — clickable */}
      <section className="relative z-10 px-6 lg:px-10 pb-10 max-w-6xl mx-auto">
        <div className="nros-deck p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="nros-eyebrow">// federated realms</p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                {active.length} ACTIVE · {vaulted.length} VAULTED · {realms.length} TOTAL
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/civilization">Galaxy view <ArrowUpRight className="h-3 w-3" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sortedRealms.map((r) => (
              <RealmChip
                key={r.id}
                slug={r.slug}
                name={r.name}
                description={r.description}
                vaulted={!!r.vaulted_at}
                baseUrl={r.base_url}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Wonders preview */}
      {wonders.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-10 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="nros-eyebrow">// federation wonders</p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                permanent marquee builds visible to every realm
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/civilization">All wonders</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {wonders.slice(0, 3).map((w) => (
              <div
                key={w.id}
                className="rounded-md border bg-card/70 p-4"
                style={{ borderLeftColor: w.banner_color, borderLeftWidth: 3 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="h-4 w-4" style={{ color: w.banner_color }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: w.banner_color }}>
                    {w.era.toLowerCase()}
                  </span>
                </div>
                <h3 className="font-semibold text-sm">{w.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{w.tagline}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What NROS provides */}
      <section className="relative z-10 px-6 lg:px-10 pb-10 max-w-6xl mx-auto">
        <p className="nros-eyebrow mb-4">// what NROS provides to every realm</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {layers.map(({ icon: Icon, name, role, desc }) => (
            <article key={name} className="nros-deck p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">// {role}</span>
              </div>
              <h3 className="font-semibold text-sm">{name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="nros-deck p-5">
            <p className="nros-eyebrow mb-2">// for operators</p>
            <h3 className="font-semibold mb-2">Live in the realms.</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your callsign is universal. Sign up once at NROS, then participate in any realm — your XP, rank,
              and reputation follow you everywhere.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/sign-in?next=/operator/onboarding">Enlist <ArrowUpRight className="h-3 w-3" /></Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/civilization">Browse realms</Link>
              </Button>
            </div>
          </div>
          <div className="nros-deck p-5">
            <p className="nros-eyebrow mb-2">// for realm builders</p>
            <h3 className="font-semibold mb-2">Federate your realm.</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drop in <code className="text-primary font-mono text-xs">@nros/sdk</code>, register your realm,
              push civilization events. Universal identity, shared XP, federated event feed — for free.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="https://github.com/5thlegend/nextrealmos/blob/main/docs/FEDERATION_PROTOCOL.md" target="_blank" rel="noreferrer">
                  Protocol docs <ArrowUpRight className="h-3 w-3" />
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/sign-in?next=/realms/new">Register realm</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
        <span>// next realm interactive · federation kernel v3 · DIVINE-SYNC</span>
        <span className="flex items-center gap-3">
          <a href="https://github.com/5thlegend/nextrealmos" target="_blank" rel="noreferrer" className="hover:text-primary">github</a>
          <span>·</span>
          <span>build {process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 7) ?? "dev"}</span>
        </span>
      </footer>
    </main>
  );
}

function HudStat({ label, value, accent, pulse }: { label: string; value: number | string; accent?: "warn" | "signal"; pulse?: boolean }) {
  const color = accent === "warn" ? "text-nros-warn" : accent === "signal" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-semibold tabular-nums ${color}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {pulse && Number(value) > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function RealmChip({
  slug, name, description, vaulted, baseUrl,
}: {
  slug: string; name: string; description: string | null; vaulted: boolean; baseUrl: string | null;
}) {
  const isLive = !vaulted && !!baseUrl;
  const accent = vaulted
    ? "border-nros-rank/40 bg-nros-rank/5 text-nros-rank"
    : isLive
    ? "border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10"
    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border";

  const Inner = (
    <div className={`block rounded-md border p-2.5 transition-colors ${accent}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-xs font-semibold truncate">/{slug}</span>
        {isLive && <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />}
      </div>
      <p className="text-[11px] text-foreground/80 truncate mt-0.5">{name}</p>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] mt-1 opacity-80">
        {vaulted ? "vaulted" : isLive ? "live" : "in development"}
      </p>
    </div>
  );

  if (vaulted) return <div title={description ?? undefined}>{Inner}</div>;
  if (baseUrl) return <a href={baseUrl} target="_blank" rel="noreferrer" title={description ?? undefined}>{Inner}</a>;
  return <Link href={`/realms/${slug}`} title={description ?? undefined}>{Inner}</Link>;
}
