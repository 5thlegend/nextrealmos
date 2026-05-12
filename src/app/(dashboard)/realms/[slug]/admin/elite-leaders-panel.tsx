"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Leader = {
  id: string;
  role: "WARDEN" | "ARCHITECT" | "DIPLOMAT" | "OVERSEER";
  callsign: string;
  appointed_at: string;
};

const ROLE_COLOR: Record<Leader["role"], string> = {
  WARDEN:    "border-amber-500/40 bg-amber-500/10 text-amber-300",
  ARCHITECT: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  DIPLOMAT:  "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  OVERSEER:  "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

export function EliteLeadersPanel({
  slug,
  initialLeaders,
}: {
  slug: string;
  initialLeaders: Leader[];
}) {
  const router = useRouter();
  const [leaders, setLeaders] = useState<Leader[]>(initialLeaders);
  const [callsign, setCallsign] = useState("");
  const [role, setRole] = useState<Leader["role"]>("WARDEN");
  const [pending, startTransition] = useTransition();

  const appoint = () => {
    if (!callsign.trim()) {
      toast.error("Callsign required");
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch(`/api/federation/realms/${encodeURIComponent(slug)}/appoint`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ callsign: callsign.trim(), role }),
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Appointment failed");
        const data = await r.json();
        toast.success(`${data.callsign} appointed ${data.role}`, {
          description: "Federation transmission emitted",
        });
        setLeaders((prev) => [
          { id: data.id, role: data.role, callsign: data.callsign, appointed_at: new Date().toISOString() },
          ...prev,
        ]);
        setCallsign("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Appointment failed");
      }
    });
  };

  const revoke = (leaderId: string, leaderCallsign: string) => {
    if (!confirm(`Revoke ${leaderCallsign}'s appointment?`)) return;
    startTransition(async () => {
      try {
        const r = await fetch(`/api/federation/realms/${encodeURIComponent(slug)}/appoint?leader_id=${encodeURIComponent(leaderId)}`, {
          method: "DELETE",
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Revoke failed");
        toast.success(`${leaderCallsign} revoked`);
        setLeaders((prev) => prev.filter((l) => l.id !== leaderId));
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Revoke failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Existing leaders */}
      {leaders.length > 0 && (
        <ul className="space-y-2">
          {leaders.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium truncate">{l.callsign}</span>
                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${ROLE_COLOR[l.role]}`}>
                  {l.role}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => revoke(l.id, l.callsign)}
                disabled={pending}
                title="Revoke"
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Appoint form */}
      <div className="space-y-2 border-t border-border/40 pt-3">
        <p className="nros-eyebrow">// appoint new leader</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            placeholder="Callsign (e.g. SHADOW.SEVEN)"
            className="flex-1 min-w-[180px] bg-secondary/40 border border-border/60 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            maxLength={48}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Leader["role"])}
            className="bg-secondary/40 border border-border/60 rounded-md px-2 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          >
            <option value="WARDEN">WARDEN</option>
            <option value="ARCHITECT">ARCHITECT</option>
            <option value="DIPLOMAT">DIPLOMAT</option>
            <option value="OVERSEER">OVERSEER</option>
          </select>
          <Button size="sm" onClick={appoint} disabled={pending}>
            <Plus className="h-3 w-3" /> {pending ? "Appointing…" : "Appoint"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          The appointee receives the role and the federation sees an{" "}
          <code className="font-mono text-primary">operator.ascension</code> transmission. The operator must already exist in NROS.
        </p>
      </div>
    </div>
  );
}
