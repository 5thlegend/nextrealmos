import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import { getAuraScanByToken } from "@/services/aura-service";
import { AuraScoreReveal } from "@/components/aura/aura-score-reveal";
import { AuraLeadCapture } from "@/components/aura/aura-lead-capture";
import { AuraShare } from "@/components/aura/aura-share";

export const runtime = "edge";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const scan = await getAuraScanByToken(token);
  if (!scan) return { title: "Aura scan not found · Next Realm" };
  const score = scan.aura_score ?? 0;
  const host = (() => { try { return new URL(scan.url).host; } catch { return scan.url; } })();
  const title = `Aura ${score} · ${host} · Next Realm`;
  const description = scan.vibe ?? `Calibrated aura score across aesthetics, conversion, positioning, signal, depth.`;
  const ogImage = `/api/aura/og/${token}.svg`;
  return {
    title, description,
    openGraph: {
      title, description, type: "website", url: `/aura/scan/${token}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title, description,
      images: [ogImage],
    },
  };
}

export default async function AuraResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scan = await getAuraScanByToken(token);
  if (!scan) notFound();

  const score = scan.aura_score ?? 0;
  const failed = scan.status === "FAILED";
  const host = (() => { try { return new URL(scan.url).host; } catch { return scan.url; } })();
  const axes = scan.axis_scores ?? { aesthetics: 0, conversion: 0, positioning: 0, signal: 0, depth: 0 };

  const tier = scoreTier(score);

  return (
    <main className="relative min-h-screen overflow-hidden nr-skin">
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <Link href="/aura" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm border grid place-items-center"
               style={{ borderColor: "hsla(var(--nr-magma), 0.6)", background: "hsla(var(--nr-magma), 0.08)" }}>
            <span className="font-mono text-[10px] nr-magma">NR</span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: "hsl(var(--nr-text))" }}>
            NEXT REALM · AURA
          </span>
        </Link>
        <Link href="/aura" className="nr-btn">Scan another</Link>
      </header>

      <section className="relative z-10 px-6 lg:px-10 pt-6 pb-12 max-w-5xl mx-auto">
        {/* URL banner */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b"
             style={{ borderColor: "hsla(var(--nr-text), 0.08)" }}>
          <div className="min-w-0">
            <p className="nr-eyebrow">— scan target</p>
            <a href={scan.url} target="_blank" rel="noreferrer"
               className="font-mono text-sm hover:nr-magma transition-colors truncate block"
               style={{ color: "hsl(var(--nr-text))" }}>
              {host}
            </a>
          </div>
          <span className="font-mono text-[10px]" style={{ color: "hsl(var(--nr-muted))" }}>
            {new Date(scan.created_at).toLocaleString()}
          </span>
        </div>

        {failed ? (
          <FailedState scan={scan} />
        ) : (
          <>
            {/* HERO: the score reveal — animated count-up */}
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
              <AuraScoreReveal score={score} tier={tier} />
              <div>
                <p className="nr-eyebrow">— aura · {tier.label.toLowerCase()}</p>
                <h1 className="nr-display text-3xl md:text-4xl mt-2" style={{ color: "hsl(var(--nr-text))" }}>
                  {scan.vibe || "Calibrated."}
                </h1>
                <p className="mt-4 text-sm" style={{ color: "hsl(var(--nr-muted))" }}>
                  {tier.description}
                </p>
              </div>
            </div>

            {/* TOP FIX — the close hook */}
            {scan.top_fix && (
              <div className="mt-10 p-6 md:p-8 rounded-sm border-2"
                   style={{
                     borderColor: "hsla(var(--nr-magma), 0.6)",
                     background:  "hsla(var(--nr-magma), 0.04)",
                     boxShadow:   "0 0 60px -20px hsla(var(--nr-magma), 0.5)",
                   }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 nr-magma" />
                  <p className="nr-eyebrow nr-magma">— the one fix that matters</p>
                </div>
                <p className="nr-display text-2xl md:text-3xl leading-snug" style={{ color: "hsl(var(--nr-text))" }}>
                  {scan.top_fix}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/sign-in?next=/operator/onboarding`} className="nr-btn nr-btn-magma">
                    Get this fix shipped <ArrowRight className="h-3 w-3" />
                  </Link>
                  <a href={`mailto:hello@nextrealm.io?subject=Aura%20fix%20for%20${encodeURIComponent(host)}&body=${encodeURIComponent(`Aura: ${score}\nFix: ${scan.top_fix}\n\nLet's ship it.`)}`}
                     className="nr-btn nr-btn-gold">
                    Talk to the Forge
                  </a>
                </div>
              </div>
            )}

            {/* AXIS BREAKDOWN */}
            <div className="mt-12">
              <p className="nr-eyebrow mb-4">— axis breakdown</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {(["aesthetics","conversion","positioning","signal","depth"] as const).map((k) => (
                  <AxisBar key={k} label={k} value={axes[k] ?? 0} />
                ))}
              </div>
            </div>

            {/* STRENGTHS + WEAKNESSES */}
            {(scan.strengths.length > 0 || scan.weaknesses.length > 0) && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                {scan.strengths.length > 0 && (
                  <div className="nr-card p-5">
                    <p className="nr-eyebrow mb-3" style={{ color: "hsl(var(--nr-gold))" }}>— strengths</p>
                    <ul className="space-y-2">
                      {scan.strengths.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: "hsl(var(--nr-text))" }}>
                          <span className="nr-gold shrink-0">+</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {scan.weaknesses.length > 0 && (
                  <div className="nr-card p-5">
                    <p className="nr-eyebrow nr-magma mb-3">— weaknesses</p>
                    <ul className="space-y-2">
                      {scan.weaknesses.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: "hsl(var(--nr-text))" }}>
                          <span className="nr-magma shrink-0">−</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* LEAD CAPTURE — collected post-awe */}
            {!scan.email && (
              <div className="mt-12">
                <AuraLeadCapture token={scan.share_token} />
              </div>
            )}

            {/* SHARE */}
            <div className="mt-12 nr-card p-6 text-center">
              <p className="nr-eyebrow mb-2">— share the score</p>
              <p className="nr-display text-2xl mb-4" style={{ color: "hsl(var(--nr-text))" }}>
                Aura <span className="nr-magma">{score}</span> · {host}
              </p>
              <AuraShare token={scan.share_token} score={score} host={host} />
              <p className="text-[11px] mt-4 font-mono" style={{ color: "hsl(var(--nr-muted))" }}>
                // every share renders a cinematic OG card with the score + vibe
              </p>
            </div>
          </>
        )}
      </section>

      <footer className="relative z-10 border-t py-6 px-6 lg:px-10 text-xs font-mono flex items-center justify-between"
              style={{ borderColor: "hsla(var(--nr-text), 0.08)", color: "hsl(var(--nr-muted))" }}>
        <span>// next realm · aura scanner v1</span>
        <Link href="/aura" className="hover:nr-magma">← scan another</Link>
      </footer>
    </main>
  );
}

