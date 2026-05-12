"use client";

import Link from "next/link";
import { Brain, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGenubraPanel } from "./genubra-panel-context";
import { cn } from "@/lib/utils";

/**
 * Civilization HUD topbar.
 *
 * 1-second comprehension: callsign · rank | era + XP-to-next-rank bar |
 * GENUBRA + avatar + sign-out. Center band is the always-visible
 * "where am I in the civilization" indicator.
 */

const ERAS = [
  { era: "ANCIENT",      label: "Ancient",      min: 0,         color: "#7c5cff" },
  { era: "CLASSICAL",    label: "Classical",    min: 1_000,     color: "#7c5cff" },
  { era: "MEDIEVAL",     label: "Medieval",     min: 5_000,     color: "#7c5cff" },
  { era: "RENAISSANCE",  label: "Renaissance",  min: 15_000,    color: "#22d3ee" },
  { era: "INDUSTRIAL",   label: "Industrial",   min: 50_000,    color: "#22d3ee" },
  { era: "MODERN",       label: "Modern",       min: 150_000,   color: "#f59e0b" },
  { era: "INFORMATION",  label: "Information",  min: 500_000,   color: "#f59e0b" },
  { era: "FUTURE",       label: "Future",       min: 1_500_000, color: "#ec4899" },
] as const;

function eraFor(xp: number) {
  let cur: (typeof ERAS)[number] = ERAS[0];
  let next: (typeof ERAS)[number] | null = ERAS[1] ?? null;
  for (let i = 0; i < ERAS.length; i++) {
    if (xp >= ERAS[i].min) {
      cur = ERAS[i];
      next = ERAS[i + 1] ?? null;
    }
  }
  return { cur, next };
}

export function Topbar({
  callsign,
  rankName,
  xp = 0,
  nextRankXp = null,
  nextRankName = null,
}: {
  callsign: string;
  rankName: string | null;
  xp?: number;
  nextRankXp?: number | null;
  nextRankName?: string | null;
}) {
  const { toggle } = useGenubraPanel();
  const initials = callsign.slice(0, 2).toUpperCase();

  const { cur, next } = eraFor(xp);

  const rankPct = nextRankXp && nextRankXp > 0
    ? Math.min(100, Math.round((xp / nextRankXp) * 100))
    : 100;

  const eraStart = cur.min;
  const eraEnd = next?.min ?? eraStart;
  const eraSpan = Math.max(1, eraEnd - eraStart);
  const eraPct = next ? Math.min(100, Math.round(((xp - eraStart) / eraSpan) * 100)) : 100;

  return (
    <header className="h-16 border-b border-border/60 bg-background/40 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button size="icon" variant="ghost" className="md:hidden" aria-label="menu">
          <Menu className="h-4 w-4" />
        </Button>
        <Link href="/operator" className="space-y-0.5 min-w-0 hover:text-primary transition-colors">
          <p className="nros-eyebrow">// operator</p>
          <p className="text-sm font-semibold tracking-tight truncate">{callsign}</p>
        </Link>
        {rankName && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary whitespace-nowrap">
            · {rankName}
          </span>
        )}
      </div>

      <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl">
        <Link href="/achievements" className="shrink-0 group" title="Civilization era">
          <p className="nros-eyebrow">// era</p>
          <p
            className="text-sm font-semibold tracking-tight group-hover:opacity-90"
            style={{ color: cur.color }}
          >
            {cur.label}
          </p>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground truncate">
              {nextRankName ? `→ ${nextRankName}` : "max rank"}
            </span>
            <span className="font-mono text-[10px] text-primary whitespace-nowrap">
              {xp.toLocaleString()}{nextRankXp ? ` / ${nextRankXp.toLocaleString()}` : ""} XP
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full bg-primary transition-all duration-500", rankPct >= 100 && "animate-pulse")}
              style={{ width: `${rankPct}%` }}
            />
          </div>
          <div className="mt-1 h-0.5 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${eraPct}%`, backgroundColor: cur.color }}
            />
          </div>
        </div>
        {next && (
          <Link href="/achievements" className="shrink-0 text-right hover:opacity-90 transition-opacity" title="Next era target">
            <p className="nros-eyebrow">// next era</p>
            <p className="text-xs font-semibold tracking-tight truncate" style={{ color: next.color }}>
              {next.label}
            </p>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={toggle} aria-label="GENUBRA">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">GENUBRA</span>
        </Button>
        <Link href={`/operator/${encodeURIComponent(callsign)}`} aria-label="public dossier">
          <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
        </Link>
        <form action="/auth/sign-out" method="post">
          <Button variant="ghost" size="icon" aria-label="sign out" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
