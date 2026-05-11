"use client";

import { Brain, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGenubraPanel } from "./genubra-panel-context";

export function Topbar({ callsign, rankName }: { callsign: string; rankName: string | null }) {
  const { toggle } = useGenubraPanel();
  const initials = callsign.slice(0, 2).toUpperCase();
  return (
    <header className="h-16 border-b border-border/60 bg-background/40 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" className="md:hidden" aria-label="menu">
          <Menu className="h-4 w-4" />
        </Button>
        <div className="space-y-0.5">
          <p className="nros-eyebrow">// operator</p>
          <p className="text-sm font-semibold tracking-tight">{callsign}</p>
        </div>
        {rankName && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">· {rankName}</span>}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggle} aria-label="GENUBRA">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">GENUBRA</span>
        </Button>
        <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
        <form action="/auth/sign-out" method="post">
          <Button variant="ghost" size="icon" aria-label="sign out" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
