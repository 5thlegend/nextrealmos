import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listRealmTiers, formatPrice } from "@/services/monetization-service";
import { getCurrentOperator } from "@/services/operator-service";
import { getRealmBySlug } from "@/services/realm-service";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { IntentForm } from "./intent-form";

export const runtime = "edge";

/**
 * Tier checkout pre-screen. Operator-auth required. Renders the chosen
 * tier with full benefits + a "Continue to payment" CTA. The actual
 * Stripe checkout session is the next wave (env.STRIPE_SECRET pending);
 * for now this surface confirms the doctrine + collects intent so the
 * jump to Stripe is one click when wiring lands.
 */
export default async function TierCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string; tier: string }>;
}) {
  const { slug, tier: tierSlug } = await params;
  const op = await getCurrentOperator();
  if (!op) redirect(`/sign-in?next=/realms/${slug}/tiers/${tierSlug}/checkout`);

  const [realm, tiers] = await Promise.all([
    getRealmBySlug(slug),
    listRealmTiers(slug),
  ]);
  if (!realm) notFound();
  const tier = tiers.find((t) => t.slug === tierSlug);
  if (!tier) notFound();

  // Has the operator already expressed intent?
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from("subscription_intents")
    .select("id")
    .eq("operator_id", op.profile.id)
    .eq("tier_id", tier.id)
    .maybeSingle();
  const alreadyExpressed = !!existing;

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/realms/${slug}/tiers`}><ArrowLeft className="h-3 w-3" /> {realm.name} tiers</Link>
        </Button>
      </div>

      <Panel
        eyebrow={`// ${realm.slug} · checkout`}
        title="Confirm your subscription"
        scanlines
      >
        <div
          className="rounded-md border p-5 mb-4"
          style={{
            borderColor: `${tier.banner_color}66`,
            boxShadow: `0 0 32px -12px ${tier.banner_color}66`,
          }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: tier.banner_color }}>
              {tier.name}
            </h2>
            <p className="text-3xl font-semibold tabular-nums">
              {formatPrice(tier.price_cents, tier.currency)}
              {tier.price_cents > 0 && (
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground ml-1">
                  / {tier.interval}
                </span>
              )}
            </p>
          </div>
          {tier.tagline && <p className="text-sm text-muted-foreground italic mb-3">{tier.tagline}</p>}
          {tier.description && <p className="text-sm mb-4">{tier.description}</p>}

          <div className="space-y-2">
            <p className="nros-eyebrow">// what you get</p>
            <ul className="space-y-2">
              {tier.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-3 w-3 shrink-0 mt-1" style={{ color: tier.banner_color }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Subscribing as <span className="font-mono text-primary">{op.profile.callsign}</span>.
            You can cancel any time from your operator settings.
          </p>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                // pre-launch
              </p>
            </div>
            <p className="text-sm text-foreground/90 mb-2">
              Stripe checkout wires up in the next deploy. Your intent is recorded; the
              moment Stripe is live, the realm owner reaches out with a checkout link
              to honor your tier from this page&apos;s timestamp.
            </p>
            <Badge variant="warn">PRICE LOCKED · {formatPrice(tier.price_cents, tier.currency)}/{tier.interval}</Badge>
          </div>

          <IntentForm
            tierId={tier.id}
            realmSlug={slug}
            tierSlug={tierSlug}
            alreadyExpressed={alreadyExpressed}
          />

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/realms/${slug}/tiers`}>Compare tiers</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/realms/${slug}`}>Back to {realm.name}</Link>
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
