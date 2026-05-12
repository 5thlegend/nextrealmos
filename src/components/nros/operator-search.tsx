"use client";

import * as React from "react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Operator autocomplete search. Hits /api/federation/operators?q= with a
 * debounce. Renders a popover of matches with callsign + rank.
 */

type Result = {
  id: string;
  callsign: string;
  xp: number;
  avatar_url: string | null;
  rank: string | null;
  rank_color: string | null;
};

export function OperatorSearch({ placeholder = "Find operator by callsign…", className }: { placeholder?: string; className?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/federation/operators?q=${encodeURIComponent(q.trim())}&limit=8`);
        if (r.ok) {
          const data = await r.json();
          setResults(data.operators ?? []);
        }
      } catch {
        // silent — search is best-effort
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-secondary/40 border border-border/60 rounded-md pl-9 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
        />
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 nros-deck bg-card/95 backdrop-blur-xl shadow-lg overflow-hidden">
          {loading && results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground font-mono">// searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground font-mono">// no operators match &quot;{q}&quot;</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/operator/${encodeURIComponent(r.callsign)}`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{r.callsign}</span>
                      {r.rank && (
                        <span
                          className="font-mono text-[9px] uppercase tracking-[0.14em]"
                          style={{ color: r.rank_color ?? "currentColor" }}
                        >
                          {r.rank}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {r.xp.toLocaleString()} XP
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
