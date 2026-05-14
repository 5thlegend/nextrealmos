import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { listPublicRealms } from "@/services/realm-service";
import { listTransmissions } from "@/services/transmission-service";
import { getFederationPulse } from "@/services/analytics-service";
import { listWonders } from "@/services/wonder-service";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";

export const runtime = "edge";
export const revalidate = 30;

export const metadata: Metadata = {
  title: "The Forge · Next Realm",
  description: "We ship cinematic operator infrastructure on a 7-day clock. Audits, upgrade packs, conversion systems, federated identity. Real deployments. Real metrics.",
  openGraph: {
    title: "The Forge · Next Realm",
    description: "Cinematic operator infrastructure shipped on a 7-day clock.",
    type: "website",
    images: [{ url: "/api/og/nr?surface=forge", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Forge · Next Realm",
    description: "We ship the infrastructure your competitors can't.",
    images: ["/api/og/nr?surface=forge"],
  },
};

const SERVICES = [
  {
    code: "AUDIT",
    name: "Aura Audit",
    pitch: "We scan your stack. We tell you the one fix that closes more.",
    price: "$497",
    interval: "one-time",
    cta: "Get the audit",
    href: "mailto:hello@nextrealm.io?subject=Aura%20Audit&body=Drop%20a%20URL%20and%20your%20revenue%20north-star.",
  },
  {
    code: "UPGRADE",
    name: "Upgrade Pack",
    pitch: "We ship the audit's #1 fix. Designed, deployed, measured. 7 days.",
    price: "$2,500",
    interval: "per upgrade",
    cta: "Ship an upgrade",
    href: "mailto:hello@nextrealm.io?subject=Upgrade%20Pack&body=Which%20fix%20do%20you%20want%20shipped%3F",
  },
  {
    code: "FORGE",
    name: "Operator Forge",
    pitch: "Continuous shipping. Cinematic infrastructure. Federated identity. Monthly cadence.",
    price: "$9,900",
    interval: "/ month",
    cta: "Open the forge",
    href: "mailto:hello@nextrealm.io?subject=Operator%20Forge%20%E2%80%94%20monthly&body=Your%20north-star%20goal%20%2B%20current%20stack.",
    premium: true,
  },
];

export default async function ForgePage() {
  const [realms, transmissions, pulse, wonders] = await Promise.all([
    listPublicRealms({ includeVaulted: false }),
    listTransmissions({ limit: 12 }),
    getFederationPulse(),
    listWonders(),
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
            NEXT REALM · FORGE
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/aura" className="nr-btn">Aura Scan</Link>
          <Link href="/civilization" className="nr-btn">Civilization</Link>
          <a href="#close" className="nr-btn nr-btn-magma">Close with us</a>
        </div>
      </header>

      {/* HERO — the value prop in 1 second */}
      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-12 max-w-5xl mx-auto">
        <p className="nr-eyebrow mb-8">— public ecosystem gateway · the forge</p>
        <h1 className="nr-display text-5xl md:text-7xl max-w-4xl" style={{ color: "hsl(var(--nr-text))" }}>
          We ship the <span className="nr-magma italic">infrastructure</span><br />
          your competitors can&apos;t.
        </h1>
        <div className="nr-rule mt-10 max-w-md" />
        <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: "hsl(var(--nr-muted))" }}>
          Cinematic operator systems. Federated identity. Conversion engines. Premium signal.
          Built on a sovereign stack — owned, not rented. We deploy on a 7-day clock.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href="#services" className="nr-btn nr-btn-magma">See what we ship</a>
          <Link href="/aura" className="nr-btn nr-btn-gold">Scan your aura</Link>
          <Link href="/civilization" className="nr-btn">See the federation <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
      </section>

      {/* STATE DASHBOARD — credibility, real metrics */}
      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-5xl mx-auto">
        <p className="nr-eyebrow mb-4">— state of the federation · live</p>
        <div className="nr-card p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <ForgeStat label="Realms" value={pulse.realms_active} />
          <ForgeStat label="Operators" value={pulse.operators_total} />
          <ForgeStat label="Wonders" value={wonders.length} accent="gold" />
          <ForgeStat label="Tx · 24h" value={pulse.transmissions_24h} accent="magma" pulse />
          <ForgeStat label="XP · 7d" value={pulse.xp_7d} compact />
        </div>
      </section>

      {/* DEPLOYMENT LOG — building in public */}
      {transmissions.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-5xl mx-auto">
          <p className="nr-eyebrow mb-4">— deployment log · live federation feed</p>
          <div className="nr-card p-2">
            <GalaxyTicker transmissions={transmissions as Array<Record<string, unknown>>} />
          </div>
        </section>
      )}

      {/* SERVICES — the ladder */}
      <section id="services" className="relative z-10 px-6 lg:px-10 pb-16 max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="nr-eyebrow">— services · 3 tiers</p>
            <h2 className="nr-display text-3xl mt-2" style={{ color: "hsl(var(--nr-text))" }}>
              Pick the leverage. We ship.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SERVICES.map((s) => (
            <article
              key={s.code}
              className="nr-card p-6 flex flex-col"
              style={s.premium ? {
                borderColor: "hsla(var(--nr-gold), 0.6)",
                boxShadow: "0 0 40px -16px hsla(var(--nr-gold), 0.5)",
              } : undefined}
            >
              <p className="nr-eyebrow mb-2" style={{ color: s.premium ? "hsl(var(--nr-gold))" : "hsl(var(--nr-magma))" }}>
                {s.code}
              </p>
              <h3 className="nr-display text-2xl" style={{ color: "hsl(var(--nr-text))" }}>{s.name}</h3>
              <p className="mt-2 text-sm flex-1" style={{ color: "hsl(var(--nr-muted))" }}>{s.pitch}</p>
              <div className="mt-5 mb-5">
                <p className="nr-display text-3xl tabular-nums" style={{ color: "hsl(var(--nr-text))" }}>{s.price}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "hsl(var(--nr-muted))" }}>
                  {s.interval}
                </p>
              </div>
              <a href={s.href} className={`nr-btn ${s.premium ? "nr-btn-gold" : "nr-btn-magma"}`}>
                {s.cta} <ArrowRight className="h-3 w-3" />
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="nr-eyebrow mb-3">— what most agencies sell you</p>
            <ul className="space-y-2 text-sm" style={{ color: "hsl(var(--nr-muted))" }}>
              <li>· A logo and a deck</li>
              <li>· A WordPress with three sliders</li>
              <li>· An &ldquo;AI strategy&rdquo; PDF</li>
              <li>· A 12-week timeline before pixel one ships</li>
            </ul>
          </div>
          <div>
            <p className="nr-eyebrow nr-magma mb-3">— what we ship</p>
            <ul className="space-y-2 text-sm" style={{ color: "hsl(var(--nr-text))" }}>
              <li>· Cinematic operator infrastructure</li>
              <li>· Federated identity across every surface</li>
              <li>· Conversion engines designed to close in 1 second</li>
              <li>· The audit, the fix, and the deploy — in 7 days</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CLOSE — final ask */}
      <section id="close" className="relative z-10 px-6 lg:px-10 pb-20 max-w-5xl mx-auto">
        <div className="nr-card p-8 md:p-12 text-center"
             style={{
               borderColor: "hsla(var(--nr-magma), 0.5)",
               boxShadow: "0 0 80px -24px hsla(var(--nr-magma), 0.6)",
             }}>
          <p className="nr-eyebrow">— close with us</p>
          <h2 className="nr-display text-3xl md:text-5xl mt-3" style={{ color: "hsl(var(--nr-text))" }}>
            One scan. One fix. <span className="nr-magma italic">One deploy.</span><br />
            Then the next realm.
          </h2>
          <p className="mt-5 text-sm max-w-xl mx-auto" style={{ color: "hsl(var(--nr-muted))" }}>
            Start with the Aura Scanner. The number you get is the number your
            visitors are scoring you at right now.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/aura" className="nr-btn nr-btn-magma">Scan your aura</Link>
            <a href="mailto:hello@nextrealm.io?subject=Forge%20intake&body=Where%20do%20you%20want%20us%20to%20start%3F"
               className="nr-btn nr-btn-gold">
              Talk to the forge
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t py-6 px-6 lg:px-10 text-xs font-mono flex items-center justify-between"
              style={{ borderColor: "hsla(var(--nr-text), 0.08)", color: "hsl(var(--nr-muted))" }}>
        <span>// next realm · forge</span>
        <span>{realms.length} active realms · {wonders.length} wonders</span>
      </footer>
    </main>
  );
}

function ForgeStat({
  label, value, accent, compact, pulse,
}: { label: string; value: number; accent?: "gold" | "magma"; compact?: boolean; pulse?: boolean }) {
  const color =
    accent === "gold"  ? "hsl(var(--nr-gold))"  :
    accent === "magma" ? "hsl(var(--nr-magma))" :
    "hsl(var(--nr-text))";
  const fmt = (n: number) =>
    compact && n >= 1000
      ? n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1_000).toFixed(1)}k`
      : n.toLocaleString();
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="nr-display tabular-nums" style={{ color, fontSize: "28px" }}>{fmt(value)}</span>
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
