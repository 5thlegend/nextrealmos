"use client";

/**
 * Subscribes to NROS transmissions in realtime and fires a "civilization
 * mark" toast whenever an achievement.unlock event lands for the current
 * operator (or anyone, if `allOperators` is set).
 *
 * Mounted once in the dashboard layout (client island). It does NOT render
 * any visible chrome by itself — it only emits sonner toasts.
 */

import * as React from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";

type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "MYTHIC";

const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: "common", UNCOMMON: "uncommon", RARE: "rare", EPIC: "epic", MYTHIC: "mythic",
};

const RARITY_BORDER: Record<Rarity, string> = {
  COMMON:   "border-border/60",
  UNCOMMON: "border-emerald-500/60",
  RARE:     "border-cyan-400/60",
  EPIC:     "border-fuchsia-500/60",
  MYTHIC:   "border-amber-400/80",
};

const RARITY_GLOW: Record<Rarity, string> = {
  COMMON:   "",
  UNCOMMON: "shadow-[0_0_18px_rgba(16,185,129,0.30)]",
  RARE:     "shadow-[0_0_22px_rgba(34,211,238,0.35)]",
  EPIC:     "shadow-[0_0_26px_rgba(217,70,239,0.38)]",
  MYTHIC:   "shadow-[0_0_36px_rgba(251,191,36,0.55)]",
};

const RARITY_TEXT: Record<Rarity, string> = {
  COMMON:   "text-muted-foreground",
  UNCOMMON: "text-emerald-400",
  RARE:     "text-cyan-300",
  EPIC:     "text-fuchsia-400",
  MYTHIC:   "text-amber-300",
};

export function AchievementToastStream({
  operatorId,
  supabaseUrl,
  supabaseAnonKey,
}: {
  operatorId: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  React.useEffect(() => {
    if (!operatorId || !supabaseUrl || !supabaseAnonKey) return;

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel(`nros-achievements-${operatorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transmissions",
          filter: `operator_id=eq.${operatorId}`,
        },
        (payload) => {
          const row = payload.new as {
            event_name: string | null;
            title: string;
            body: string | null;
            metadata: Record<string, unknown> | null;
          };
          if (row.event_name !== "achievement.unlock") return;

          const meta = row.metadata ?? {};
          const rarity = ((meta as { rarity?: string }).rarity ?? "COMMON") as Rarity;
          const xpBonus = Number((meta as { xp_bonus?: number }).xp_bonus ?? 0);
          const era = String((meta as { era?: string }).era ?? "ANCIENT").toLowerCase();
          const banner = String((meta as { banner_color?: string }).banner_color ?? "#7c5cff");

          toast.custom(
            (t) => (
              <div
                className={cn(
                  "nros-deck w-[360px] max-w-[92vw] border bg-card/95 backdrop-blur-xl px-4 py-3 flex items-start gap-3 cursor-pointer",
                  RARITY_BORDER[rarity],
                  RARITY_GLOW[rarity],
                )}
                style={{ borderLeft: `3px solid ${banner}` }}
                onClick={() => toast.dismiss(t)}
              >
                <div
                  className="shrink-0 w-12 h-12 rounded-md grid place-items-center text-2xl border"
                  style={{ borderColor: `${banner}66`, color: banner, backgroundColor: `${banner}1a` }}
                >
                  ✦
                </div>
                <div className="min-w-0 flex-1">
                  <p className="nros-eyebrow">// civilization mark · {era}</p>
                  <p className="font-semibold tracking-tight truncate mt-0.5">{row.title.replace(/^Achievement unlocked · /, "")}</p>
                  {row.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{row.body}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn("font-mono text-[9px] uppercase tracking-[0.18em]", RARITY_TEXT[rarity])}>
                      {RARITY_LABEL[rarity]}
                    </span>
                    {xpBonus > 0 && (
                      <span className="font-mono text-[10px] text-primary">+{xpBonus.toLocaleString()} XP</span>
                    )}
                  </div>
                </div>
              </div>
            ),
            { duration: 6500 },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [operatorId, supabaseUrl, supabaseAnonKey]);

  return null;
}
