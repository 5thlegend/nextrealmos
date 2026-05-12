// POST /api/federation/transmissions — realm pushes an event (Bearer auth)
// GET  /api/federation/transmissions — read the federated feed (public)

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { listTransmissions, pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

const PushBody = z.object({
  kind: z.enum([
    "OPERATOR_JOINED", "XP_AWARDED", "RANK_CHANGED", "ACHIEVEMENT_UNLOCKED",
    "MISSION_COMPLETED", "WORKFLOW_FORGED", "REALM_REGISTERED", "SYSTEM", "CUSTOM",
  ]),
  /** Optional dotted-namespace civilization event name (e.g. 'deployment.launch'). */
  event_name: z.string().max(120).regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, "event_name must be lowercase dotted (e.g. deployment.launch)").optional(),
  title: z.string().min(2).max(140),
  body: z.string().max(2000).optional(),
  operator_id: z.string().uuid().optional(),
  callsign: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  occurred_at: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const realmId = url.searchParams.get("realm_id") ?? undefined;
  const operatorId = url.searchParams.get("operator_id") ?? undefined;

  const rows = await listTransmissions({ limit, realmId, operatorId });
  return NextResponse.json({ transmissions: rows });
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await authenticateRealm(req);
    requireScope(auth, "WRITE");
  } catch (e) {
    if (e instanceof FederationAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const json = await req.json().catch(() => null);
  const parsed = PushBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  // Resolve callsign → operator_id if needed
  let operatorId = parsed.data.operator_id ?? null;
  if (!operatorId && parsed.data.callsign) {
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const admin = createSupabaseAdmin();
    const { data: op } = await admin.from("operator_profiles").select("id").ilike("callsign", parsed.data.callsign).maybeSingle();
    operatorId = op?.id ?? null;
  }

  const tx = await pushTransmission({
    realmId: auth.realm.id,
    operatorId,
    kind: parsed.data.kind,
    eventName: parsed.data.event_name ?? null,
    title: parsed.data.title,
    body: parsed.data.body ?? null,
    metadata: parsed.data.metadata ?? {},
    occurredAt: parsed.data.occurred_at ? new Date(parsed.data.occurred_at) : undefined,
  });

  return NextResponse.json({ transmission: tx }, { status: 201 });
}
