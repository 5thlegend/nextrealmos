import { createSupabaseServer } from "@/lib/supabase/server";

export type SubscriptionTier = {
  id: string;
  realm_id: string;
  realm_slug: string | null;
  realm_name: string | null;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  stripe_price_id: string | null;
  benefits: string[];
  rank_min: string | null;
  banner_color: string;
  order_index: number;
};

export async function listRealmTiers(realmSlug: string): Promise<SubscriptionTier[]> {
  const supabase = await createSupabaseServer();
  const { data: realm } = await supabase.from("realms").select("id, name").ilike("slug", realmSlug).maybeSingle();
  if (!realm) return [];
  const { data } = await supabase
    .from("realm_subscription_tiers")
    .select("*")
    .eq("realm_id", (realm as { id: string }).id)
    .eq("status", "ACTIVE")
    .order("order_index", { ascending: true });

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id:               r.id as string,
    realm_id:         r.realm_id as string,
    realm_slug:       realmSlug,
    realm_name:       (realm as { name: string }).name,
    slug:             r.slug as string,
    name:             r.name as string,
    tagline:          (r.tagline as string | null) ?? null,
    description:      (r.description as string | null) ?? null,
    price_cents:      Number(r.price_cents ?? 0),
    currency:         (r.currency as string) ?? "USD",
    interval:         (r.interval as string) ?? "month",
    stripe_price_id:  (r.stripe_price_id as string | null) ?? null,
    benefits:         (Array.isArray(r.benefits) ? r.benefits as string[] : []),
    rank_min:         (r.rank_min as string | null) ?? null,
    banner_color:     (r.banner_color as string) ?? "#7c5cff",
    order_index:      Number(r.order_index ?? 0),
  }));
}

export type ArmoryEntry = {
  realm_id: string;
  realm_slug: string;
  realm_name: string;
  realm_description: string | null;
  category: string | null;
  monthly_revenue_cents: number;
  unlock_rank_tier: string | null;
  notes: string | null;
};

export async function listArmoryEntries(): Promise<ArmoryEntry[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("money_factory_entries")
    .select("realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes, realms(slug, name, description)")
    .order("monthly_revenue_cents", { ascending: false });

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const realm = r.realms as { slug?: string; name?: string; description?: string | null } | null;
    return {
      realm_id:          r.realm_id as string,
      realm_slug:        realm?.slug ?? "",
      realm_name:        realm?.name ?? "",
      realm_description: realm?.description ?? null,
      category:          (r.category as string | null) ?? null,
      monthly_revenue_cents: Number(r.monthly_revenue_cents ?? 0),
      unlock_rank_tier:  (r.unlock_rank_tier as string | null) ?? null,
      notes:             (r.notes as string | null) ?? null,
    };
  });
}

export function formatPrice(cents: number, currency = "USD"): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(cents / 100);
}
