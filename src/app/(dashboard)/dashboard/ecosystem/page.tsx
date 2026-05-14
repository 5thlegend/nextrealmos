import Link from "next/link";
import { Activity, ArrowUpRight, Brain, CheckCircle2, Circle, Clock, ExternalLink, Hammer, Coins, Compass, Globe, Zap } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { getEcosystemSnapshot, getRoadmap, type EcosystemLayerStatus, type RoadmapPhase } from "@/services/ecosystem-status-service";

export const runtime = "edge";
export const revalidate = 20;

const LAYER_ICON: Record<EcosystemLayerStatus["layer"], React.ComponentType<{ className?: string }>> = {
  FORGE:        Hammer,
  AURA:         Brain,
  MONEYFACTORY: Coins,
  OPERATORS:    Globe,
  NROS:         Zap,
  GENUBRA:      Compass,
};

const STATE_COLOR: Record<EcosystemLayerStatus["state"], string> = {
  live:     "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  ready:    "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  degraded: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  offline:  "border-rose-500/40 bg-rose-500/10 text-rose-300",
  unknown:  "border-border/40 bg-secondary/40 text-muted-foreground",
};

const BAND_COLOR: Record<RoadmapPhase["band"], string> = {
  FOUNDATION:    "text-cyan-300",
  ACQUISITION:   "text-amber-300",
  GATEWAY:       "text-violet-300",
  VELOCITY:      "text-emerald-300",
  MONETIZATION:  "text-rose-300",
  ORCHESTRATION: "text-primary",
};

const STATUS_ICON: Record<RoadmapPhase["status"], React.ComponentType<{ className?: string }>> = {
  shipped:  CheckCircle2,
  shipping: Activity,
  queued:   Circle,
};

const STATUS_COLOR: Record<RoadmapPhase["status"], string> = {
  shipped:  "text-emerald-400",
  shipping: "text-amber-400 animate-pulse",
  queued:   "text-muted-foreground",
};

export default async function EcosystemCommandPage() {
  const snapshot = await getEcosystemSnapshot();
  const roadmap = getRoadmap();

  const liveCount = snapshot.layers.filter((l) => l.state === "live" || l.state === "ready").length;
  const totalLayers = snapshot.layers.length;
  const shippedCount = roadmap.filter((p) => p.status === "shipped").length;
  const shippingCount = roadmap.filter((p) => p.status === "shipping").length;
  const queuedCount = roadmap.filter((p) => p.status === "queued").length;

  // Group roadmap by band
  const byBand = new Map<RoadmapPhase["band"], RoadmapPhase[]>();
  for (const phase of roadmap) {
    if (!byBand.has(phase.band)) byBand.set(phase.band, []);
    byBand.get(phase.band)!.push(phase);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// orchestration · ecosystem command</p>
        <h1 className="text-2xl font-semibold tracking-tight">Ecosystem</h1>
        <p className="text-sm text-muted-foreground">
          Every Next Realm product, every layer, every deployment — at a glance.
          NROS is the orchestration core that binds them.
        </p>
      </header>

      {/* TOP-LEVEL STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="// layers live" value={`${liveCount}/${totalLayers}`} hint="ecosystem health" trend={liveCount === totalLayers ? "up" : "flat"} />
        <Stat label="// realms"      value={snapshot.pulse.realms_active}     hint="federated · active" />
        <Stat label="// operators"   value={snapshot.pulse.operators_total}   hint="enlisted" />
        <Stat label="// wonders"     value={snapshot.pulse.wonders}           hint="federation marquee" />
        <Stat label="// tx · 24h"    value={snapshot.pulse.transmissions_24h} hint="federation pulse" trend={snapshot.pulse.transmissions_24h > 0 ? "up" : "flat"} />
      </div>

      {/* LAYER STATUS GRID */}
      <Panel eyebrow={`// product layers · ${liveCount}/${totalLayers} live`} title="Live deployment status" scanlines>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {snapshot.layers.map((l) => {
            const Icon = LAYER_ICON[l.layer];
            return (
              <article key={l.layer} className="nros-deck p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {l.layer}
                      </p>
                      <p className="font-semibold text-sm truncate">{l.product}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-mono uppercase tracking-[0.14em] ${STATE_COLOR[l.state]}`}>
                    <span className={`h-1 w-1 rounded-full ${l.state === "live" || l.state === "ready" ? "bg-current animate-pulse" : "bg-current"}`} />
                    {l.state}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{l.caption}</p>

                <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <p className="text-muted-foreground/80 uppercase tracking-[0.14em]">{l.metric_label ?? "—"}</p>
                    <p className="text-foreground tabular-nums mt-0.5">{l.metric_value ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/80 uppercase tracking-[0.14em]">latency</p>
                    <p className="text-foreground tabular-nums mt-0.5">
                      {l.latency_ms != null ? `${l.latency_ms} ms` : "—"}
                      {l.http_status != null && <span className="text-muted-foreground ml-1">· {l.http_status}</span>}
                    </p>
                  </div>
                </div>

                {l.url && (
                  <a href={l.url} target="_blank" rel="noreferrer"
                     className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline">
                    <ExternalLink className="h-2.5 w-2.5" />
                    {l.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </Panel>

      {/* ROADMAP TRACKER */}
      <Panel
        eyebrow={`// roadmap · ${shippedCount} shipped · ${shippingCount} shipping · ${queuedCount} queued`}
        title="The 14-day blueprint"
      >
        <div className="space-y-5">
          {Array.from(byBand.entries()).map(([band, phases]) => (
            <div key={band}>
              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] mb-2 ${BAND_COLOR[band]}`}>
                {band}
              </p>
              <ul className="space-y-1.5">
                {phases.map((p, i) => {
                  const StatusIcon = STATUS_ICON[p.status];
                  return (
                    <li key={`${band}-${i}`} className="flex items-start gap-3 px-3 py-2 rounded-md border border-border/30 bg-card/30">
                      <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${STATUS_COLOR[p.status]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium">{p.title}</p>
                          <p className="font-mono text-[10px] text-muted-foreground shrink-0">{p.blueprint}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">{p.evidence}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      {/* QUICK HOPS */}
      <Panel eyebrow="// quick hops · public storefront">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { href: "/", label: "OS", icon: Zap },
            { href: "/forge", label: "Forge", icon: Hammer },
            { href: "/aura", label: "Aura", icon: Brain },
            { href: "/civilization", label: "Civilization", icon: Compass },
            { href: "/build", label: "Build Log", icon: Activity },
          ].map((item) => {
            const I = item.icon;
            return (
              <Link key={item.href} href={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 bg-card/40 hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm">
                <I className="h-3.5 w-3.5 text-primary" />
                <span>{item.label}</span>
                <ArrowUpRight className="h-2.5 w-2.5 ml-auto text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </Panel>

      <p className="text-[10px] font-mono text-muted-foreground text-center">
        // snapshot generated {new Date(snapshot.generated_at).toLocaleString()} · revalidates every 20s · <Clock className="inline h-2.5 w-2.5 -mt-0.5" /> live probes parallel · 3s timeout each
      </p>
    </div>
  );
}
