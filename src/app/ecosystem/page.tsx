import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Brain, Coins, GitBranch, Globe, Landmark, RadioTower, ScrollText, Shield, Workflow, Zap } from "lucide-react";
import { listPublicRealms } from "@/services/realm-service";
import { listWonders } from "@/services/wonder-service";
import { listArmoryEntries, listRealmTiers, formatPrice } from "@/services/monetization-service";
import { getFederationPulse } from "@/services/analytics-service";
import { listTransmissions } from "@/services/transmission-service";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";

export const runtime = "edge";
export const revalidate = 30;

export const metadata: Metadata = {
  title: "The Ecosystem · Next Realm",
  description: "Every layer. Every realm. Every wonder. Every tier. The complete map of the Next Realm civilization in one cinematic scroll.",
  openGraph: {
    title: "The Ecosystem · Next Realm",
    description: "The complete map of the Next Realm civilization.",
    type: "website",
  },
};

const LAYERS = [
  { code: "OS",         label: "OS · Internal Command",   url: "https://nextrealmos.pages.dev",                       icon: GitBranch, status: "live", color: "magma", desc: "The federation kernel — identity, transmissions, governance APIs." },
  { code: "FORGE",      label: "Forge · Public Gateway",  url: "/forge",                                              icon: Zap,        status: "live", color: "magma", desc: "Public service gateway. Audits. Upgrades. Continuous shipping." },
  { code: "AURA",       label: "Aura · Acquisition",      url: "/aura",                                               icon: RadioTower, status: "live", color: "gold",  desc: "Viral acquisition engine. Brutally honest scoring across 5 axes." },
  { code: "OPERATORS",  label: "Operators · Network",     url: "https://nextrealm-operators.dankpenta.workers.dev",   icon: Globe,      status: "live", color: "magma", desc: "Operator dossier + signal map + deployment log. The public face." },
  { code: "APPS",       label: "Apps · Money Factory",    url: "https://nr-money-factory.pages.dev",                  icon: Coins,      status: "live", color: "gold",  desc: "Productized realm armory. Each app a nr-[name].pages.dev." },
  { code: "GENUBRA",    label: "GENUBRA · Cognition",     url: "/dashboard",                                          icon: Brain,      status: "live", color: "magma", desc: "Strategic intelligence layer. Daily briefings. Mission generation." },
  { code: "OBLISK",     label: "OBLISK · Execution",      url: "/dashboard/workflows",                                icon: Workflow,   status: "live", color: "magma", desc: "Workflow + realm scaffolding engine." },
  { code: "MISSIONS",   label: "Missions · The Drive",    url: "/missions",                                           icon: ScrollText, status: "live", color: "magma", desc: "Mission queue. Calibrated by GENUBRA. Federation-wide XP." },
  { code: "WONDERS",    label: "Wonders · Marquee",       url: "/wonders",                                            icon: Landmark,   status: "live", color: "gold",  desc: "Permanent civilization marks. Visible to every realm." },
  { code: "ELITE",      label: "Elite Realms · Sovereign", url: "/civilization",                                      icon: Shield,     status: "live", color: "gold",  desc: "Sovereign elite-leader realms. LEGVCY. DivinWine. NRO Operator Core." },
];

