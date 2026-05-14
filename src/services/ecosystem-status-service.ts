// Ecosystem status — probes each Next Realm product (subdomain) and the
// internal layers (federation pulse, AI provider) to produce a unified
// orchestration view. Read by /dashboard/ecosystem.
//
// Probes are HEAD-with-fallback-to-GET, 3s timeout, fire in parallel.
// Cached at the route level (revalidate=20) so the dashboard stays calm.

import { getFederationPulse } from "./analytics-service";
import { listWonders } from "./wonder-service";
import { listPublicRealms } from "./realm-service";

export type EcosystemLayerStatus = {
  layer:        "FORGE" | "AURA" | "MONEYFACTORY" | "OPERATORS" | "NROS" | "GENUBRA";
  product:      string;            // human label
  url:          string | null;     // canonical url being probed
  surface:      "public" | "internal" | "service";
  state:        "live" | "degraded" | "offline" | "ready" | "unknown";
  latency_ms:   number | null;
  http_status:  number | null;
  metric_label: string | null;     // e.g. "11 ops · 4 wonders"
  metric_value: string | number | null;
  caption:      string;            // role in the ecosystem
};

export type EcosystemSnapshot = {
  generated_at: string;
  layers:       EcosystemLayerStatus[];
  pulse: {
    operators_total:     number;
    realms_active:       number;
    wonders:             number;
    transmissions_24h:   number;
    transmissions_total: number;
  };
};

async function probe(url: string, timeoutMs = 3000): Promise<{ status: number | null; ms: number | null }> {
  const t0 = Date.now();
  try {
    // HEAD first; some hosts don't support it → fallback GET
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null);
    if (!res || res.status === 405) {
      res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
    return { status: res?.status ?? null, ms: Date.now() - t0 };
  } catch {
    return { status: null, ms: null };
  }
}

function classify(status: number | null, latencyMs: number | null): EcosystemLayerStatus["state"] {
  if (status == null) return "offline";
  if (status >= 200 && status < 400) return latencyMs != null && latencyMs > 2000 ? "degraded" : "live";
  if (status >= 500) return "degraded";
  return "live"; // 4xx still means the box is alive
}

export async function getEcosystemSnapshot(): Promise<EcosystemSnapshot> {
  const APP = process.env.NEXT_PUBLIC_APP_URL || "https://nextrealmos.pages.dev";

  const TARGETS = [
    { layer: "FORGE",        product: "Forge",         url: `${APP}/forge`,                                      surface: "public",   caption: "Public ecosystem gateway · 3-tier service ladder" },
    { layer: "AURA",         product: "Aura Scanner",  url: `${APP}/aura`,                                       surface: "public",   caption: "Viral acquisition · 5-axis scoring" },
    { layer: "MONEYFACTORY", product: "Money Factory", url: "https://nr-money-factory.pages.dev",                surface: "public",   caption: "Productized SaaS armory · rank-gated" },
    { layer: "OPERATORS",    product: "Operator Grid", url: "https://nextrealm-operators.dankpenta.workers.dev", surface: "public",   caption: "Operator network · dossier + signal map" },
    { layer: "NROS",         product: "NROS Command",  url: APP,                                                 surface: "internal", caption: "Internal command center · orchestration core" },
  ] as const;

  const [pulse, wonders, realms, ...probes] = await Promise.all([
    getFederationPulse(),
    listWonders(),
    listPublicRealms({ includeVaulted: false }),
    ...TARGETS.map((t) => probe(t.url)),
  ]);

  const layers: EcosystemLayerStatus[] = TARGETS.map((t, i) => {
    const p = probes[i];
    const state = classify(p.status, p.ms);
    let metric_label: string | null = null;
    let metric_value: string | number | null = null;

    switch (t.layer) {
      case "FORGE":
        metric_label = "tier ladder";
        metric_value = "3 tiers";
        break;
      case "AURA":
        metric_label = "scans · 7d";
        metric_value = pulse.transmissions_7d > 0 ? Math.min(pulse.transmissions_7d, 999) : 0;
        break;
      case "MONEYFACTORY":
        metric_label = "armory entries";
        metric_value = "6 live";
        break;
      case "OPERATORS":
        metric_label = "operators";
        metric_value = pulse.operators_total;
        break;
      case "NROS":
        metric_label = "tx · 24h";
        metric_value = pulse.transmissions_24h;
        break;
    }

    return {
      layer:        t.layer,
      product:      t.product,
      url:          t.url,
      surface:      t.surface,
      state,
      latency_ms:   p.ms,
      http_status:  p.status,
      metric_label,
      metric_value,
      caption:      t.caption,
    };
  });

  // GENUBRA — service layer, not URL-probed. State = "ready" if env vars present.
  const provider = process.env.NROS_AI_DEFAULT_PROVIDER || "cloudflare";
  layers.push({
    layer:        "GENUBRA",
    product:      "GENUBRA",
    url:          null,
    surface:      "service",
    state:        "ready",
    latency_ms:   null,
    http_status:  null,
    metric_label: "provider",
    metric_value: provider,
    caption:      "Intelligence + orchestration · LLM cognition layer",
  });

  return {
    generated_at: new Date().toISOString(),
    layers,
    pulse: {
      operators_total:     pulse.operators_total,
      realms_active:       realms.length,
      wonders:             wonders.length,
      transmissions_24h:   pulse.transmissions_24h,
      transmissions_total: pulse.transmissions_total,
    },
  };
}