function FailedState({ scan }: { scan: { error: string | null; url: string } }) {
  const host = (() => { try { return new URL(scan.url).host; } catch { return scan.url; } })();
  const mailto = `mailto:hello@nextrealm.io?subject=${encodeURIComponent(`Manual aura audit · ${host}`)}&body=${encodeURIComponent(
    `Auto-scan couldn't reach ${scan.url} (${scan.error ?? "fetch failed"}).\n\nI'd like a manual audit.`,
  )}`;
  return (
    <div className="nr-card p-8 md:p-10 text-center"
         style={{ borderColor: "hsla(var(--nr-magma), 0.5)" }}>
      <p className="nr-eyebrow nr-magma mb-2">— auto-scan blocked</p>
      <h2 className="nr-display text-2xl md:text-3xl mb-3" style={{ color: "hsl(var(--nr-text))" }}>
        We couldn&apos;t reach <span className="nr-magma">{host}</span> automatically.
      </h2>
      <p className="text-sm mb-2 max-w-xl mx-auto" style={{ color: "hsl(var(--nr-muted))" }}>
        {scan.error ?? "The page may be blocked, slow, or behind auth."}
      </p>
      <p className="text-sm mb-6 max-w-xl mx-auto" style={{ color: "hsl(var(--nr-muted))" }}>
        That&apos;s actually a signal — most auto-bots can&apos;t read it either. Want a sharper read? We can audit it manually.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a href={mailto} className="nr-btn nr-btn-magma">Get a manual audit</a>
        <Link href="/aura" className="nr-btn">Scan a different URL</Link>
        <Link href="/forge" className="nr-btn nr-btn-gold">Talk to the Forge</Link>
      </div>
    </div>
  );
}

function AxisBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="nr-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "hsl(var(--nr-muted))" }}>
          {label}
        </span>
        <span className="nr-display text-2xl tabular-nums" style={{ color: "hsl(var(--nr-text))" }}>
          {pct}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsla(var(--nr-text), 0.08)" }}>
        <div className="h-full transition-all duration-1000"
             style={{
               width: `${pct}%`,
               background: pct >= 70 ? "hsl(var(--nr-gold))" : "hsl(var(--nr-magma))",
             }} />
      </div>
    </div>
  );
}

function scoreTier(s: number): { label: string; description: string } {
  if (s >= 85) return { label: "Sovereign", description: "Top 1%. Premium signal. The page closes for you." };
  if (s >= 70) return { label: "Architect", description: "Strong. A few targeted moves take it to elite tier." };
  if (s >= 55) return { label: "Operator",  description: "Solid foundation. The conversion path needs tightening." };
  if (s >= 40) return { label: "Initiate",  description: "Ideas are present. The execution doesn't yet close." };
  return { label: "Cold start", description: "The page is leaking attention. Start with the top fix below." };
}
