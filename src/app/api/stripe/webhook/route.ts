// POST /api/stripe/webhook
// Stripe webhook receiver. Verifies the Stripe-Signature header, then
// branches on event type:
//   checkout.session.completed       → mark intent COMPLETED, mint
//                                      operator_subscriptions row, emit
//                                      federation transmission
//                                      (subscription.start)
//   customer.subscription.deleted    → mark sub CANCELED, emit
//                                      subscription.cancel
//   invoice.payment_failed           → mark sub PAST_DUE
//
// Set the webhook endpoint to /api/stripe/webhook in the Stripe dashboard
// and put the signing secret in STRIPE_WEBHOOK_SECRET on the Pages env.

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

/** Verify the Stripe-Signature header per
 *  https://docs.stripe.com/webhooks#verify-manually  */
async function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSec = 300): Promise<boolean> {
  // Header: "t=<unix>,v1=<sig>,v1=<sig>,..."
  const parts = Object.fromEntries(header.split(",").map((kv) => {
    const i = kv.indexOf("=");
    return [kv.slice(0, i), kv.slice(i + 1)];
  }));
  const t = parts.t;
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0) return false;

  // Tolerance check (replay protection)
  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSec) return false;

  // Compute expected
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time-ish comparison via length check + char-equality
  return sigs.some((s) => s.length === expected.length && s === expected);
}

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 });

  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();
  const ok = await verifyStripeSignature(payload, sigHeader, secret).catch(() => false);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Record<string, unknown>;
      const intentId = String((s.metadata as Record<string, string> | undefined)?.intent_id ?? "");
      const tierId   = String((s.metadata as Record<string, string> | undefined)?.tier_id ?? "");
      const opId     = String((s.metadata as Record<string, string> | undefined)?.operator_id ?? "") || null;
      const callsign = String((s.metadata as Record<string, string> | undefined)?.callsign ?? "");
      const realmSlug = String((s.metadata as Record<string, string> | undefined)?.realm_slug ?? "");
      const subId    = String(s.subscription ?? "");
      const sessionId = String(s.id ?? "");

      if (intentId) {
        await admin
          .from("subscription_intents")
          .update({ status: "COMPLETED", stripe_session_id: sessionId })
          .eq("id", intentId);
      }

      if (opId && tierId) {
        await admin
          .from("operator_subscriptions")
          .upsert({
            operator_id: opId,
            tier_id:     tierId,
            state:       "ACTIVE",
            stripe_subscription_id: subId || null,
          }, { onConflict: "operator_id,tier_id" });
      }

      // Look up the realm so we can route the transmission correctly
      if (tierId) {
        const { data: tier } = await admin
          .from("realm_subscription_tiers")
          .select("realm_id, name, price_cents, currency")
          .eq("id", tierId)
          .maybeSingle();
        const t = tier as { realm_id?: string; name?: string; price_cents?: number; currency?: string } | null;
        if (t?.realm_id) {
          await pushTransmission({
            realmId:     t.realm_id,
            operatorId:  opId,
            kind:        "ECONOMY_TX",
            eventName:   "subscription.start",
            title:       `${callsign || "operator"} subscribed to ${t.name ?? "tier"}`,
            metadata: {
              tier_id: tierId,
              realm_slug: realmSlug,
              session_id: sessionId,
              subscription_id: subId,
              amount_cents: t.price_cents ?? 0,
              currency: t.currency ?? "USD",
            },
          }).catch(() => undefined);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const s = event.data.object as Record<string, unknown>;
      const subId = String(s.id ?? "");
      if (!subId) break;
      const { data: row } = await admin
        .from("operator_subscriptions")
        .update({ state: "CANCELED" })
        .eq("stripe_subscription_id", subId)
        .select("operator_id, tier_id")
        .maybeSingle();
      const r = row as { operator_id?: string; tier_id?: string } | null;
      if (r?.tier_id) {
        const { data: tier } = await admin
          .from("realm_subscription_tiers")
          .select("realm_id, name")
          .eq("id", r.tier_id)
          .maybeSingle();
        const t = tier as { realm_id?: string; name?: string } | null;
        if (t?.realm_id) {
          await pushTransmission({
            realmId:    t.realm_id,
            operatorId: r.operator_id ?? null,
            kind:       "ECONOMY_TX",
            eventName:  "subscription.cancel",
            title:      `subscription canceled · ${t.name ?? "tier"}`,
            metadata: { subscription_id: subId },
          }).catch(() => undefined);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const s = event.data.object as Record<string, unknown>;
      const subId = String(s.subscription ?? "");
      if (subId) {
        await admin
          .from("operator_subscriptions")
          .update({ state: "PAST_DUE" })
          .eq("stripe_subscription_id", subId);
      }
      break;
    }

    default:
      // Ignore unknown event types — Stripe expects 2xx for any received event
      break;
  }

  return NextResponse.json({ received: true, type: event.type });
}
