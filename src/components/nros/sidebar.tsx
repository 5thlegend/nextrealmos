"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Award, Brain, Coins, Compass, GitBranch, Globe, Hammer,
  Landmark, LayoutDashboard, RadioTower, ScrollText, Trophy, User, Users, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NextRealmOS internal command center sidebar.
 *
 * Per Next Realm doctrine, NROS is NOT a public storefront — it is the
 * orchestration layer. Routes are grouped into modular ecosystem layers
 * so the operator sees the system structure, not a flat task list.
 *
 *   ORCHESTRATION  — internal command + ops + the live federation pulse
 *   FEDERATION     — sovereign realms + identity + civilization graph
 *   INTELLIGENCE   — GENUBRA cognition + OBLISK execution + missions
 *   MONEY          — armory, achievements, leaderboard, marquee builds
 *
 * Each layer's routes feed back into the overall ecosystem signal —
 * see docs/NEXT_REALM_ARCHITECTURE.md for the full doctrine.
 */
const SECTIONS: Array<{
  layer: string;
  caption: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    layer: "ORCHESTRATION",
    caption: "internal · command",
    items: [
      { href: "/dashboard",           label: "Command",       icon: LayoutDashboard },
      { href: "/dashboard/ecosystem", label: "Ecosystem",     icon: Activity },
      { href: "/transmissions",       label: "Transmissions", icon: RadioTower },
    ],
  },
  {
    layer: "FEDERATION",
    caption: "sovereign realms · identity",
    items: [
      { href: "/grid",     label: "Realm Graph", icon: GitBranch },
      { href: "/realms",   label: "Realms",      icon: Globe },
      { href: "/wonders",  label: "Wonders",     icon: Landmark },
      { href: "/squads",   label: "Squads",      icon: Users },
      { href: "/operator", label: "Operator",    icon: User },
    ],
  },
  {
    layer: "INTELLIGENCE",
    caption: "GENUBRA · OBLISK",
    items: [
      { href: "/missions",  label: "Missions",  icon: ScrollText },
      { href: "/workflows", label: "Workflows", icon: Workflow },
    ],
  },
  {
    layer: "MONEY",
    caption: "armory · cashflow · marquee",
    items: [
      { href: "/armory",       label: "Money Factory", icon: Coins },
      { href: "/achievements", label: "Achievements",  icon: Award },
      { href: "/leaderboard",  label: "Leaderboard",   icon: Trophy },
    ],
  },
];

const PUBLIC_HOPS: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { href: "/civilization", label: "Civilization", icon: Compass },
  { href: "/forge",        label: "Forge",        icon: Hammer },
  { href: "/aura",         label: "Aura Scan",    icon: Brain },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-background/40 backdrop-blur-xl">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 h-16 border-b border-border/60">
        <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
          <span className="font-mono text-[10px] text-primary">NR</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-xs tracking-[0.24em] uppercase">NROS</span>
          <span className="font-mono text-[8px] tracking-[0.24em] uppercase text-muted-foreground -mt-0.5">command</span>
        </div>
      </Link>

      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.layer}>
            <div className="px-3 mb-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                {section.layer}
              </p>
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground/80 mt-0.5">
                {section.caption}
              </p>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Hop into public surfaces — operator may want to preview the storefront */}
        <div className="pt-3 border-t border-border/40">
          <p className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            PUBLIC LAYER
          </p>
          <p className="px-3 -mt-1.5 mb-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground/80">
            storefront · external
          </p>
          <div className="space-y-0.5">
            {PUBLIC_HOPS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-accent hover:bg-secondary/40 border border-transparent transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-border/60">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            command · online
          </span>
        </div>
      </div>
    </aside>
  );
}
