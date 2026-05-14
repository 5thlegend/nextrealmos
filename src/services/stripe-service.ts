// Lightweight Stripe REST client for Edge runtime — avoids the Node SDK
// so /api/subscription/intent stays edge-deployable. When STRIPE_SECRET_KEY
// isn't set, every method here returns null and the caller falls back to
// the pre-Stripe flow.

const STRIPE_API = "https://api.stripe.com/v1";

export type CheckoutSessionInput = {
  priceId:        string;
  customerEmail?: string | null;
  successUrl:     string;
  cancelUrl:      string;
  clientReferenceId?: string;
  metadata?:      Record<string, string>;
};

export type CheckoutSession = {
  id: string;
  url: string;
};

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY?.trim());
}

function form(fields: Record<string, string | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, v);
  }
  return params;
}

/** Creates a Subscription-mode Checkout Session. Returns null if Stripe
 *  isn't configured, throws on real Stripe errors. */
export async function createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;

  const body = form({
    "mode":                          "subscription",
    "line_items[0][price]":          input.priceId,
    "line_items[0][quantity]":       "1",
    "success_url":                   input.successUrl,
    "cancel_url":                    input.cancelUrl,
    "customer_email":                input.customerEmail ?? undefined,
    "client_reference_id":           input.clientReferenceId,
    "allow_promotion_codes":         "true",
    "billing_address_collection":    "auto",
  });

  // Stripe metadata as bracket-keyed form fields
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      body.set(`metadata[${k}]`, String(v));
    }
  }

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      "authorization":  `Bearer ${key}`,
      "content-type":   "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`stripe ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { id: string; url: string };
  return { id: json.id, url: json.url };
}
