import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { Panel } from "@/components/nros/panel";
import { Stat } from "@/components/nros/stat";
import { AchievementCard } from "@/components/nros/achievement-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createSupabaseServer } from "@/lib/supabase/server";
import { listOperatorAchievementsByCallsign } from "@/services/achievement-service";
import { formatXp } from "@/lib/utils";

export const runtime = "edge";

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
    .select("id, callsign, bio, avatar_url, xp, rank_id, influence_score, followers_count, last_seen_at, created_at")
    .ilike("callsign", decoded)
    .maybeSingle();

  if (!profile) notFound();
  const op = profile as OperatorProfileRow;

  const [rankRow, achRes, realmsRes] = await Promise.all([
    op.rank_id
      ? supabase.from("ranks").select("id, name, tier, badge_color, order_index").eq("id", op.rank_id).maybeSingle()
      : Promise.resolve({ data: null }),
    listOperatorAchievementsByCallsign(op.callsign),
    supabase
      .from("operator_realms")
      .select("realm_id, realm_xp, realms(slug, name, icon_url)")
      .eq("operator_id", op.id)
      .order("realm_xp", { ascending: false }),
  ]);

  const rank = (rankRow.data ?? null) as RankRow | null;
  const realms = ((realmsRes.data ?? []) as unknown as RealmRow[]).filter((r) => r.realms);
  const ach = achRes ?? { callsign: op.callsign, unlocked: [], locked: [] };

  const initials = op.callsign.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Hero band — Steam-style profile card */}
      <div
        className="border-b border-border/60 bg-gradient-to-b from-card/60 to-background"
        style={{
          backgroundImage:
            "radial-gradient(900px 400px at 20% 0%, hsla(178, 92%, 56%, 0.08), transparent 60%), radial-gradient(700px 400px at 100% 0%, hsla(258, 80%, 70%, 0.08), transparent 55%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24 ring-2 ring-primary/40">
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="nros-eyebrow">// operator dossier · public</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-1">{op.callsign}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {rank && (
                <Badge style={{ borderColor: `${rank.badge_color}66`, color: rank.badge_color, backgroundColor: `${rank.badge_color}11` }}>
                  {rank.name}
                </Badge>
              )}
              <Badge>{formatXp(op.xp)} XP</Badge>
              {op.influence_score && op.influence_score > 0 && <Badge variant="accent">{op.influence_score} influence</Badge>}
              <Badge variant="muted">since {new Date(op.created_at).getFullYear()}</Badge>
            </div>
            {op.bio && <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{op.bio}</p>}
          </div>
          <div className="shrink-0 hidden md:block">
            <Button asChild variant="outline" size="sm">
              <Link href={`/operator/${encodeURIComponent(op.callsign)}/achievements`}>
                <Award className="h-3 w-3" /> All achievements
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="// xp" value={formatXp(op.xp)} hint={rank?.name ?? "Initiate"} trend="up" />
          <Stat label="// achievements" value={ach.unlocked.length} hint={`of ${ach.unlocked.length + ach.locked.length} visible`} />
          <Stat label="// realms" value={realms.length} hint="federated" />
          <Stat label="// influence" value={op.influence_score ?? 0} hint={`${op.followers_count ?? 0} followers`} />
        </div>

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
