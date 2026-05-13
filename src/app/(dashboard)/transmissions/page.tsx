import Link from "next/link";
import { Panel } from "@/components/nros/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listTransmissions } from "@/services/transmission-service";
import { listPublicRealms } from "@/services/realm-service";
import { relativeTime } from "@/lib/utils";

export const runtime = "edge";

const EVENT_GLYPH: Record<string, string> = {
  "deployment.launch": "▲", "deployment.ship": "▶", "deployment.iteration": "◌", "deployment.milestone": "◆",
  "operator.ascension": "↗", "operator.activation": "✦",
  "realm.attach": "◈", "realm.vault": "▽", "realm.restore": "△",
  "guild.create": "◇", "guild.merge": "⬡",
  "mission.complete": "✓", "mission.fail": "✗",
  "achievement.unlock": "★", "wonder.built": "▣",
  "influence.growth": "◐", "economy.transaction": "◎",
  "agent.deploy": "◉", "agent.fault": "⚠",
  "subscription.intent": "$", "subscription.start": "$$", "subscription.cancel": "×",
};

const FILTER_PRESETS = [
  { value: "",                     label: "all" },
  { value: "achievement.unlock",   label: "achievements" },
  { value: "deployment.launch",    label: "launches" },
  { value: "operator.ascension",   label: "ascensions" },
  { value: "realm.attach",         label: "realm attach" },
  { value: "wonder.built",         label: "wonders" },
  { value: "mission.complete",     label: "missions" },
  { value: "guild.create",         label: "guilds" },
  { value: "subscription.intent",  label: "$ intent" },
];

export default async function TransmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; realm?: string }>;
}) {
  const { event, realm: realmSlug } = await searchParams;

  // Look up realm by slug if filter applied
  let realmId: string | undefined;
  if (realmSlug) {
    const realms = await listPublicRealms({ includeVaulted: true });
    realmId = realms.find((r) => r.slug === realmSlug)?.id;
  }

  const [feed, realms] = await Promise.all([
    listTransmissions({ limit: 200, eventName: event || undefined, realmId }),
    listPublicRealms({ includeVaulted: true }),
  ]);

  const params = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    if (event && overrides.event !== "") q.set("event", overrides.event ?? event);
    if (realmSlug && overrides.realm !== "") q.set("realm", overrides.realm ?? realmSlug);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "") q.delete(k);
      else if (v !== undefined) q.set(k, v);
    }
    const s = q.toString();
    return s ? `/transmissions?${s}` : "/transmissions";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="space-y-1">
        <p className="nros-eyebrow">// federated feed</p>
        <h1 className="text-2xl font-semibold tracking-tight">Transmissions</h1>
        <p className="text-sm text-muted-foreground">Every event pushed by every realm in the federation. Real-time.</p>
      </header>

      {/* Filter chips */}
      <div className="space-y-3">
        <div>
          <p className="nros-eyebrow mb-1.5">// event filter</p>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_PRESETS.map((p) => (
              <Link
                key={p.value}
                href={params({ event: p.value })}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-mono uppercase tracking-[0.14em] transition-colors ${
                  (event ?? "") === p.value
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {p.value && EVENT_GLYPH[p.value] ? `${EVENT_GLYPH[p.value]} ${p.label}` : p.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="nros-eyebrow mb-1.5">// realm filter</p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={params({ realm: "" })}
              className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-mono uppercase tracking-[0.14em] transition-colors ${
                !realmSlug
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              all realms
            </Link>
            {realms.slice(0, 12).map((r) => (
              <Link
                key={r.id}
                href={params({ realm: r.slug })}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-mono lowercase transition-colors ${
                  realmSlug === r.slug
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                /{r.slug}
              </Link>
            ))}
          </div>
        </div>
        {(event || realmSlug) && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/transmissions">Clear filters</Link>
          </Button>
        )}
      </div>

      <Panel eyebrow={`// signals · ${feed.length}${event ? ` · ${event}` : ""}${realmSlug ? ` · /${realmSlug}` : ""}`} scanlines>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">// no signals match the current filter</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {feed.map((tx) => {
              const t = tx as { id: string; title: string; body?: string | null; kind: string; event_name?: string | null; created_at: string; realms?: { slug?: string } | null };
              const glyph = (t.event_name && EVENT_GLYPH[t.event_name]) ?? "·";
              return (
                <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <span className="font-mono text-sm text-primary w-4 text-center shrink-0 mt-0.5">{glyph}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t.realms?.slug && (
                          <Link href={`/realms/${t.realms.slug}`} className="font-mono text-primary hover:underline">
                            /{t.realms.slug}
                          </Link>
                        )}
                        <span>·</span>
                        <span>{relativeTime(t.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{t.title}</p>
                      {t.body && <p className="text-xs text-muted-foreground mt-0.5">{t.body}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {t.event_name && <Badge>{t.event_name}</Badge>}
                    <Badge variant={kindVariant(t.kind)}>{t.kind}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function kindVariant(kind: string): "default" | "accent" | "warn" | "muted" {
  switch (kind) {
    case "RANK_CHANGED":          return "accent";
    case "ACHIEVEMENT_UNLOCKED":  return "warn";
    case "REALM_REGISTERED":     return "default";
    case "REALM_VAULTED":        return "warn";
    default:                      return "muted";
  }
}
