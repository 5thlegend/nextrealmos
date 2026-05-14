import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { listRecentAuraScans } from "@/services/aura-service";
import { AuraScanForm } from "@/components/aura/aura-scan-form";

export const runtime = "edge";
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Aura Scanner · Next Realm",
  description: "Paste a URL. Get a calibrated score across aesthetics, conversion, positioning, signal, and depth. See the one fix that matters most.",
  openGraph: {
    title: "Aura Scanner · Next Realm",
    description: "Brutally honest scoring. Aesthetics · Conversion · Positioning · Signal · Depth.",
    type: "website",
    images: [{ url: "/api/og/nr?surface=aura", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Scanner · Next Realm",
    description: "Brutally honest scoring across 5 axes. See the one fix that matters.",
    images: ["/api/og/nr?surface=aura"],
  },
};

export default async function AuraLandingPage() {
  const recent = await listRecentAuraScans(8);

  return (
    <main className="relative min-h-screen overflow-hidden nr-skin">
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="h-8 w-8 rounded-sm border grid place-items-center transition-colors"
            style={{ borderColor: "hsla(var(--nr-magma), 0.6)", background: "hsla(var(--nr-magma), 0.08)" }}
          >
            <span className="font-mono text-[10px] nr-magma">NR</span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: "hsl(var(--nr-text))" }}>
            NEXT REALM · AURA
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/civilization" className="nr-btn">Civilization</Link>
          <Link href="/sign-in?next=/dashboard" className="nr-btn">Sign in</Link>
        </div>
      </header>

      {/* Hero — 1-second comprehension */}
      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-12 max-w-5xl mx-auto">
        <p className="nr-eyebrow mb-8">— viral acquisition · operator aura scanner</p>

        <h1 className="nr-display text-5xl md:text-7xl max-w-4xl" style={{ color: "hsl(var(--nr-text))" }}>
          What is your <span className="nr-magma italic">aura</span> losing you?
        </h1>

        <div className="nr-rule mt-10 max-w-md" />

        <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: "hsl(var(--nr-muted))" }}>
          Paste a URL. In seconds, get a calibrated score across five axes —
          aesthetics, conversion, positioning, signal, depth. Then see the
          single fix that would move it most.
        </p>

        {/* The form */}
        <div className="mt-10 max-w-2xl">
          <AuraScanForm />
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-[11px]" style={{ color: "hsl(var(--nr-muted))" }}>
          <span className="font-mono">No login. No spam. Brutally honest.</span>
          <span className="font-mono">·</span>
          <span className="font-mono">Powered by GENUBRA</span>
        </div>
      </section>

      {/* The 5 axes — why this is different */}
      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-5xl mx-auto">
        <p className="nr-eyebrow mb-6">— five axes · weighted</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {AXES.map((a) => (
            <div key={a.label} className="nr-card p-4">
              <p className="nr-magma font-mono text-[10px] uppercase tracking-[0.18em]">{a.label}</p>
              <p className="text-sm mt-2 leading-snug" style={{ color: "hsl(var(--nr-text))" }}>{a.desc}</p>
              <p className="font-mono text-[10px] mt-3" style={{ color: "hsl(var(--nr-muted))" }}>weight {a.weight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent scans — social proof */}
      {recent.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-16 max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <p className="nr-eyebrow">— recently scanned</p>
            <span className="font-mono text-[10px]" style={{ color: "hsl(var(--nr-muted))" }}>
              live · public
            </span>
          </div>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.share_token}>
                <Link
                  href={`/aura/scan/${r.share_token}`}
                  className="nr-card flex items-center gap-4 px-4 py-3 hover:scale-[1.005] transition-transform"
                >
                  <span className="nr-display text-3xl tabular-nums shrink-0 w-16 text-center"
                        style={{ color: scoreColor(r.aura_score ?? 0) }}>
                    {r.aura_score ?? "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "hsl(var(--nr-text))" }}>
                      {strip(r.url)}
                    </p>
                    {r.vibe && <p className="text-[12px] truncate italic" style={{ color: "hsl(var(--nr-muted))" }}>{r.vibe}</p>}
                  </div>
                  <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--nr-muted))" }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA — close on the awe */}
      <section className="relative z-10 px-6 lg:px-10 pb-20 max-w-5xl mx-auto">
        <div className="nr-card p-8 md:p-10 text-center"
             style={{ borderColor: "hsla(var(--nr-magma), 0.4)" }}>
          <p className="nr-eyebrow">— after the scan</p>
          <h2 className="nr-display text-3xl md:text-4xl mt-3" style={{ color: "hsl(var(--nr-text))" }}>
            See the score. Get the <span className="nr-magma italic">fix</span>.<br />Close with the Forge.
          </h2>
          <p className="mt-5 text-sm max-w-2xl mx-auto" style={{ color: "hsl(var(--nr-muted))" }}>
            Every scan ends with the single highest-leverage move. Want it
            implemented for you? The Forge ships upgrades on a 7-day clock.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link href="#scan" className="nr-btn nr-btn-magma">Scan a URL</Link>
            <Link href="/civilization" className="nr-btn nr-btn-gold">Browse the federation</Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t py-6 px-6 lg:px-10 text-xs font-mono flex items-center justify-between"
              style={{ borderColor: "hsla(var(--nr-text), 0.08)", color: "hsl(var(--nr-muted))" }}>
        <span>// next realm · aura scanner v1</span>
        <Link href="/" className="hover:nr-magma">← os</Link>
      </footer>
    </main>
  );
}

const AXES = [
  { label: "Aesthetics",  desc: "Visual polish, hierarchy, breathability.", weight: "0.18" },
  { label: "Conversion",  desc: "CTA clarity, friction, lead capture.",     weight: "0.28" },
  { label: "Positioning", desc: "Premium signal, who-this-is-for.",         weight: "0.22" },
  { label: "Signal",      desc: "Proof points, real metrics, credibility.", weight: "0.18" },
  { label: "Depth",       desc: "System thinking vs surface decoration.",   weight: "0.14" },
];

function scoreColor(s: number): string {
  if (s >= 80) return "hsl(var(--nr-gold))";
  if (s >= 60) return "hsl(var(--nr-text))";
  if (s >= 40) return "hsl(var(--nr-magma))";
  return "hsl(var(--nr-magma))";
}

function strip(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
