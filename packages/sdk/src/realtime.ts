/**
 * Realtime federation event subscription.
 *
 * Realms can subscribe to NROS transmissions in real-time via Supabase
 * Realtime. Use this when your realm wants to react to civilization events
 * happening in OTHER realms (e.g. show a toast when a top operator joins,
 * pull cross-realm leaderboards live, etc.).
 *
 * Usage (browser or worker):
 *
 *   import { subscribeTransmissions } from "@nros/sdk/realtime";
 *
 *   const unsubscribe = subscribeTransmissions({
 *     supabaseUrl: "https://pwmmoqoayhjonwhombbz.supabase.co",
 *     supabaseAnonKey: "eyJ...",
 *     filter: { realmId: "<my-realm-id>" },     // optional
 *     onTransmission: (tx) => {
 *       console.log("event:", tx.event_name, tx.title);
 *     },
 *   });
 *
 *   // later:
 *   unsubscribe();
 *
 * Requires @supabase/supabase-js >= 2.40 in the realm's deps.
 * (Peer dependency — not bundled with @nros/sdk to keep it lean.)
 */

export type TransmissionEvent = {
  id: string;
  realm_id: string;
  operator_id: string | null;
  kind: string;
  event_name: string | null;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
};

export type SubscribeOptions = {
  /** NROS Supabase project URL — same as the federation Supabase project. */
  supabaseUrl: string;
  /** anon key (public, safe in browsers). */
  supabaseAnonKey: string;
  /** Optional server-side filter. Without it, all federation events stream. */
  filter?: {
    realmId?: string;
    operatorId?: string;
    kind?: string;
    eventName?: string;
  };
  /** Called for every new transmission matching the filter. */
  onTransmission: (tx: TransmissionEvent) => void;
  /** Called on subscription error / disconnect. */
  onError?: (err: unknown) => void;
};

/**
 * Subscribe to NROS transmissions in real-time. Returns an unsubscribe fn.
 *
 * Loads @supabase/supabase-js dynamically so the SDK stays dep-free.
 */
export async function subscribeTransmissions(opts: SubscribeOptions): Promise<() => void> {
  let createClient: (typeof import("@supabase/supabase-js"))["createClient"];
  try {
    ({ createClient } = await import("@supabase/supabase-js"));
  } catch {
    throw new Error("@nros/sdk/realtime requires @supabase/supabase-js as a peer dep. `npm install @supabase/supabase-js`.");
  }

  const supabase = createClient(opts.supabaseUrl, opts.supabaseAnonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  // Build a postgres_changes filter expression
  const filter = (() => {
    const parts: string[] = [];
    if (opts.filter?.realmId)    parts.push(`realm_id=eq.${opts.filter.realmId}`);
    if (opts.filter?.operatorId) parts.push(`operator_id=eq.${opts.filter.operatorId}`);
    if (opts.filter?.kind)       parts.push(`kind=eq.${opts.filter.kind}`);
    if (opts.filter?.eventName)  parts.push(`event_name=eq.${opts.filter.eventName}`);
    return parts.join(",") || undefined;
  })();

  const channel = supabase
    .channel(`nros-tx-${Math.random().toString(36).slice(2, 10)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "transmissions", ...(filter ? { filter } : {}) },
      (payload) => {
        try {
          opts.onTransmission(payload.new as TransmissionEvent);
        } catch (err) {
          opts.onError?.(err);
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        opts.onError?.(new Error(`subscription status: ${status}`));
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
