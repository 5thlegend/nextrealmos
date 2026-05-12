import Link from "next/link";
import { Landmark, Compass, Crown, Globe, Network, Star, Workflow as WorkflowIcon } from "lucide-react";
import type { Wonder } from "@/services/wonder-service";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  landmark: Landmark,
  compass:  Compass,
  crown:    Crown,
  globe:    Globe,
  network:  Network,
  star:     Star,
  workflow: WorkflowIcon,
} as const;

/**
 * Federation Wonders horizontal scroller. Always-visible across the
 * civilization surface — wonders are permanent marquee builds.
 */
export function WondersStrip({ wonders }: { wonders: Wonder[] }) {
  if (wonders.length === 0) return null;

  return (
    <section className="nros-deck p-3 relative overflow-hidden">
      <div className="absolute inset-0 nros-scanlines opacity-30 pointer-events-none" />
      <div className="flex items-center justify-between mb-2">
        <p className="nros-eyebrow">// federation wonders · {wonders.length}</p>
        <span className="font-mono text-[10px] text-muted-foreground">permanent marquee builds · visible to all realms</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {wonders.map((w) => {
          const Icon = (ICON_MAP[w.icon as keyof typeof ICON_MAP] ?? Landmark);
          return (
            <Link
              key={w.id}
              href={w.realm_slug ? `/realms/${w.realm_slug}` : "#"}
              className={cn(
                "shrink-0 w-64 snap-start rounded-md border bg-card/70 p-3 hover:scale-[1.02] transition-all relative overflow-hidden group",
              )}
              style={{
                borderLeftColor: w.banner_color,
                borderLeftWidth: 3,
                boxShadow: `0 0 18px ${w.banner_color}22`,
              }}
              title={w.effect ?? w.tagline}
            >
              <div className="flex items-start gap-2">
                <div
                  className="shrink-0 w-9 h-9 rounded-md grid place-items-center border"
                  style={{
                    borderColor: `${w.banner_color}66`,
                    color: w.banner_color,
                    backgroundColor: `${w.banner_color}11`,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{w.tagline}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: w.banner_color }}>
                      {w.era.toLowerCase()}
                    </span>
                    {w.realm_name && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground truncate">
                        · /{w.realm_slug}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
