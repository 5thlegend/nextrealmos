// POST /api/subscription/intent
// Body: { tier_id, email?, source? }
//
// Always records the click as a subscription_intent (lead + federation tx).
// Then:
//   - If STRIPE_SECRET_KEY is set AND tier has stripe_price_id → creates a
//     real Stripe Checkout Session, marks intent CHECKOUT_STARTED, returns
//     checkout_url. Stripe failures fall through gracefully.
//   - Otherwise returns the pre-Stripe redirect (sign-in or back-to-tiers).
// Same response shape so SubscribeButton just reads checkout_url || redirect_url.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentOperator } from "@/services/operator-service";
import { rateLimit } from "@/lib/rate-limit";
import { pushTransmission } from "@/services/transmission-service";
import { isStripeConfigured, createCheckoutSession } from "@/services/stripe-service";

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

  // Look up the tier (now also reads stripe_price_id for the Stripe path)
  const { data: tier } = await admin
    .from("realm_subscription_tiers")
    .select("id, slug, name, price_cents, currency, stripe_price_id, realm_id, realms(slug, name)")
    .eq("id", parsed.data.tier_id)
    .maybeSingle();
  if (!tier) return NextResponse.json({ error: "tier not found" }, { status: 404 });
  type TierRow = {
    id: string; slug: string; name: string; price_cents: number; currency: string;
    stripe_price_id: string | null; realm_id: string;
    realms: { slug?: string; name?: string } | null;
  };
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
  const intentId = (ins as { id: string }).id;

  // Federation transmission for non-anonymous clicks
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

  // STRIPE PATH — only if both: key set AND tier has price_id
  const stripeReady = isStripeConfigured() && !!t.stripe_price_id;
  if (stripeReady && t.stripe_price_id) {
    const origin = new URL(req.url).origin;
    try {
      const session = await createCheckoutSession({
        priceId: t.stripe_price_id,
        customerEmail: op ? null : (parsed.data.email ?? null),
        successUrl: `${origin}/realms/${t.realms?.slug ?? ""}/tiers?intent=${intentId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl:  `${origin}/realms/${t.realms?.slug ?? ""}/tiers?intent=${intentId}&checkout=cancelled`,
        clientReferenceId: intentId,
        metadata: {
          intent_id:   intentId,
          tier_id:     t.id,
          tier_slug:   t.slug,
          realm_slug:  t.realms?.slug ?? "",
          operator_id: op?.profile.id ?? "",
          callsign:    op?.profile.callsign ?? "",
          source:      parsed.data.source ?? "tier_card",
        },
      });
      if (session) {
        await admin
          .from("subscription_intents")
          .update({ status: "CHECKOUT_STARTED", stripe_session_id: session.id })
          .eq("id", intentId);
        return NextResponse.json({
          intent_id:    intentId,
          tier:         { id: t.id, name: t.name, price_cents: t.price_cents, currency: t.currency },
          checkout_url: session.url,
          stripe_ready: true,
        });
      }
    } catch (e) {
      // Don't fail the click — lead is still captured. Fall through.
      console.error("[stripe] checkout failed:", e instanceof Error ? e.message : e);
    }
  }

  // PRE-STRIPE / FALLBACK
  const redirect_url = op
    ? `/realms/${t.realms?.slug ?? ""}/tiers?intent=${intentId}`
    : `/sign-in?next=${encodeURIComponent(`/realms/${t.realms?.slug ?? ""}/tiers?intent=${intentId}`)}`;

  return NextResponse.json({
    intent_id:    intentId,
    tier:         { id: t.id, name: t.name, price_cents: t.price_cents, currency: t.currency },
    redirect_url,
    stripe_ready: false,
  });
}
