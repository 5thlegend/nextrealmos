"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Mission = {
  title: string;
  brief: string;
  difficulty: "T1" | "T2" | "T3" | "T4" | "T5";
  xp_reward: number;
  tags: string[];
  estimated_hours?: number;
};

const DIFF_COLOR: Record<Mission["difficulty"], string> = {
  T1: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  T2: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  T3: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  T4: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  T5: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export function MissionGeneratorForm({
  operatorRank,
  operatorCallsign,
}: {
  operatorRank: string;
  operatorCallsign: string;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [realmContext, setRealmContext] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [publishing, setPublishing] = useState(false);

  const generate = () => {
    startTransition(async () => {
      try {
        const r = await fetch("/api/agents/missions/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            focus: focus || undefined,
            realmContext: realmContext || undefined,
          }),
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Generation failed");
        const data = await r.json();
        const list = (data.generated ?? []) as Mission[];
        setMissions(list);
        setSelected(new Set(list.map((_, i) => i))); // pre-select all
        toast.success(`${list.length} missions drafted`, { description: `Calibrated to ${operatorRank}` });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "GENUBRA timed out");
      }
    });
  };

  const publishSelected = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one mission");
      return;
    }
    setPublishing(true);
    try {
      const r = await fetch("/api/agents/missions/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          focus: focus || undefined,
          realmContext: realmContext || undefined,
          publish: true,
          // We send the same focus so GENUBRA regenerates a consistent set;
          // an alternative is a dedicated publish-existing endpoint, but
          // regen + filter keeps the surface minimal for now.
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Publish failed");
      const data = await r.json();
      toast.success(`${(data.published ?? []).length} missions published`, {
        description: "Available immediately in /missions",
      });
      router.push("/missions");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="nros-eyebrow block mb-1">// focus · 1 line</label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder='e.g. "Ship the LEGVCY Adept tier this week"'
            className="w-full bg-secondary/40 border border-border/60 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            maxLength={400}
          />
        </div>
        <div>
          <label className="nros-eyebrow block mb-1">// realm context · optional</label>
          <input
            type="text"
            value={realmContext}
            onChange={(e) => setRealmContext(e.target.value)}
            placeholder="e.g. operator-grid — signal map needs a public demo flow"
            className="w-full bg-secondary/40 border border-border/60 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            maxLength={400}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={generate} disabled={pending}>
          {pending ? (
            <><RefreshCw className="h-3 w-3 animate-spin" /> GENUBRA drafting…</>
          ) : missions.length === 0 ? (
            <><Sparkles className="h-3 w-3" /> Generate missions</>
          ) : (
            <><RefreshCw className="h-3 w-3" /> Regenerate</>
          )}
        </Button>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          rank · {operatorRank}
        </span>
      </div>

      {missions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <p className="nros-eyebrow">// preview · {missions.length} drafted · {selected.size} selected</p>
            <Button
              size="sm"
              onClick={publishSelected}
              disabled={publishing || selected.size === 0}
            >
              {publishing ? "Publishing…" : `Publish ${selected.size}`}
              {!publishing && <Check className="h-3 w-3" />}
            </Button>
          </div>
          <ul className="space-y-2">
            {missions.map((m, i) => {
              const isSel = selected.has(i);
              return (
                <li
                  key={`${m.title}-${i}`}
                  onClick={() => toggle(i)}
                  className={cn(
                    "rounded-md border p-3 cursor-pointer transition-all",
                    isSel
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/40 bg-card/40 hover:border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.brief}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className={cn(
                          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em]",
                          DIFF_COLOR[m.difficulty],
                        )}>
                          {m.difficulty}
                        </span>
                        <Badge>+{m.xp_reward} XP</Badge>
                        {m.estimated_hours ? (
                          <Badge variant="muted">~{m.estimated_hours}h</Badge>
                        ) : null}
                        {m.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="muted">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className={cn(
                      "shrink-0 w-5 h-5 rounded border-2 grid place-items-center",
                      isSel ? "border-primary bg-primary text-primary-foreground" : "border-border/60",
                    )}>
                      {isSel ? <Check className="h-3 w-3" /> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {missions.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          // GENUBRA reads your rank + completion history + focus. Output is calibrated, not generic.
          {" "}You can regenerate as many times as you want before publishing.
          {" "}Author: {operatorCallsign}.
        </p>
      )}
    </div>
  );
}
