import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Award } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { AchievementCard } from "@/components/nros/achievement-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createSupabaseServer } from "@/lib/supabase/server";
import { listOperatorAchievementsByCallsign } from "@/services/achievement-service";
import { getOperatorActivity } from "@/services/operator-service";
import { ActivityHeatmap } from "@/components/nros/activity-heatmap";
import { formatXp } from "@/lib/utils";

export const runtime = "edge";

export async function generateMetadata({ params }: { params: Promise<{ callsign: string }> }): Promise<Metadata> {
  const { callsign } = await params;
  const decoded = decodeURIComponent(callsign);
  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("operator_profiles")
    .select("callsign, bio, xp, ranks(name)")
    .ilike("callsign", decoded)
    .maybeSingle();

  if (!data) return { title: "Operator not found · NROS" };
  const r = data as { callsign: string; bio: string | null; xp: number; ranks: { name?: string } | null };
  const rankName = r.ranks?.name ?? "Initiate";
  const title = `${r.callsign} · ${rankName} · NROS`;
  const description = r.bio ?? `${r.callsign} — ${rankName} operator with ${r.xp.toLocaleString()} XP in the Next Realm civilization federation.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/operator/${encodeURIComponent(r.callsign)}`,
      siteName: "NROS · Federation Kernel",
    },
    twitter: { card: "summary", title, description },
  };
}

interface OperatorProfileRow {
  id: string;
  callsign: string;
  bio: string | null;
  avatar_url: string | null;
  xp: number;
  rank_id: string | null;
  influence_score: number | null;
  followers_count: number | null;
  last_seen_at: string | null;
  created_at: string;
  current_streak_days: number | null;
  longest_streak_days: number | null;
}

interface RankRow {
  id: string;
  name: string;
  tier: string;
  badge_color: string;
  order_index: number;
}

interface RealmRow {
  realm_id: string;
  realm_xp: number;
  realms: { slug: string; name: string; icon_url: string | null } | null;
}

