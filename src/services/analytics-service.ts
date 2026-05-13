// Civilization analytics — federation-wide growth + activity metrics.
// Powers the dashboard's federation pulse panel + future admin views.

import { createSupabaseAdmin } from "@/lib/supabase/server";

export type FederationPulse = {
  operators_total: number;
  operators_24h:   number;
  operators_7d:    number;
  realms_active:   number;
  realms_vaulted:  number;
  transmissions_total: number;
  transmissions_24h:   number;
  transmissions_7d:    number;
  xp_total:        number;
  xp_24h:          number;
  xp_7d:           number;
  achievements_unlocked_total: number;
  achievements_unlocked_24h:   number;
  wonders_total:   number;
  /** XP per day for the last 14 days. */
  xp_sparkline:    Array<{ day: string; xp: number }>;
  /** Top 5 most-traffic event_names in the last 7 days. */
  top_events_7d:   Array<{ event_name: string; count: number }>;
};

export async function getFederationPulse(): Promise<FederationPulse> {
  const admin = createSupabaseAdmin();
  const now = Date.now();
  const day  = new Date(now - 1  * 24 * 60 * 60 * 1000).toISOString();
  const week = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();

  const [
    opsTotal, ops24, ops7d,
    realmsActive, realmsVault,
    txTotal, tx24, tx7d,
    xpAll, xp14,
    achTotal, ach24,
    wondersTotal,
    topEvents,
  ] = await Promise.all([
    admin.from("operator_profiles").select("id", { count: "exact", head: true }),
    admin.from("operator_profiles").select("id", { count: "exact", head: true }).gte("created_at", day),
    admin.from("operator_profiles").select("id", { count: "exact", head: true }).gte("created_at", week),
    admin.from("realms").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    admin.from("realms").select("id", { count: "exact", head: true }).not("vaulted_at", "is", null),
    admin.from("transmissions").select("id", { count: "exact", head: true }),
    admin.from("transmissions").select("id", { count: "exact", head: true }).gte("created_at", day),
    admin.from("transmissions").select("id", { count: "exact", head: true }).gte("created_at", week),
    admin.from("xp_logs").select("delta"),
    admin.from("xp_logs").select("delta, created_at").gte("created_at", new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from("operator_achievements").select("operator_id", { count: "exact", head: true }),
    admin.from("operator_achievements").select("operator_id", { count: "exact", head: true }).gte("awarded_at", day),
    admin.from("wonders").select("id", { count: "exact", head: true }).eq("visible", true),
    admin.from("transmissions").select("event_name").gte("created_at", week).not("event_name", "is", null),
  ]);

  const xpRows14 = (xp14.data ?? []) as Array<{ delta: number; created_at: string }>;
  const xpAllRows = (xpAll.data ?? []) as Array<{ delta: number }>;

  // Build sparkline: 14 days, summed XP per day
  const sparkMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    sparkMap.set(d, 0);
  }
  for (const r of xpRows14) {
    const k = r.created_at.slice(0, 10);
    if (sparkMap.has(k)) sparkMap.set(k, (sparkMap.get(k) ?? 0) + Math.max(0, r.delta));
  }

  // 24h XP
  const xp24Sum = xpRows14
    .filter((r) => r.created_at >= day)
    .reduce((sum, r) => sum + Math.max(0, r.delta), 0);
  const xp7dSum = xpRows14
    .filter((r) => r.created_at >= week)
    .reduce((sum, r) => sum + Math.max(0, r.delta), 0);

  // Top events
  const eventCounts = new Map<string, number>();
  for (const r of (topEvents.data ?? []) as Array<{ event_name: string }>) {
    eventCounts.set(r.event_name, (eventCounts.get(r.event_name) ?? 0) + 1);
  }
  const top = Array.from(eventCounts.entries())
    .map(([event_name, count]) => ({ event_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    operators_total: opsTotal.count ?? 0,
    operators_24h:   ops24.count ?? 0,
    operators_7d:    ops7d.count ?? 0,
    realms_active:   realmsActive.count ?? 0,
    realms_vaulted:  realmsVault.count ?? 0,
    transmissions_total: txTotal.count ?? 0,
    transmissions_24h:   tx24.count ?? 0,
    transmissions_7d:    tx7d.count ?? 0,
    xp_total: xpAllRows.reduce((s, r) => s + Math.max(0, r.delta), 0),
    xp_24h:   xp24Sum,
    xp_7d:    xp7dSum,
    achievements_unlocked_total: achTotal.count ?? 0,
    achievements_unlocked_24h:   ach24.count ?? 0,
    wonders_total: wondersTotal.count ?? 0,
    xp_sparkline: Array.from(sparkMap.entries()).map(([day, xp]) => ({ day, xp })),
    top_events_7d: top,
  };
}
