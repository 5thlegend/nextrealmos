// Reads the civilization graph: realms, operators, elite leaders, agents,
// transmissions. Backs the Realm Graph Engine.

import { createSupabaseServer } from "@/lib/supabase/server";

export type CivilizationOverview = {
  active_realms: number;
  vaulted_realms: number;
  total_operators: number;
  elite_leaders: number;
  agents_running: number;
  total_monthly_revenue_cents: string | number;
  transmissions_24h: number;
};

export type RealmGraphNode = {
  id: string;
  slug: string;
  name: string;
  status: string;
  base_url: string | null;
  icon_url: string | null;
  vaulted_at: string | null;
  operator_count: number;
  elite_count: number;
  agent_count: number;
  transmissions_24h: number;
  monthly_revenue_cents: number;
  created_at: string;
};

export type EliteLeaderRow = {
  id: string;
  operator_id: string;
  realm_id: string | null;
  role: "WARDEN" | "ARCHITECT" | "DIPLOMAT" | "OVERSEER";
  appointed_at: string;
  operator_callsign?: string;
  realm_slug?: string | null;
};

export type AgentRow = {
  id: string;
  realm_id: string | null;
  kind: "GENUBRA" | "OBLISK" | "SCRIBE" | "SCOUT" | "HARVESTER" | "SENTINEL" | "CUSTOM";
  name: string;
  status: "IDLE" | "RUNNING" | "PAUSED" | "ARCHIVED" | "FAULT";
  realm_slug?: string | null;
};

export async function getCivilizationOverview(): Promise<CivilizationOverview | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("civilization_overview").select("*").maybeSingle();
  return (data as CivilizationOverview) ?? null;
}

export async function listRealmNodes(): Promise<RealmGraphNode[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("realm_graph_nodes")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as RealmGraphNode[];
}

export async function listEliteLeaders(): Promise<EliteLeaderRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("elite_leaders")
    .select("id, operator_id, realm_id, role, appointed_at, operator_profiles(callsign), realms(slug)")
    .order("appointed_at", { ascending: false });
  return (data ?? []).map((row: any) => ({
    id: row.id,
    operator_id: row.operator_id,
    realm_id: row.realm_id,
    role: row.role,
    appointed_at: row.appointed_at,
    operator_callsign: row.operator_profiles?.callsign ?? undefined,
    realm_slug: row.realms?.slug ?? null,
  }));
}

export async function listAgents(): Promise<AgentRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("agents")
    .select("id, realm_id, kind, name, status, realms(slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    realm_id: row.realm_id,
    kind: row.kind,
    name: row.name,
    status: row.status,
    realm_slug: row.realms?.slug ?? null,
  }));
}
