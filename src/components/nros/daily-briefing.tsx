"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Brain, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * GENUBRA daily briefing widget. Click "Brief me" → POSTs to
 * /api/agents/briefing → renders the response inline. Persists the latest
 * briefing in sessionStorage so the operator doesn't burn rate-limit
 * regenerating on every page nav.
 */
export function DailyBriefing({ callsign }: { callsign: string }) {
  const STORAGE_KEY = `nros:briefing:${callsign}`;
  const [briefing, setBriefing] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(STORAGE_KEY);
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/agents/briefing", { method: "POST" });
        if (!r.ok) throw new Error((await r.json()).error ?? "Briefing failed");
        const data = await r.json();
        setBriefing(data.briefing);
        sessionStorage.setItem(STORAGE_KEY, data.briefing);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Briefing failed");
      }
    });
  };

  return (
    <div className="space-y-3">
      {briefing ? (
        <BriefingView text={briefing} />
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground italic">
            Ask GENUBRA for a calibrated read on the federation + your next move.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-destructive font-mono">// {error}</p>}

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Button
          size="sm"
          variant={briefing ? "outline" : "default"}
          onClick={generate}
          disabled={pending}
        >
          {pending ? (
            <><RefreshCw className="h-3 w-3 animate-spin" /> Reading…</>
          ) : briefing ? (
            <><RefreshCw className="h-3 w-3" /> Re-brief</>
          ) : (
            <><Brain className="h-3 w-3" /> Brief me</>
          )}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          // free tier · cloudflare workers AI
        </span>
      </div>
    </div>
  );
}

function BriefingView({ text }: { text: string }) {
  // Parse the output: separate body paragraph from PRIMARY CALL / FALLBACK lines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const body: string[] = [];
  let primary = "";
  let fallback = "";
  for (const ln of lines) {
    const upper = ln.toUpperCase();
    if (upper.startsWith("PRIMARY CALL:")) primary = ln.slice("PRIMARY CALL:".length).trim();
    else if (upper.startsWith("FALLBACK:")) fallback = ln.slice("FALLBACK:".length).trim();
    else body.push(ln);
  }

  return (
    <div className="space-y-3">
      {body.length > 0 && (
        <p className="text-sm leading-relaxed text-foreground/90">{body.join(" ")}</p>
      )}
      {primary && (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">// primary call</p>
          </div>
          <p className="text-sm font-medium">{primary}</p>
        </div>
      )}
      {fallback && (
        <div className={cn("rounded-md border border-border/40 bg-card/40 p-3")}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">// fallback</p>
          <p className="text-sm">{fallback}</p>
        </div>
      )}
    </div>
  );
}
