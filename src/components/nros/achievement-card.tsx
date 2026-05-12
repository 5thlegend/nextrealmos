import * as React from "react";
import { cn } from "@/lib/utils";
import type { AchievementWithStatus, AchievementRarity } from "@/services/achievement-service";

const RARITY_RING: Record<AchievementRarity, string> = {
  COMMON:   "ring-border/60",
  UNCOMMON: "ring-emerald-500/50",
  RARE:     "ring-cyan-400/60",
  EPIC:     "ring-fuchsia-500/60",
  MYTHIC:   "ring-amber-400/80",
};

const RARITY_GLOW: Record<AchievementRarity, string> = {
  COMMON:   "",
  UNCOMMON: "shadow-[0_0_18px_rgba(16,185,129,0.18)]",
  RARE:     "shadow-[0_0_22px_rgba(34,211,238,0.22)]",
  EPIC:     "shadow-[0_0_26px_rgba(217,70,239,0.26)]",
  MYTHIC:   "shadow-[0_0_32px_rgba(251,191,36,0.34)]",
};

const RARITY_LABEL: Record<AchievementRarity, string> = {
  COMMON: "common", UNCOMMON: "uncommon", RARE: "rare", EPIC: "epic", MYTHIC: "mythic",
};

const RARITY_LABEL_COLOR: Record<AchievementRarity, string> = {
  COMMON:   "text-muted-foreground",
  UNCOMMON: "text-emerald-400",
  RARE:     "text-cyan-300",
  EPIC:     "text-fuchsia-400",
  MYTHIC:   "text-amber-300",
};

export function AchievementCard({ a, compact = false }: { a: AchievementWithStatus; compact?: boolean }) {
  const locked = !a.unlocked;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card/70 backdrop-blur-sm p-4 transition-all duration-150 ring-1",
        locked ? "border-border/40 ring-border/30 opacity-60 grayscale" : `border-border/60 ${RARITY_RING[a.rarity]} ${RARITY_GLOW[a.rarity]} hover:scale-[1.02]`,
        compact ? "p-3" : "p-4",
      )}
      style={!locked ? { borderLeftColor: a.banner_color, borderLeftWidth: 3 } : undefined}
      title={locked && a.secret ? "??? (hidden achievement)" : a.description}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 w-12 h-12 rounded-md grid place-items-center border text-lg",
            locked
              ? "bg-secondary border-border/40 text-muted-foreground"
              : "bg-primary/10 border-primary/40 text-primary",
          )}
          style={!locked ? { borderColor: `${a.banner_color}66`, color: a.banner_color, backgroundColor: `${a.banner_color}11` } : undefined}
        >
          {locked ? "🔒" : iconGlyph(a.icon)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold tracking-tight truncate">
              {locked && a.secret ? "???" : a.name}
            </p>
            <span className={cn("font-mono text-[9px] uppercase tracking-[0.16em]", RARITY_LABEL_COLOR[a.rarity])}>
              {RARITY_LABEL[a.rarity]}
            </span>
          </div>
          <p className={cn("text-xs mt-0.5 line-clamp-2", locked ? "text-muted-foreground/70" : "text-muted-foreground")}>
            {locked && a.secret ? "Hidden until unlocked." : a.description}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {a.era.toLowerCase()}
            </span>
            {a.xp_bonus > 0 && (
              <span className="font-mono text-[10px] text-primary">+{a.xp_bonus.toLocaleString()} XP</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function iconGlyph(name: string): string {
  // Simple glyph map — keeps the card lib-free in RSC. Lucide icons render
  // separately for icons that demand it (e.g. the toast).
  const map: Record<string, string> = {
    sparkles:   "✦",
    zap:        "⚡",
    bolt:       "⚡",
    flame:      "🔥",
    shield:     "◇",
    crosshair:  "✛",
    compass:    "✦",
    crown:      "♛",
    star:       "★",
    flag:       "▶",
    "list-checks": "☑",
    swords:     "⚔",
    workflow:   "⌬",
    "check-circle": "✓",
    hammer:     "⚒",
    globe:      "◯",
    network:    "◈",
    "flag-triangle-right": "▷",
    radio:      "ⓘ",
    "radio-tower": "▲",
    rocket:     "🚀",
    ship:       "⛵",
    landmark:   "▣",
  };
  return map[name] ?? "✦";
}
