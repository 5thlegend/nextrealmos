import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, Landmark, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { GalaxyTicker } from "@/components/nros/galaxy-ticker";
import { createSupabaseServer } from "@/lib/supabase/server";
import { listTransmissions } from "@/services/transmission-service";
import { listWonders } from "@/services/wonder-service";
import { getRealmLeaderboard } from "@/services/leaderboard-service";
import { listRealmTiers, formatPrice } from "@/services/monetization-service";
import { getCurrentOperator } from "@/services/operator-service";

export const runtime = "edge";
export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("realms")
    .select("name, description, slug, base_url, vaulted_at, status")
    .ilike("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Realm not found · NROS" };
  const r = data as { name: string; description: string | null; slug: string; base_url: string | null; vaulted_at: string | null; status: string };
  const status = r.vaulted_at ? "VAULTED" : r.status === "ACTIVE" && r.base_url ? "LIVE" : "IN DEVELOPMENT";
  const title = `${r.name} · NROS Realm`;
  const description = r.description ?? `${r.name} is a sovereign realm in the Next Realm civilization federation. Status: ${status}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/realms/${r.slug}`,
      siteName: "NROS · Federation Kernel",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

interface RealmRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_url: string | null;
  icon_url: string | null;
  status: string;
  vaulted_at: string | null;
  created_at: string;
}

