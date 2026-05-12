import { createSupabaseServer } from "@/lib/supabase/server";
import type { CivilizationEra } from "./achievement-service";

export interface Wonder {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  realm_id: string;
  realm_slug: string | null;
  realm_name: string | null;
  builder_id: string | null;
  builder_callsign: string | null;
  era: CivilizationEra;
  banner_color: string;
  icon: string;
  effect: string | null;
  built_at: string;
}

export async function listWonders(): Promise<Wonder[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("wonders")
    .select("id, slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect, built_at, realms(slug, name), operator_profiles(callsign)")
    .eq("visible", true)
    .order("built_at", { ascending: false });

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id:         r.id as string,
    slug:       r.slug as string,
    name:       r.name as string,
    tagline:    r.tagline as string,
    description: r.description as string | null,
    realm_id:   r.realm_id as string,
    realm_slug: ((r.realms as { slug?: string } | null)?.slug) ?? null,
    realm_name: ((r.realms as { name?: string } | null)?.name) ?? null,
    builder_id: r.builder_id as string | null,
    builder_callsign: ((r.operator_profiles as { callsign?: string } | null)?.callsign) ?? null,
    era:        r.era as CivilizationEra,
    banner_color: r.banner_color as string,
    icon:       r.icon as string,
    effect:     r.effect as string | null,
    built_at:   r.built_at as string,
  }));
}

export async function getWonderCountsByRealm(): Promise<Map<string, number>> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("realm_wonder_counts")
    .select("realm_id, wonder_count");
  const map = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ realm_id: string; wonder_count: number }>) {
    map.set(r.realm_id, r.wonder_count);
  }
  return map;
}
