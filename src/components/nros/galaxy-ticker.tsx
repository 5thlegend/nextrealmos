"use client";

import * as React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Live federation ticker. Hydrates with the server-snapshot of recent
 * transmissions, then subscribes to Supabase Realtime to prepend new
 * transmissions as they land (capped to 12 visible rows).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

type Transmission = {
  id?: string;
  realm_id?: string;
  operator_id?: string | null;
  kind?: string;
  event_name?: string | null;
  title?: string;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  realms?: { slug?: string; name?: string; icon_url?: string | null } | null;
};

const EVENT_GLYPH: Record<string, string> = {
  "deployment.launch":   "▲",
  "deployment.ship":     "▶",
  "deployment.iteration":"◌",
  "deployment.milestone":"◆",
  "operator.ascension":  "↗",
  "operator.activation": "✦",
  "realm.attach":        "◈",
  "realm.vault":         "▽",
  "guild.create":        "◇",
  "mission.complete":    "✓",
  "achievement.unlock":  "★",
  "wonder.built":        "▣",
};

export function GalaxyTicker({ transmissions: initial }: { transmissions: Array<Record<string, unknown>> }) {
  const [items, setItems] = useState<Transmission[]>(() => initial as Transmission[]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    const channel = supabase
      .channel("nros-galaxy-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transmissions" },
        (payload) => {
          const row = payload.new as Transmission;
          setItems((prev) => [row, ...prev].slice(0, 12));
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {items.map((tx, i) => {
        const glyph = (tx.event_name && EVENT_GLYPH[tx.event_name]) ?? "·";
        const realmSlug = tx.realms?.slug;
        const ts = tx.created_at ? new Date(tx.created_at) : null;
        return (
          <li
            key={tx.id ?? i}
            className="flex items-center gap-3 rounded-md border border-border/40 bg-card/40 px-3 py-2 hover:border-primary/40 transition-colors"
          >
            <span className="font-mono text-sm text-primary w-4 text-center">{glyph}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground shrink-0 w-32 truncate">
              {tx.event_name ?? tx.kind?.toLowerCase()}
            </span>
            <span className="text-xs flex-1 truncate">{tx.title}</span>
            {realmSlug && (
              <Link href={`/realms/${realmSlug}`} className="font-mono text-[10px] text-muted-foreground hover:text-primary shrink-0">
                /{realmSlug}
              </Link>
            )}
            {ts && (
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{relTime(ts)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function relTime(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  return `${day}d`;
}
