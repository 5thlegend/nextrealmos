import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { listTransmissions } from "@/services/transmission-service";
import { getFederationPulse } from "@/services/analytics-service";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";

export const runtime = "edge";
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Build Log · Next Realm",
  description: "Building in public. Every shipment, every scan, every operator activation, every wonder. Live federation timeline.",
  openGraph: {
    title: "Build Log · Next Realm",
    description: "Building in public. Every shipment, every signal, in one timeline.",
    type: "website",
    images: [{ url: "/api/og/nr?surface=ecosystem", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Build Log · Next Realm",
    description: "Building in public. Every shipment, every signal, in one timeline.",
    images: ["/api/og/nr?surface=ecosystem"],
  },
};

const EVENT_GLYPH: Record<string, string> = {
  "deployment.launch":   "▲", "deployment.ship": "▶", "deployment.iteration": "◌", "deployment.milestone": "◆",
  "operator.ascension":  "↗", "operator.activation": "✦",
  "realm.attach":        "◈", "realm.vault": "▽", "realm.restore": "△",
  "guild.create":        "◇",
  "mission.complete":    "✓",
  "achievement.unlock":  "★",
  "wonder.built":        "▣",
  "subscription.intent": "◎", "subscription.start": "$$", "subscription.cancel": "×",
};

const EVENT_LABEL: Record<string, string> = {
  "deployment.launch":   "launched",
  "deployment.ship":     "shipped",
  "deployment.iteration":"iterated",
  "deployment.milestone":"hit milestone",
  "operator.ascension":  "ascended",
  "operator.activation": "enlisted",
  "realm.attach":        "joined federation",
  "realm.vault":         "vaulted",
  "realm.restore":       "restored",
  "guild.create":        "forged guild",
  "mission.complete":    "completed mission",
  "achievement.unlock":  "unlocked achievement",
  "wonder.built":        "built wonder",
  "subscription.intent": "intent recorded",
  "subscription.start":  "subscribed",
  "subscription.cancel": "canceled subscription",
};

type Tx = {
  id: string;
  title: string;
  body?: string | null;
  kind: string;
  event_name?: string | null;
  created_at: string;
  realms?: { slug?: string; name?: string } | null;
};

export default async function BuildLogPage() {
  const [transmissions, pulse] = await Promise.all([
    listTransmissions({ limit: 100 }),
    getFederationPulse(),
  ]);

  // Group by day for the timeline
  const byDay = new Map<string, Tx[]>();
  for (const tx of transmissions as unknown as Tx[]) {
    const day = (tx.created_at ?? "").slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(tx);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <main className="relative min-h-screen overflow-hidden nr-skin">
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm border grid place-items-center"
               style={{ borderColor: "hsla(var(--nr-magma), 0.6)", background: "hsla(var(--nr-magma), 0.08)" }}>
            <span className="font-mono text-[10px] nr-magma">NR</span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: "hsl(var(--nr-text))" }}>
            NEXT REALM · BUILD LOG
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/aura" className="nr-btn">Scan your aura</Link>
          <Link href="/forge" className="nr-btn nr-btn-magma">Talk to the Forge</Link>
        </div>
      </header>

      <section className="relative z-10 px-6 lg:px-10 pt-12 pb-10 max-w-5xl mx-auto">
        <p className="nr-eyebrow mb-8">— building in public · live federation timeline</p>
        <h1 className="nr-display text-5xl md:text-7xl max-w-4xl" style={{ color: "hsl(var(--nr-text))" }}>
          Every shipment. Every signal. <span className="nr-magma italic">No marketing pretense.</span>
        </h1>
        <div className="nr-rule mt-10 max-w-md" />
        <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: "hsl(var(--nr-muted))" }}>
          This is what 7-day shipping looks like. Every event the federation
          emits — operator activations, deployments, achievements, wonders,
          subscriptions — lands here within seconds.
        </p>
      </section>

      {/* PULSE STRIP */}
      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-5xl mx-auto">
        <div className="nr-card p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <PulseStat label="tx · all-time" value={pulse.transmissions_total} />
          <PulseStat label="tx · 24h"      value={pulse.transmissions_24h}   accent="magma" pulse />
          <PulseStat label="tx · 7d"       value={pulse.transmissions_7d} />
          <PulseStat label="ops"           value={pulse.operators_total}     accent="gold" />
        </div>
      </section>

      {/* TOP EVENTS — what we ship most */}
      {pulse.top_events_7d.length > 0 && (
        <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-5xl mx-auto">
          <p className="nr-eyebrow mb-3">— what we ship most · last 7 days</p>
          <div className="flex flex-wrap gap-2">
            {pulse.top_events_7d.map((e) => (
              <div key={e.event_name}
                   className="px-3 py-2 rounded-sm border flex items-center gap-2"
                   style={{ borderColor: "hsla(var(--nr-text), 0.12)", background: "hsla(var(--nr-card), 0.6)" }}>
                <span className="nr-magma font-mono text-sm">{EVENT_GLYPH[e.event_name] ?? "·"}</span>
                <span className="text-sm" style={{ color: "hsl(var(--nr-text))" }}>{EVENT_LABEL[e.event_name] ?? e.event_name}</span>
                <span className="font-mono text-[11px] nr-gold tabular-nums">×{e.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LIVE TICKER (realtime via GalaxyTicker) */}
      <section className="relative z-10 px-6 lg:px-10 pb-12 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="nr-eyebrow">— live · realtime</p>
          <span className="flex items-center gap-2 font-mono text-[10px]" style={{ color: "hsl(var(--nr-muted))" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--nr-magma))" }} />
            updating live
          </span>
        </div>
        <div className="nr-card p-2">
          <GalaxyTicker transmissions={transmissions as unknown as Array<Record<string, unknown>>} />
        </div>
      </section>

      {/* TIMELINE BY DAY */}
      <section className="relative z-10 px-6 lg:px-10 pb-20 max-w-5xl mx-auto">
        <p className="nr-eyebrow mb-6">— timeline · grouped by day</p>
        <div className="space-y-8">
          {days.map((day) => {
            const list = byDay.get(day) ?? [];
            const display = new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <div key={day} className="grid grid-cols-[auto_1fr] gap-6 md:gap-8">
                <div className="text-right">
                  <p className="nr-display text-2xl tabular-nums sticky top-6"
                     style={{ color: "hsl(var(--nr-text))" }}>{display.split(",")[0]}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em]"
                     style={{ color: "hsl(var(--nr-muted))" }}>{day.slice(0, 4)}</p>
                  <p className="font-mono text-[10px] mt-1" style={{ color: "hsl(var(--nr-muted))" }}>
                    {list.length} event{list.length === 1 ? "" : "s"}
                  </p>
                </div>
                <ul className="space-y-2 border-l-2 pl-6 relative"
                    style={{ borderColor: "hsla(var(--nr-magma), 0.3)" }}>
                  {list.map((tx) => {
                    const glyph = (tx.event_name && EVENT_GLYPH[tx.event_name]) ?? "·";
                    const label = (tx.event_name && EVENT_LABEL[tx.event_name]) ?? tx.event_name ?? tx.kind.toLowerCase();
                    return (
                      <li key={tx.id} className="relative">
                        <span className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full"
                              style={{ background: "hsl(var(--nr-magma))",
                                       boxShadow: "0 0 12px hsl(var(--nr-magma))" }} />
                        <div className="nr-card p-3">
                          <div className="flex items-center gap-2 text-[11px] mb-1">
                            <span className="font-mono nr-magma">{glyph}</span>
                            <span className="font-mono uppercase tracking-[0.16em] nr-magma">{label}</span>
                            {tx.realms?.slug && (
                              <Link href={`/realms/${tx.realms.slug}`}
                                    className="font-mono nr-gold hover:underline">
                                /{tx.realms.slug}
                              </Link>
                            )}
                            <span className="ml-auto font-mono"
                                  style={{ color: "hsl(var(--nr-muted))" }}>
                              {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: "hsl(var(--nr-text))" }}>{tx.title}</p>
                          {tx.body && (
                            <p className="text-xs mt-1" style={{ color: "hsl(var(--nr-muted))" }}>{tx.body}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {days.length === 0 && (
            <p className="text-sm italic" style={{ color: "hsl(var(--nr-muted))" }}>
              // no transmissions yet — when realms start shipping, the timeline fills here.
            </p>
          )}
        </div>
      </section>

      {/* CLOSE */}
      <section className="relative z-10 px-6 lg:px-10 pb-20 max-w-5xl mx-auto">
        <div className="nr-card p-8 md:p-10 text-center"
             style={{
               borderColor: "hsla(var(--nr-magma), 0.5)",
               boxShadow: "0 0 60px -20px hsla(var(--nr-magma), 0.5)",
             }}>
          <p className="nr-eyebrow">— want this motion?</p>
          <h2 className="nr-display text-3xl md:text-4xl mt-3" style={{ color: "hsl(var(--nr-text))" }}>
            We ship for operators on a <span className="nr-magma italic">7-day clock</span>.
          </h2>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link href="/aura" className="nr-btn nr-btn-magma">Scan your aura</Link>
            <Link href="/forge" className="nr-btn nr-btn-gold">Talk to the Forge</Link>
            <Link href="/ecosystem" className="nr-btn">See the ecosystem <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t py-6 px-6 lg:px-10 text-xs font-mono flex items-center justify-between"
              style={{ borderColor: "hsla(var(--nr-text), 0.08)", color: "hsl(var(--nr-muted))" }}>
        <span>// next realm · build log</span>
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
        <span className="nr-display tabular-nums" style={{ color, fontSize: "32px" }}>
          {value.toLocaleString()}
        </span>
        {pulse && value > 0 && (
          <span className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: "hsl(var(--nr-magma))" }} />
        )}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1"
         style={{ color: "hsl(var(--nr-muted))" }}>{label}</p>
    </div>
  );
}