export default async function PublicOperatorPage({ params }: { params: Promise<{ callsign: string }> }) {
  const { callsign } = await params;
  const decoded = decodeURIComponent(callsign);

  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("operator_profiles")
    .select("id, callsign, bio, avatar_url, xp, rank_id, influence_score, followers_count, last_seen_at, created_at, current_streak_days, longest_streak_days")
    .ilike("callsign", decoded)
    .maybeSingle();

  if (!profile) notFound();
  const op = profile as OperatorProfileRow;

  const [rankRow, achRes, realmsRes, activity] = await Promise.all([
    op.rank_id
      ? supabase.from("ranks").select("id, name, tier, badge_color, order_index").eq("id", op.rank_id).maybeSingle()
      : Promise.resolve({ data: null }),
    listOperatorAchievementsByCallsign(op.callsign),
    supabase
      .from("operator_realms")
      .select("realm_id, realm_xp, realms(slug, name, icon_url)")
      .eq("operator_id", op.id)
      .order("realm_xp", { ascending: false }),
    getOperatorActivity(op.id, 30),
  ]);

  const rank = (rankRow.data ?? null) as RankRow | null;
  const realms = ((realmsRes.data ?? []) as unknown as RealmRow[]).filter((r) => r.realms);
  const ach = achRes ?? { callsign: op.callsign, unlocked: [], locked: [] };

  const initials = op.callsign.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen nr-skin">
      {/* Hero band — Next Realm canonical, Steam-style profile card */}
      <div className="relative border-b" style={{ borderColor: "hsla(var(--nr-text), 0.08)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div
            className="h-24 w-24 rounded-sm border-2 grid place-items-center shrink-0"
            style={{
              borderColor: "hsla(var(--nr-magma), 0.6)",
              background: "hsla(var(--nr-magma), 0.06)",
              color: "hsl(var(--nr-magma))",
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "44px",
              fontWeight: 500,
              boxShadow: "0 0 40px -16px hsla(var(--nr-magma), 0.7)",
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="nr-eyebrow">— operator dossier · public</p>
            <h1 className="nr-display text-4xl md:text-6xl mt-2" style={{ color: "hsl(var(--nr-text))" }}>
              {op.callsign}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {rank && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border"
                      style={{ color: rank.badge_color, borderColor: `${rank.badge_color}66`, background: `${rank.badge_color}11` }}>
                  {rank.name}
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border nr-magma"
                    style={{ borderColor: "hsla(var(--nr-magma), 0.5)", background: "hsla(var(--nr-magma), 0.08)" }}>
                {formatXp(op.xp)} XP
              </span>
              {op.current_streak_days && op.current_streak_days > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border nr-gold"
                      style={{ borderColor: "hsla(var(--nr-gold), 0.5)", background: "hsla(var(--nr-gold), 0.08)" }}>
                  🔥 {op.current_streak_days}d streak
                </span>
              )}
              {op.influence_score && op.influence_score > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border"
                      style={{ color: "hsl(var(--nr-gold))", borderColor: "hsla(var(--nr-gold), 0.4)" }}>
                  {op.influence_score} influence
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm"
                    style={{ color: "hsl(var(--nr-muted))" }}>
                since {new Date(op.created_at).getFullYear()}
              </span>
            </div>
            {op.bio && (
              <p className="mt-4 text-base leading-relaxed max-w-2xl"
                 style={{ color: "hsl(var(--nr-muted))", fontStyle: "italic" }}>
                {op.bio}
              </p>
            )}
          </div>
          <div className="shrink-0 hidden md:block">
            <Link
              href={`/operator/${encodeURIComponent(op.callsign)}/achievements`}
              className="nr-btn nr-btn-gold"
            >
              <Award className="h-3 w-3" /> All achievements
            </Link>
          </div>
        </div>
        <div className="nr-rule max-w-md mx-6" />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="// xp" value={formatXp(op.xp)} hint={rank?.name ?? "Initiate"} trend="up" />
          <Stat label="// achievements" value={ach.unlocked.length} hint={`of ${ach.unlocked.length + ach.locked.length} visible`} />
          <Stat label="// realms" value={realms.length} hint="federated" />
          <Stat label="// influence" value={op.influence_score ?? 0} hint={`${op.followers_count ?? 0} followers`} />
        </div>

        {/* Activity heatmap (Steam-style 30-day grid) */}
        <Panel eyebrow="// activity · last 30 days" title="Daily output">
          <ActivityHeatmap data={activity} label="" />
        </Panel>

        {/* Featured achievements (Steam showcase pattern) */}
        <Panel
          eyebrow="// trophy showcase"
          title="Featured civilization marks"
          scanlines
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/operator/${encodeURIComponent(op.callsign)}/achievements`}>View all <Award className="h-3 w-3" /></Link>
            </Button>
          }
        >
          {ach.unlocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">// no achievements yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ach.unlocked
                .sort((a, b) => {
                  const order = { MYTHIC: 0, EPIC: 1, RARE: 2, UNCOMMON: 3, COMMON: 4 } as const;
                  return order[a.rarity] - order[b.rarity];
                })
                .slice(0, 6)
                .map((a) => <AchievementCard key={a.id} a={a} />)}
            </div>
          )}
        </Panel>

        {/* Realms (Steam library equivalent) */}
        <Panel eyebrow={`// realm library · ${realms.length}`} title="Realms joined">
          {realms.length === 0 ? (
            <p className="text-sm text-muted-foreground">// no realms joined yet</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {realms.map((r) => (
                <li key={r.realm_id} className="nros-deck p-3 flex items-center gap-3">
                  {r.realms?.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.realms.icon_url} alt="" className="h-10 w-10 rounded-md border border-border/60" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 grid place-items-center font-mono text-xs text-primary">
                      {r.realms?.slug.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link href={`/realms/${r.realms?.slug}`} className="font-medium hover:text-primary truncate block">
                      {r.realms?.name}
                    </Link>
                    <p className="font-mono text-[10px] text-muted-foreground">{r.realm_xp.toLocaleString()} realm XP</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
