"use client";

import { Handle, Position } from "@xyflow/react";
import { Globe, Archive, Shield, Users, Zap, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export type RealmNodeData = {
  id: string;
  slug: string;
  name: string;
  status: string;
  vaulted_at: string | null;
  operator_count: number;
  elite_count: number;
  agent_count: number;
  transmissions_24h: number;
  monthly_revenue_cents: number;
  wonder_count?: number;
  isCore?: boolean;
};

export function RealmNode({ data, selected }: { data: RealmNodeData; selected?: boolean }) {
  const isVaulted = !!data.vaulted_at;
  const isCore = data.isCore;
  const Icon = isVaulted ? Archive : isCore ? Shield : Globe;

  const accent = isVaulted
    ? "border-nros-rank/40 bg-nros-rank/5"
    : isCore
    ? "border-nros-warn/60 bg-nros-warn/10"
    : "border-primary/40 bg-primary/5";

  return (
    <div
      className={cn(
        "nros-deck w-56 transition-all relative overflow-hidden",
        accent,
        selected && "ring-2 ring-primary shadow-signal scale-[1.02]",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary/40 !border-primary/60" />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-3.5 w-3.5", isVaulted ? "text-nros-rank" : isCore ? "text-nros-warn" : "text-primary")} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">/{data.slug}</span>
          </div>
          {data.transmissions_24h > 0 && (
            <span className="flex items-center gap-1 font-mono text-[9px] text-primary">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              {data.transmissions_24h}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm leading-tight">{data.name}</h3>
        <div className="grid grid-cols-3 gap-1 pt-1">
          <Stat icon={Users}    n={data.operator_count} label="ops" />
          <Stat icon={Shield}   n={data.elite_count}    label="elite" />
          <Stat icon={Zap}      n={data.agent_count}    label="ai" />
        </div>
        {(data.wonder_count ?? 0) > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <div className="flex items-center gap-1 font-mono text-[10px] text-nros-warn">
              <Landmark className="h-2.5 w-2.5" />
              <span>{data.wonder_count} wonder{(data.wonder_count ?? 0) === 1 ? "" : "s"}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-nros-warn">marquee</span>
          </div>
        )}
        {data.monthly_revenue_cents > 0 && (
          <div className="font-mono text-[10px] text-nros-warn pt-1 border-t border-border/40">
            ${Math.round(data.monthly_revenue_cents / 100).toLocaleString()}/mo
          </div>
        )}
      </div>
      {isVaulted && (
        <div className="absolute -right-6 top-2 rotate-45 bg-nros-rank/30 px-6 py-0.5 text-[8px] font-mono uppercase tracking-[0.18em] text-nros-rank">
          vault
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary/40 !border-primary/60" />
    </div>
  );
}

function Stat({ icon: Icon, n, label }: { icon: any; n: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-1 rounded bg-background/40 border border-border/40">
      <Icon className="h-2.5 w-2.5 text-muted-foreground" />
      <span className="font-mono text-[10px] tabular-nums">{n}</span>
      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
    </div>
  );
}
