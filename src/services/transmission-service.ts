import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import type { Transmission, TransmissionKind } from "@/types/federation";

export async function pushTransmission(input: {
  realmId: string;
  operatorId?: string | null;
  kind: TransmissionKind;
  /** Optional dotted civilization event name (e.g. 'deployment.launch'). */
  eventName?: string | null;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}): Promise<Transmission> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("transmissions")
    .insert({
      realm_id: input.realmId,
      operator_id: input.operatorId ?? null,
      kind: input.kind,
      event_name: input.eventName ?? null,
      title: input.title,
      body: input.body ?? null,
      metadata: input.metadata ?? {},
      occurred_at: (input.occurredAt ?? new Date()).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  // Realtime listeners on the `transmissions` table get this for free via
  // Supabase Realtime; no extra fan-out required.
  return data as Transmission;
}

export async function listTransmissions(opts: { limit?: number; realmId?: string; operatorId?: string } = {}) {
  const supabase = await createSupabaseServer();
  let q = supabase
    .from("transmissions")
    .select("*, realms(slug, name, icon_url)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.realmId)    q = q.eq("realm_id", opts.realmId);
  if (opts.operatorId) q = q.eq("operator_id", opts.operatorId);
  const { data } = await q;
  return data ?? [];
}
