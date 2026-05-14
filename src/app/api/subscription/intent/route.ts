// POST /api/subscription/intent
// Records the click-to-subscribe intent BEFORE Stripe wires up.
// Body: { tier_id, email?, source? }
// Returns: { intent_id, redirect_url }
//
// Today: returns the existing onboarding redirect path so the click
// completes the funnel even pre-Stripe. Once STRIPE_SECRET_KEY lands,
// upgrade this route to create a Checkout Session and return its URL.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentOperator } from "@/services/operator-service";
import { rateLimit } from "@/lib/rate-limit";
import { pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

const Body = z.object({
  tier_id: z.string().uuid(),
  email:   z.string().email().max(254).optional(),
  source:  z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const limited = await rateLimit(req, { bucket: "sub:intent", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "invalid input" }, { status: 400 });
  }

  const op = await getCurrentOperator();
  const admin = createSupabaseAdmin();

  // Look up the tier so we can produce a sensible redirect + transmit
  const { data: tier } = await admin
    .from("realm_subscription_tiers")
    .select("id, slug, name, price_cents, currency, realm_id, realms(slug, name)")
    .eq("id", parsed.data.tier_id)
    .maybeSingle();
  if (!tier) return NextResponse.json({ error: "tier not found" }, { status: 404 });
  type TierRow = { id: string; slug: string; name: string; price_cents: number; currency: string; realm_id: string; realms: { slug?: string; name?: string } | null };
  const t = tier as TierRow;

  const { data: ins, error: insErr } = await admin
    .from("subscription_intents")
    .insert({
      tier_id:     t.id,
      operator_id: op?.profile.id ?? null,
      email:       parsed.data.email ?? null,
      source:      parsed.data.source ?? "tier_card",
      status:      "CLICKED",
      metadata: {
        tier_slug:  t.slug,
        tier_name:  t.name,
        price_cents: t.price_cents,
        realm_slug: t.realms?.slug,
      },
    })
    .select("id")
    .single();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Federation transmission so the intent shows in the live ticker.
  // Only push for non-anonymous intents (operator OR captured email)
  // to avoid spamming the feed with empty bot clicks.
  if (op || parsed.data.email) {
    await pushTransmission({
      realmId:     t.realm_id,
      operatorId:  op?.profile.id ?? null,
      kind:        "CUSTOM",
      eventName:   "subscription.intent",
      title:       `${op?.profile.callsign ?? parsed.data.email ?? "anon"} → ${t.name}`,
      metadata: {
        tier_slug: t.slug,
        price_cents: t.price_cents,
        currency: t.currency,
        source: parsed.data.source ?? "tier_card",
      },
    }).catch(() => undefined);
  }

  // Pre-Stripe redirect:
  //   - signed-in operator → /sign-in?next=/realms/[slug]/tiers (lands back on tiers w/ intent recorded)
  //   - anon → /sign-in?next=/realms/[slug]/tiers
  // Once Stripe is wired, we'll return a checkout.url here instead.
  const redirect_url = op
    ? `/realms/${t.realms?.slug ?? ""}/tiers?intent=${(ins as { id: string }).id}`
    : `/sign-in?next=${encodeURIComponent(`/realms/${t.realms?.slug ?? ""}/tiers?intent=${(ins as { id: string }).id}`)}`;

  return NextResponse.json({
    intent_id: (ins as { id: string }).id,
    tier:      { id: t.id, name: t.name, price_cents: t.price_cents, currency: t.currency },
    redirect_url,
    stripe_ready: false, // flips true when STRIPE_SECRET_KEY is set
  });
}