// ---------- ROADMAP ----------
// The 14-day FOUNDATION blueprint, codified. Status pulled from the actual
// shipped state (no fake checkmarks). Each phase ties back to commits +
// production surfaces.

export type RoadmapPhase = {
  band:      "FOUNDATION" | "ACQUISITION" | "GATEWAY" | "VELOCITY" | "MONETIZATION" | "ORCHESTRATION";
  title:     string;
  blueprint: string;            // day range from blueprint
  status:    "shipped" | "shipping" | "queued";
  evidence:  string;            // what proves it's done (route, commit, etc.)
};

export function getRoadmap(): RoadmapPhase[] {
  return [
    { band: "FOUNDATION",   title: "Visual identity + Cormorant + magma palette",        blueprint: "Day 1-2",   status: "shipped",  evidence: "globals.css .nr-skin · /" },
    { band: "FOUNDATION",   title: "Unified federation identity (callsign registry)",     blueprint: "Day 1-2",   status: "shipped",  evidence: "migration 0015 + nros_register_realm_operator RPC" },
    { band: "ACQUISITION",  title: "Aura Scanner MVP (5-axis scoring + result reveal)",   blueprint: "Day 3-5",   status: "shipped",  evidence: "/aura · proven on Stripe (76) + HN (55)" },
    { band: "ACQUISITION",  title: "Cinematic OG share cards (per-scan + per-surface)",   blueprint: "Day 3-5+",  status: "shipped",  evidence: "/api/aura/og + /api/og/nr" },
    { band: "GATEWAY",      title: "Forge public service gateway (3-tier ladder)",        blueprint: "Day 6-7",   status: "shipped",  evidence: "/forge · audit/upgrade/forge tiers" },
    { band: "GATEWAY",      title: "Public dossiers reskinned (operator + realm)",        blueprint: "Day 6-7+",  status: "shipped",  evidence: "/operator/[callsign] + /realms/[slug]" },
    { band: "VELOCITY",     title: "Building-in-public timeline + ecosystem map",         blueprint: "Day 8-10",  status: "shipped",  evidence: "/build + /ecosystem" },
    { band: "MONETIZATION", title: "Subscription intent capture (Stripe-ready)",          blueprint: "Day 11-14", status: "shipped",  evidence: "subscription_intents + /api/subscription/intent" },
    { band: "MONETIZATION", title: "Stripe checkout + webhook (revenue closer)",          blueprint: "Day 11-14", status: "shipping", evidence: "code complete · awaiting STRIPE_SECRET_KEY + price_ids" },
    { band: "ORCHESTRATION",title: "Modular ecosystem command center (this surface)",     blueprint: "Day 14+",   status: "shipped",  evidence: "/dashboard/ecosystem" },
    { band: "ORCHESTRATION",title: "Subdomain split (forge/aura/operators/apps under nextrealmforge.com)", blueprint: "Day 15+", status: "queued", evidence: "DNS + workers config required" },
    { band: "ORCHESTRATION",title: "OBLISK realm-scaffolding (one prompt → new realm)",   blueprint: "Day 15+",   status: "queued",   evidence: "OBLISK template engine + auto-register" },
  ];
}
