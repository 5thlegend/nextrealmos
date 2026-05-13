import { Panel } from "@/components/nros/panel";
import { ActivityHeatmap } from "@/components/nros/activity-heatmap";
import { Badge } from "@/components/ui/badge";
import type { FederationPulse } from "@/services/analytics-service";

const EVENT_GLYPH: Record<string, string> = {
  "deployment.launch": "▲", "deployment.ship": "▶", "deployment.iteration": "◌", "deployment.milestone": "◆",
  "operator.ascension": "↗", "operator.activation": "✦",
  "realm.attach": "◈", "realm.vault": "▽", "realm.restore": "△",
  "guild.create": "◇",
  "mission.complete": "✓",
  "achievement.unlock": "★", "wonder.built": "▣",
};

export function FederationPulsePanel({ pulse }: { pulse: FederationPulse }) {
  return (
    <Panel eyebrow="// federation pulse · 14 days" title="Civilization-scale momentum" scanlines>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
        <PulseStat label="ops" value={pulse.operators_total} delta={pulse.operators_24h} />
        <PulseStat label="realms" value={pulse.realms_active} extra={pulse.realms_vaulted ? `+${pulse.realms_vaulted} vault` : undefined} />
        <PulseStat label="wonders" value={pulse.wonders_total} accent="warn" />
        <PulseStat label="tx · all" value={pulse.transmissions_total} delta={pulse.transmissions_24h} />
        <PulseStat label="xp · all" value={pulse.xp_total} delta={pulse.xp_24h} compact />
        <PulseStat label="trophies" value={pulse.achievements_unlocked_total} delta={pulse.achievements_unlocked_24h} />
      </div>

      {/* Sparkline using ActivityHeatmap (it accepts the same shape — events default 0) */}
      <div className="mb-4">
        <ActivityHeatmap
          data={pulse.xp_sparkline.map((d) => ({ day: d.day, xp: d.xp, events: d.xp > 0 ? 1 : 0 }))}
          label="// xp earned per day"
        />
      </div>

      {pulse.top_events_7d.length > 0 && (
        <div>
          <p className="nros-eyebrow mb-2">// top events · last 7 days</p>
          <div className="flex flex-wrap gap-2">
            {pulse.top_events_7d.map((e) => (
              <Badge key={e.event_name} variant="muted">
                <span className="font-mono text-primary mr-1">{EVENT_GLYPH[e.event_name] ?? "·"}</span>
                {e.event_name} <span className="text-foreground/80 ml-1">· {e.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function PulseStat({
  label, value, delta, extra, accent, compact,
}: {
  label: string; value: number; delta?: number; extra?: string; accent?: "warn"; compact?: boolean;
}) {
  const color = accent === "warn" ? "text-nros-warn" : "text-foreground";
  const fmt = (n: number) =>
    compact && n >= 1000
      ? n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : `${(n / 1_000).toFixed(1)}k`
      : n.toLocaleString();
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-semibold tabular-nums ${color}`}>{fmt(value)}</span>
        {delta !== undefined && delta > 0 && (
          <span className="font-mono text-[10px] text-primary">+{fmt(delta)}</span>
        )}
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">{label}</p>
      {extra && <p className="font-mono text-[9px] text-nros-rank mt-0.5">{extra}</p>}
    </div>
  );
}
