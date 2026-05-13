"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Award, Coins, Globe, GitBranch, Landmark, LayoutDashboard, RadioTower, ScrollText, Trophy, User, Users, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",     label: "Command",       icon: LayoutDashboard },
  { href: "/grid",          label: "Civilization",  icon: GitBranch },
  { href: "/wonders",       label: "Wonders",       icon: Landmark },
  { href: "/armory",        label: "Money Factory", icon: Coins },
  { href: "/transmissions", label: "Transmissions", icon: RadioTower },
  { href: "/realms",        label: "Realms",        icon: Globe },
  { href: "/missions",      label: "Missions",      icon: ScrollText },
  { href: "/workflows",     label: "Workflows",     icon: Workflow },
  { href: "/achievements",  label: "Achievements",  icon: Award },
  { href: "/squads",        label: "Squads",        icon: Users },
  { href: "/leaderboard",   label: "Leaderboard",   icon: Trophy },
  { href: "/operator",      label: "Operator",      icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-background/40 backdrop-blur-xl">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 h-16 border-b border-border/60">
        <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
          <span className="font-mono text-[10px] text-primary">NR</span>
        </div>
        <span className="font-mono text-xs tracking-[0.24em] uppercase">NROS</span>
      </Link>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border/60">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">kernel · online</span>
        </div>
      </div>
    </aside>
  );
}
