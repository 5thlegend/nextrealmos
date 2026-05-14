import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listRealmTiers, formatPrice } from "@/services/monetization-service";
import { getRealmBySlug } from "@/services/realm-service";
import { SubscribeButton } from "@/components/monetization/subscribe-button";

export const runtime = "edge";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) return { title: "Realm not found · NROS" };
  return {
    title: `${realm.name} · Tiers · NROS`,
    description: `Subscription tiers for ${realm.name}. Doctrine, drops, and access — published through NROS.`,
  };
}

export default async function RealmTiersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [realm, tiers] = await Promise.all([
    getRealmBySlug(slug),
    listRealmTiers(slug),
  ]);
  if (!realm) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nros-scanlines opacity-25" />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6 border-b border-border/40">
        <Link href={`/realms/${slug}`} className="font-mono text-xs tracking-[0.24em] uppercase hover:text-primary">
          ← {realm.name} dossier
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in?next=/dashboard">Sign in</Link>
        </Button>
      </header>

      <section className="relative z-10 px-6 lg:px-10 py-10 max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <p className="nros-eyebrow">// {realm.slug} · subscription doctrine</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{realm.name} · The Way</h1>
          <p className="text-sm text-muted-foreground">
            Choose your tier. Each one unlocks deeper access to the realm&apos;s doctrine, drops, and direct contact.
          </p>
        </div>

        {tiers.length === 0 ? (
          <Panel eyebrow="// no tiers published">
            <p className="text-sm text-muted-foreground">This realm hasn&apos;t published subscription tiers yet.</p>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier, i) => (
              <div
                key={tier.id}
                className="rounded-lg border bg-card/60 backdrop-blur-md p-5 flex flex-col relative overflow-hidden"
                style={{
                  borderColor: `${tier.banner_color}66`,
                  boxShadow: `0 0 32px -12px ${tier.banner_color}66`,
                }}
              >
                {i === tiers.length - 1 && (
                  <span
                    className="absolute -right-7 top-3 rotate-45 px-7 py-0.5 text-[8px] font-mono uppercase tracking-[0.2em]"
                    style={{ background: `${tier.banner_color}33`, color: tier.banner_color }}
                  >
                    apex
                  </span>
                )}
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold tracking-tight" style={{ color: tier.banner_color }}>
                    {tier.name}
                  </h3>
                </div>
                {tier.tagline && <p className="text-xs text-muted-foreground italic mb-3">{tier.tagline}</p>}
                <div className="mb-4">
                  <p className="text-3xl font-semibold tabular-nums">
                    {formatPrice(tier.price_cents, tier.currency)}
                  </p>
                  {tier.price_cents > 0 && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      / {tier.interval}
                    </p>
                  )}
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {tier.benefits.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs">
                      <Check className="h-3 w-3 shrink-0 mt-0.5" style={{ color: tier.banner_color }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {tier.rank_min && (
                  <div className="mb-3">
                    <Badge variant="muted">
                      <Lock className="h-2.5 w-2.5" /> requires {tier.rank_min}
                    </Badge>
                  </div>
                )}
                {tier.price_cents === 0 ? (
                  <Button asChild size="sm" className="w-full"
                          style={{ background: tier.banner_color, color: "#0a0a0a" }}>
                    <Link href={`/sign-in?next=/realms/${slug}`}>Activate</Link>
                  </Button>
                ) : (
                  <SubscribeButton
                    tierId={tier.id}
                    tierName={tier.name}
                    bannerColor={tier.banner_color}
                    priceLabel={formatPrice(tier.price_cents, tier.currency)}
                    source={`tier_card:${slug}:${tier.slug}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <Panel eyebrow="// how it works">
          <p className="text-xs text-muted-foreground">
            Click a tier to record your intent. The federation captures the
            signal immediately; once Stripe is wired, the same button takes
            you to checkout — no rebuild required.
          </p>
        </Panel>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 text-xs font-mono text-muted-foreground flex items-center justify-between">
        <span>// federation kernel v3</span>
        <Link href="/civilization" className="hover:text-primary">← back to civilization</Link>
      </footer>
    </main>
  );
}