export default async function EcosystemPage() {
  const [realms, wonders, armory, pulse, transmissions, legvcyTiers] = await Promise.all([
    listPublicRealms({ includeVaulted: true }),
    listWonders(),
    listArmoryEntries(),
    getFederationPulse(),
    listTransmissions({ limit: 10 }),
    listRealmTiers("legvcy"),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden nr-skin">
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm border grid place-items-center"
               style={{ borderColor: "hsla(var(--nr-magma), 0.6)", background: "hsla(var(--nr-magma), 0.08)" }}>
            <span className="font-mono text-[10px] nr-magma">NR</span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: "hsl(var(--nr-text))" }}>
            NEXT REALM · ECOSYSTEM
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/aura" className="nr-btn">Aura Scan</Link>
          <Link href="/forge" className="nr-btn nr-btn-magma">Talk to the Forge</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-12 max-w-6xl mx-auto">
        <p className="nr-eyebrow mb-8">— complete civilization map · live</p>
        <h1 className="nr-display text-5xl md:text-7xl max-w-5xl" style={{ color: "hsl(var(--nr-text))" }}>
          One ecosystem. <span className="nr-magma italic">One narrative.</span><br />
          One signal.
        </h1>
        <div className="nr-rule mt-10 max-w-md" />
        <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: "hsl(var(--nr-muted))" }}>
          Every layer of the Next Realm civilization on one page. Federated identity.
          Sovereign realms. A premium service ladder. All wired, all live, all
          shipped on a 7-day clock.
        </p>
      </section>

      {/* PULSE STRIP */}
      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-6xl mx-auto">
        <div className="nr-card p-5 grid grid-cols-2 md:grid-cols-6 gap-3">
          <PulseStat label="layers"      value={LAYERS.length} />
          <PulseStat label="realms"      value={pulse.realms_active} />
          <PulseStat label="wonders"     value={wonders.length} accent="gold" />
          <PulseStat label="operators"   value={pulse.operators_total} />
          <PulseStat label="armory"      value={armory.length} accent="gold" />
          <PulseStat label="tx · 24h"    value={pulse.transmissions_24h} accent="magma" pulse />
        </div>
      </section>

      {/* LAYERS GRID */}
      <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
        <p className="nr-eyebrow mb-4">— the {LAYERS.length} layers · all active</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {LAYERS.map((l) => {
            const Icon = l.icon;
            const isExternal = l.url.startsWith("http");
            const accent = l.color === "gold" ? "hsl(var(--nr-gold))" : "hsl(var(--nr-magma))";
            const Body = (
              <div className="nr-card p-5 h-full hover:scale-[1.01] transition-transform"
                   style={{ borderLeftColor: accent, borderLeftWidth: "3px" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
                    {l.code}
                  </span>
                  {isExternal && <ArrowUpRight className="h-3 w-3 ml-auto" style={{ color: "hsl(var(--nr-muted))" }} />}
                </div>
                <h3 className="nr-display text-xl mb-2" style={{ color: "hsl(var(--nr-text))" }}>{l.label}</h3>
                <p className="text-xs" style={{ color: "hsl(var(--nr-muted))" }}>{l.desc}</p>
              </div>
            );
            return isExternal ? (
              <a key={l.code} href={l.url} target="_blank" rel="noreferrer" className="block">{Body}</a>
            ) : (
              <Link key={l.code} href={l.url} className="block">{Body}</Link>
            );
          })}
        </div>
      </section>

      {/* REALMS — all of them, including vault */}
      <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
        <p className="nr-eyebrow mb-4">— federated realms · {realms.length}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {realms.map((r) => {
            const live = r.status === "ACTIVE" && !r.vaulted_at && !!r.base_url;
            const vaulted = !!r.vaulted_at;
            const stateLabel = vaulted ? "vault" : live ? "live" : "in dev";
            const stateColor = vaulted ? "#A78BFA" : live ? "hsl(var(--nr-magma))" : "hsl(var(--nr-muted))";
            return (
              <Link key={r.id} href={`/realms/${r.slug}`} className="block">
                <div className="nr-card p-4 h-full hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "hsl(var(--nr-muted))" }}>
                      /{r.slug}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: stateColor }}>
                      {stateLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--nr-text))" }}>{r.name}</p>
                  {r.description && (
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "hsl(var(--nr-muted))" }}>{r.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* WONDERS */}
      {wonders.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
          <p className="nr-eyebrow mb-4">— federation wonders · {wonders.length}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {wonders.map((w) => (
              <Link key={w.id} href={w.realm_slug ? `/realms/${w.realm_slug}` : "#"} className="block">
                <div className="nr-card p-4 h-full hover:scale-[1.01] transition-transform"
                     style={{ borderLeftColor: w.banner_color, borderLeftWidth: "3px",
                              boxShadow: `0 0 24px -10px ${w.banner_color}55` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="h-3 w-3" style={{ color: w.banner_color }} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em]"
                          style={{ color: w.banner_color }}>
                      {w.era.toLowerCase()}
                    </span>
                  </div>
                  <p className="nr-display text-lg" style={{ color: "hsl(var(--nr-text))" }}>{w.name}</p>
                  <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "hsl(var(--nr-muted))" }}>{w.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* MONEY FACTORY ARMORY */}
      {armory.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <p className="nr-eyebrow">— money factory armory · {armory.length}</p>
            <a href="https://nr-money-factory.pages.dev" target="_blank" rel="noreferrer"
               className="nr-btn nr-btn-gold text-[11px]">
              nr-money-factory.pages.dev <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {armory.map((e) => (
              <Link key={e.realm_id} href={`/realms/${e.realm_slug}`} className="block">
                <div className="nr-card p-4 h-full hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] nr-gold">
                      /{e.realm_slug}
                    </span>
                    {e.unlock_rank_tier && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em]"
                            style={{ color: "hsl(var(--nr-muted))" }}>
                        unlocks at {e.unlock_rank_tier}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--nr-text))" }}>{e.realm_name}</p>
                  {e.notes && <p className="text-[11px]" style={{ color: "hsl(var(--nr-muted))" }}>{e.notes}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* LEGVCY tiers — the cashflow ladder */}
      {legvcyTiers.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <p className="nr-eyebrow">— cashflow · LEGVCY · the way</p>
            <Link href="/realms/legvcy/tiers" className="nr-btn nr-btn-magma text-[11px]">
              See ladder <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {legvcyTiers.map((t) => (
              <Link key={t.id} href="/realms/legvcy/tiers" className="block">
                <div className="nr-card p-4 text-center hover:scale-[1.01] transition-transform"
                     style={{ borderColor: `${t.banner_color}55` }}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2"
                     style={{ color: t.banner_color }}>{t.name}</p>
                  <p className="nr-display text-2xl tabular-nums"
                     style={{ color: "hsl(var(--nr-text))" }}>
                    {formatPrice(t.price_cents, t.currency)}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] mt-1"
                     style={{ color: "hsl(var(--nr-muted))" }}>
                    /{t.interval}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* LIVE TICKER */}
      {transmissions.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
          <p className="nr-eyebrow mb-4">— live federation feed</p>
          <div className="nr-card p-2">
            <GalaxyTicker transmissions={transmissions as Array<Record<string, unknown>>} />
          </div>
        </section>
      )}

      {/* CLOSE */}
      <section className="relative z-10 px-6 lg:px-10 pb-20 max-w-5xl mx-auto">
        <div className="nr-card p-8 md:p-12 text-center"
             style={{
               borderColor: "hsla(var(--nr-magma), 0.5)",
               boxShadow: "0 0 80px -24px hsla(var(--nr-magma), 0.5)",
             }}>
          <p className="nr-eyebrow">— enter the ecosystem</p>
          <h2 className="nr-display text-3xl md:text-5xl mt-3" style={{ color: "hsl(var(--nr-text))" }}>
            <span className="nr-magma italic">One identity.</span> Every realm.<br />
            Start with a scan.
          </h2>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link href="/aura" className="nr-btn nr-btn-magma">Scan your aura</Link>
            <Link href="/sign-in?next=/operator/onboarding" className="nr-btn nr-btn-gold">Enlist as operator</Link>
            <Link href="/forge" className="nr-btn">Talk to the Forge</Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t py-6 px-6 lg:px-10 text-xs font-mono flex items-center justify-between"
              style={{ borderColor: "hsla(var(--nr-text), 0.08)", color: "hsl(var(--nr-muted))" }}>
        <span>// next realm · ecosystem map</span>
        <Link href="/" className="hover:nr-magma">← os</Link>
      </footer>
    </main>
  );
}

function PulseStat({
  label, value, accent, pulse,
}: { label: string; value: number; accent?: "gold" | "magma"; pulse?: boolean }) {
  const color =
    accent === "gold"  ? "hsl(var(--nr-gold))"  :
    accent === "magma" ? "hsl(var(--nr-magma))" :
    "hsl(var(--nr-text))";
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="nr-display tabular-nums" style={{ color, fontSize: "30px" }}>
          {value.toLocaleString()}
        </span>
        {pulse && value > 0 && (
          <span className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: "hsl(var(--nr-magma))" }} />
        )}
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] mt-1"
         style={{ color: "hsl(var(--nr-muted))" }}>{label}</p>
    </div>
  );
}
