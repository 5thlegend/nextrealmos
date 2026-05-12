/**
 * Steam-style activity heatmap. Renders the last N days as a grid of
 * intensity-tinted cells. Pure SVG, no client deps.
 */

export function ActivityHeatmap({
  data,
  label = "// last 30 days of activity",
}: {
  data: Array<{ day: string; xp: number; events: number }>;
  label?: string;
}) {
  if (data.length === 0) return null;

  const maxXp = Math.max(1, ...data.map((d) => d.xp));
  const totalXp = data.reduce((sum, d) => sum + d.xp, 0);
  const activeDays = data.filter((d) => d.events > 0).length;

  // Color intensity bucket
  const intensity = (xp: number) => {
    if (xp === 0) return 0;
    const ratio = xp / maxXp;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5)  return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  const COLORS = [
    "hsl(220 14% 14%)",     // 0 — no activity
    "hsla(178, 92%, 56%, 0.20)",
    "hsla(178, 92%, 56%, 0.40)",
    "hsla(178, 92%, 56%, 0.70)",
    "hsl(178, 92%, 56%)",   // 4 — peak
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="nros-eyebrow">{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {activeDays} active days · {totalXp.toLocaleString()} XP
        </p>
      </div>
      <div className="flex flex-wrap gap-[3px]">
        {data.map((d) => {
          const lvl = intensity(d.xp);
          return (
            <div
              key={d.day}
              className="w-3 h-3 rounded-[2px] border border-border/30"
              style={{ backgroundColor: COLORS[lvl] }}
              title={`${d.day} · ${d.xp.toLocaleString()} XP · ${d.events} event${d.events === 1 ? "" : "s"}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="font-mono text-[9px] text-muted-foreground">less</span>
        {COLORS.map((c, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-[2px] border border-border/30"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="font-mono text-[9px] text-muted-foreground">more</span>
      </div>
    </div>
  );
}