export default async function PublicRealmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: realm } = await supabase
    .from("realms")
    .select("id, slug, name, description, base_url, icon_url, status, vaulted_at, created_at")
    .ilike("slug", slug)
    .maybeSingle();

  if (!realm) notFound();
  const r = realm as RealmRow;

  const [{ count: operatorCount }, transmissions, allWonders, leaderboard, viewer, ownerRow, tiers] = await Promise.all([
    supabase.from("operator_realms").select("operator_id", { count: "exact", head: true }).eq("realm_id", r.id),
    listTransmissions({ limit: 20, realmId: r.id }),
    listWonders(),
    getRealmLeaderboard(r.id, 12),
    getCurrentOperator(),
    supabase.from("realms").select("owner_operator_id").eq("id", r.id).maybeSingle(),
    listRealmTiers(r.slug),
  ]);
  const ownerId = (ownerRow.data as { owner_operator_id?: string } | null)?.owner_operator_id ?? null;
  const isOwner = !!viewer && ownerId === viewer.profile.id;

  const wonders = allWonders.filter((w) => w.realm_id === r.id);
  const isVault = !!r.vaulted_at;
  const isLive  = !isVault && !!r.base_url;

  const stateAccent = isVault ? "#A78BFA" : isLive ? "hsl(var(--nr-magma))" : "hsl(var(--nr-muted))";
  const stateLabel = isVault ? "VAULTED" : isLive ? "LIVE" : "IN DEVELOPMENT";

  return (
    <main className="relative min-h-screen overflow-hidden nr-skin">
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6">
        <Link href="/civilization" className="font-mono text-[11px] tracking-[0.28em] uppercase hover:nr-magma transition-colors"
              style={{ color: "hsl(var(--nr-muted))" }}>
          ← civilization
        </Link>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Link href={`/realms/${r.slug}/admin`} className="nr-btn nr-btn-gold">Owner admin</Link>
          ) : (
            <Link href="/sign-in?next=/grid" className="nr-btn">Sign in</Link>
          )}
          {isLive && (
            <a href={r.base_url!} target="_blank" rel="noreferrer" className="nr-btn nr-btn-magma">
              Open realm <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </header>

      <section className="relative z-10">
        <div className="px-6 lg:px-10 pt-8 pb-10 max-w-6xl mx-auto">
          <p className="nr-eyebrow">— realm dossier · /{r.slug}</p>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="nr-display text-4xl md:text-6xl" style={{ color: "hsl(var(--nr-text))" }}>{r.name}</h1>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border"
              style={{ color: stateAccent, borderColor: `${stateAccent}55`, background: `${stateAccent}11` }}
            >
              {stateLabel}
            </span>
          </div>
          {r.description && (
            <p className="mt-5 text-base leading-relaxed max-w-2xl" style={{ color: "hsl(var(--nr-muted))" }}>
              {r.description}
            </p>
          )}
        </div>
        <div className="nr-rule max-w-md mx-6 lg:mx-10" />
      </section>

      <section className="relative z-10 px-6 lg:px-10 py-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="// operators" value={operatorCount ?? 0} hint="enlisted in this realm" />
          <Stat label="// wonders"   value={wonders.length} hint="federation marquee" trend={wonders.length > 0 ? "up" : "flat"} />
          <Stat label="// tx · live" value={transmissions.length} hint="recent events" />
          <Stat label="// since"     value={new Date(r.created_at).getFullYear()} hint="year of attach" />
        </div>

        {tiers.length > 0 && (
          <Panel
            eyebrow={`// the way · ${tiers.length} tiers`}
            title="Subscription doctrine"
            scanlines
            action={
              <Button asChild size="sm">
                <Link href={`/realms/${r.slug}/tiers`}>View all <ArrowUpRight className="h-3 w-3" /></Link>
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tiers.map((tier) => (
                <Link
                  key={tier.id}
                  href={`/realms/${r.slug}/tiers`}
                  className="rounded-md border bg-card/70 p-3 transition-colors hover:scale-[1.01]"
                  style={{ borderColor: `${tier.banner_color}55` }}
                >
                  <p className="font-semibold text-sm" style={{ color: tier.banner_color }}>
                    {tier.name}
                  </p>
                  <p className="text-xl font-semibold tabular-nums mt-1">
                    {formatPrice(tier.price_cents, tier.currency)}
                  </p>
                  {tier.price_cents > 0 && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      / {tier.interval}
                    </p>
                  )}
                  {tier.tagline && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{tier.tagline}</p>
                  )}
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {wonders.length > 0 && (
          <Panel eyebrow={`// wonders · ${wonders.length}`} title="Federation marquee builds">
            <ul className="space-y-2">
              {wonders.map((w) => (
                <li
                  key={w.id}
                  className="rounded-md border bg-card/70 p-3 flex items-start gap-3"
                  style={{ borderLeftColor: w.banner_color, borderLeftWidth: 3 }}
                >
                  <Landmark className="h-4 w-4 shrink-0 mt-0.5" style={{ color: w.banner_color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.tagline}</p>
                    {w.effect && <p className="text-xs italic mt-1" style={{ color: w.banner_color }}>{w.effect}</p>}
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] shrink-0" style={{ color: w.banner_color }}>
                    {w.era.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {leaderboard.length > 0 && (
          <Panel eyebrow={`// realm ladder · ${leaderboard.length}`} title="Top operators in this realm">
            <ol className="divide-y divide-border/40">
              {leaderboard.map((row, i) => (
                <li key={row.operator_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                    <Link
                      href={`/operator/${encodeURIComponent(row.callsign)}`}
                      className="font-medium hover:text-primary truncate"
                    >
                      {row.callsign}
                    </Link>
                    {row.global_rank && <Badge variant="muted">{row.global_rank}</Badge>}
                  </div>
                  <span className="font-mono text-xs tabular-nums">{row.realm_xp.toLocaleString()} XP</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        <Panel
          eyebrow={`// transmissions · realm feed`}
          title="Recent activity"
          scanlines
          action={<RadioTower className="h-4 w-4 text-primary" />}
        >
          {transmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">// no recent transmissions from this realm.</p>
          ) : (
            <GalaxyTicker transmissions={transmissions as Array<Record<string, unknown>>} />
          )}
        </Panel>

        {!isLive && !isVault && (
          <Panel eyebrow="// status" title="In development">
            <p className="text-sm text-muted-foreground">
              This realm is registered in the federation but hasn&apos;t deployed a public surface yet.
              Check back later — or if you&apos;re the realm owner, sign in and add a base URL.
            </p>
          </Panel>
        )}

        {isVault && (
          <Panel eyebrow="// status" title="Vaulted">
            <p className="text-sm text-muted-foreground">
              This realm has been sent to the vault. Records preserved; deploy frozen. Recovery is a governance decision.
            </p>
          </Panel>
        )}
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 px-6 lg:px-10 text-xs font-mono text-muted-foreground flex items-center justify-between">
        <span>// federation kernel v3</span>
        <Link href="/civilization" className="hover:text-primary">← back to civilization</Link>
      </footer>
    </main>
  );
}
