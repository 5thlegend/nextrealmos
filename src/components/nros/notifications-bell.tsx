"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_GLYPH: Record<string, string> = {
  MISSION:   "✓",
  RANK:      "↗",
  SQUAD:     "◇",
  WORKFLOW:  "⌬",
  SYSTEM:    "·",
};

/**
 * Notifications bell + dropdown. Subscribes to Supabase realtime on
 * `notifications` filtered to the current operator so unread counts +
 * the dropdown list update live without a refresh.
 */
export function NotificationsBell({ operatorId }: { operatorId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications").then(async (r) => {
      if (cancelled || !r.ok) return;
      const data = await r.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    });
    return () => { cancelled = true; };
  }, []);

  // Realtime — new notification rows
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || !operatorId) return;
    const supabase = createBrowserClient(url, key);
    const ch = supabase
      .channel(`nros-notifs-${operatorId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `operator_id=eq.${operatorId}` },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, 20));
          setUnread((u) => u + 1);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [operatorId]);

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    fetch("/api/notifications", { method: "POST" }).catch(() => undefined);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread > 0) void markAllRead();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={cn(
          "relative h-8 w-8 grid place-items-center rounded-md border transition-colors",
          unread > 0
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 text-muted-foreground hover:text-foreground",
        )}
        title="Notifications"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      >
        {unread > 0 ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] px-1 rounded-full bg-primary text-[9px] font-mono text-primary-foreground grid place-items-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-80 nros-deck bg-card/95 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
            <p className="nros-eyebrow">// notifications</p>
            <span className="font-mono text-[10px] text-muted-foreground">{items.length} recent</span>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted-foreground font-mono text-center">// inbox empty</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border/40">
              {items.map((n) => {
                const glyph = KIND_GLYPH[n.kind] ?? "·";
                const isUnread = !n.read_at;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "px-3 py-2 transition-colors",
                      isUnread ? "bg-primary/5" : "",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs text-primary w-3 text-center shrink-0 mt-0.5">{glyph}</span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs truncate", isUnread && "font-semibold")}>{n.title}</p>
                        {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                        <p className="font-mono text-[9px] text-muted-foreground mt-1">{relTime(new Date(n.created_at))}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
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
