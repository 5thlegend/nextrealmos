"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createBrowserClient } from "@supabase/ssr";

import { RealmNode, type RealmNodeData } from "./realm-node";
import type { RealmGraphNode, EliteLeaderRow, AgentRow, CivilizationOverview } from "@/services/civilization-service";
import { Badge } from "@/components/ui/badge";
import { Activity, Shield, Users, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

const nodeTypes: NodeTypes = {
  // @xyflow/react types are awkward with custom node payloads; cast through
  // unknown rather than any so we keep ESLint quiet without losing safety.
  realm: RealmNode as unknown as NodeTypes["realm"],
};

export function RealmGraphEngine({
  realms,
  leaders,
  agents,
  overview,
  wonderCounts,
}: {
  realms: RealmGraphNode[];
  leaders: EliteLeaderRow[];
  agents: AgentRow[];
  overview: CivilizationOverview | null;
  wonderCounts?: Record<string, number>;
}) {
  // Lay out realms in a hex-ish ring around the core.
  const initial = useMemo(() => buildGraph(realms, wonderCounts ?? {}), [realms, wonderCounts]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RealmNodeData>>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selected, setSelected] = useState<RealmNodeData | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    if (node.type === "realm") setSelected(node.data as RealmNodeData);
  }, []);

  // Realtime: when a transmission lands, pulse the originating realm's edge
  // and bump its 24h counter on the node card. Auto-fades after 2.5s.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    const channel = supabase
      .channel("nros-grid-pulses")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transmissions" },
        (payload) => {
          const row = payload.new as { realm_id?: string };
          const rid = row.realm_id;
          if (!rid) return;
          setPulses((p) => ({ ...p, [rid]: (p[rid] ?? 0) + 1 }));
          setNodes((ns) => ns.map((n) =>
            n.id === rid
              ? { ...n, data: { ...n.data, transmissions_24h: (n.data.transmissions_24h ?? 0) + 1 } }
              : n,
          ));
          setTimeout(() => {
            setPulses((p) => {
              const { [rid]: _, ...rest } = p;
              return rest;
            });
          }, 2500);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [setNodes]);

  // Apply pulse styling to edges in real-time
  const styledEdges = useMemo(() => edges.map((e) => {
    const targetId = e.target;
    const isPulsing = pulses[targetId] !== undefined;
    if (!isPulsing) return e;
    return {
      ...e,
      animated: true,
      style: {
        ...(e.style ?? {}),
        stroke: "hsl(178, 92%, 56%)",
        strokeWidth: 2.5,
        filter: "drop-shadow(0 0 6px hsl(178, 92%, 56%))",
      },
    };
  }), [edges, pulses]);

  return (
    <div className="relative h-[calc(100vh-7rem)] w-full nros-deck overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "hsla(178, 92%, 56%, 0.35)", strokeWidth: 1 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="hsla(180, 30%, 70%, 0.08)" />
        <Controls
          className="!bg-card/80 !border-border/60 [&_button]:!bg-transparent [&_button]:!border-border/40 [&_button]:!text-muted-foreground [&_button:hover]:!bg-secondary/40"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-card/80 !border !border-border/60"
          maskColor="hsla(220, 30%, 4%, 0.7)"
          nodeColor={(n) => {
            const d = n.data as RealmNodeData;
            if (d?.vaulted_at) return "hsl(258 80% 70%)";
            if (d?.isCore) return "hsl(38 95% 60%)";
            return "hsl(178 92% 56%)";
          }}
          pannable
          zoomable
        />

        {overview && (
          <Panel position="top-left" className="!m-0 !p-0">
            <CivilizationStats overview={overview} agents={agents} leaders={leaders} />
          </Panel>
        )}

        <Panel position="top-right" className="!m-3 !p-0 max-w-xs">
          <Legend />
        </Panel>
      </ReactFlow>

      {selected && (
        <RealmDetailPanel realm={selected} leaders={leaders} agents={agents} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ----- helpers -----

function buildGraph(realms: RealmGraphNode[], wonderCounts: Record<string, number>): { nodes: Node<RealmNodeData>[]; edges: Edge[] } {
  const core = realms.find((r) => r.slug === "nros-core" || r.slug === "nros");
  const others = realms.filter((r) => r.id !== core?.id);

  const nodes: Node<RealmNodeData>[] = [];
  const edges: Edge[] = [];

  if (core) {
    nodes.push({
      id: core.id,
      type: "realm",
      position: { x: 0, y: 0 },
      data: { ...core, isCore: true, wonder_count: wonderCounts[core.id] ?? 0 },
    });
  }

  // Hex ring layout around core
  const radius = 380;
  const n = others.length;
  others.forEach((r, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: r.id,
      type: "realm",
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
      data: { ...r, isCore: false, wonder_count: wonderCounts[r.id] ?? 0 },
    });
    if (core) {
      edges.push({
        id: `${core.id}-${r.id}`,
        source: core.id,
        target: r.id,
        animated: !r.vaulted_at,
        style: r.vaulted_at
          ? { stroke: "hsla(258, 80%, 70%, 0.25)", strokeWidth: 1, strokeDasharray: "4 4" }
          : { stroke: "hsla(178, 92%, 56%, 0.35)", strokeWidth: 1 },
      });
    }
  });

  return { nodes, edges };
}

function CivilizationStats({
  overview,
  agents,
  leaders,
}: {
  overview: CivilizationOverview;
  agents: AgentRow[];
  leaders: EliteLeaderRow[];
}) {
  return (
    <div className="m-3 nros-deck p-3 space-y-2 min-w-[280px]">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">// civilization</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="realms" v={overview.active_realms} />
        <Stat label="ops" v={overview.total_operators} />
        <Stat label="elite" v={overview.elite_leaders || leaders.length} />
        <Stat label="agents" v={overview.agents_running || agents.filter(a => a.status === "RUNNING").length} />
        <Stat label="vault" v={overview.vaulted_realms} accent="rank" />
        <Stat label="24h tx" v={overview.transmissions_24h} accent="signal" />
      </div>
    </div>
  );
}

function Stat({ label, v, accent }: { label: string; v: number | string; accent?: "signal" | "rank" }) {
  const color = accent === "rank" ? "text-nros-rank" : accent === "signal" ? "text-primary" : "text-foreground";
  return (
    <div className="flex flex-col items-start">
      <span className={cn("font-mono text-base tabular-nums leading-none", color)}>{v}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

function Legend() {
  return (
    <div className="nros-deck p-2.5 space-y-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">// legend</p>
      <div className="space-y-1 text-[10px] font-mono">
        <LegendRow color="bg-nros-warn" label="NROS · core" />
        <LegendRow color="bg-primary" label="active realm" />
        <LegendRow color="bg-nros-rank" label="vaulted" />
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-sm", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function RealmDetailPanel({
  realm,
  leaders,
  agents,
  onClose,
}: {
  realm: RealmNodeData;
  leaders: EliteLeaderRow[];
  agents: AgentRow[];
  onClose: () => void;
}) {
  const realmLeaders = leaders.filter((l) => l.realm_id === realm.id);
  const realmAgents  = agents.filter((a) => a.realm_id === realm.id);

  return (
    <div className="absolute right-0 top-0 h-full w-[360px] nros-deck rounded-none border-l border-y-0 border-r-0 overflow-y-auto">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="nros-eyebrow">// realm · /{realm.slug}</p>
            <h2 className="text-lg font-semibold mt-1">{realm.name}</h2>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant={realm.vaulted_at ? "muted" : realm.isCore ? "warn" : "default"}>
                {realm.vaulted_at ? "VAULTED" : realm.status}
              </Badge>
              {realm.isCore && <Badge variant="warn">CORE</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DetailStat label="operators" v={realm.operator_count} icon={Users} />
          <DetailStat label="elite" v={realm.elite_count} icon={Shield} />
          <DetailStat label="agents" v={realm.agent_count} icon={Zap} />
          <DetailStat label="24h tx" v={realm.transmissions_24h} icon={Activity} />
        </div>

        {realm.monthly_revenue_cents > 0 && (
          <div className="nros-deck p-3 border-nros-warn/40 bg-nros-warn/5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">// money factory</p>
            <p className="font-mono text-xl text-nros-warn mt-1">${Math.round(realm.monthly_revenue_cents / 100).toLocaleString()}/mo</p>
          </div>
        )}

        {realmLeaders.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">// elite leaders</p>
            {realmLeaders.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{l.operator_callsign ?? l.operator_id.slice(0, 8)}</span>
                <Badge variant="muted">{l.role}</Badge>
              </div>
            ))}
          </div>
        )}

        {realmAgents.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">// agents</p>
            {realmAgents.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{a.name}</span>
                <Badge variant={a.status === "RUNNING" ? "default" : "muted"}>{a.kind} · {a.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {!realm.vaulted_at && realm.base_url && (
          <a href={realm.base_url} target="_blank" rel="noreferrer"
             className="block text-center mt-4 px-3 py-2 rounded border border-border bg-secondary/40 hover:bg-secondary text-xs font-mono">
            ↗ open {realm.slug}
          </a>
        )}
      </div>
    </div>
  );
}

function DetailStat({ icon: Icon, label, v }: { icon: React.ComponentType<{ className?: string }>; label: string; v: number }) {
  return (
    <div className="nros-deck p-2 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div>
        <p className="font-mono text-base tabular-nums leading-none">{v}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
