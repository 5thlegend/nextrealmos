"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOperator } from "@/services/operator-service";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { pushTransmission } from "@/services/transmission-service";

export type IntentState = { error?: string; ok?: boolean };

export async function captureIntentAction(
  _prev: IntentState,
  formData: FormData,
): Promise<IntentState> {
  const op = await getCurrentOperator();
  if (!op) return { error: "Not authenticated" };

  const tierId = formData.get("tier_id");
  const realmSlug = formData.get("realm_slug");
  const tierSlug = formData.get("tier_slug");
  if (typeof tierId !== "string" || typeof realmSlug !== "string" || typeof tierSlug !== "string") {
    return { error: "Bad request" };
  }

  const admin = createSupabaseAdmin();
  const { data: tier } = await admin
    .from("realm_subscription_tiers")
    .select("id, realm_id, name, price_cents, currency, interval, banner_color")
    .eq("id", tierId)
    .maybeSingle();
  if (!tier) return { error: "Tier not found" };

  const { error } = await admin
    .from("subscription_intents")
    .upsert(
      {
        operator_id: op.profile.id,
        tier_id: (tier as { id: string }).id,
        source: `/realms/${realmSlug}/tiers/${tierSlug}/checkout`,
      },
      { onConflict: "operator_id,tier_id" },
    );
  if (error) return { error: error.message };

  const t = tier as { realm_id: string; name: string; price_cents: number; currency: string; interval: string; banner_color: string };

  // Federation transmission so the realm owner sees demand land in /transmissions
  await pushTransmission({
    realmId: t.realm_id,
    operatorId: op.profile.id,
    kind: "CUSTOM",
    eventName: "subscription.intent",
    title: `${op.profile.callsign} expressed intent to subscribe — ${t.name}`,
    body: null,
    metadata: {
      tier_id: tierId,
      tier_slug: tierSlug,
      tier_name: t.name,
      price_cents: t.price_cents,
      currency: t.currency,
      interval: t.interval,
      banner_color: t.banner_color,
    },
  }).catch(() => undefined);

  revalidatePath(`/realms/${realmSlug}/tiers/${tierSlug}/checkout`);
  return { ok: true };
}
