// POST /api/federation/transmissions — realm pushes an event (Bearer auth)
// GET  /api/federation/transmissions — read the federated feed (public, rate-limited)
//
// V3.4: accepts both `callsign` (canonical) and `operator_callsign` (legacy
// from older Operator Grid worker) so realms with hand-rolled clients keep
// working through the migration window.

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { listTransmissions, pushTransmission } from "@/services/transmission-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const PushBody = z.object({
  kind: z.enum([
    "OPERATOR_JOINED", "XP_AWARDED", "RANK_CHANGED", "ACHIEVEMENT_UNLOCKED",
    "MISSION_COMPLETED", "WORKFLOW_FORGED", "REALM_REGISTERED", "SYSTEM", "CUSTOM",
    "GUILD_FORMED", "INFLUENCE_GROWTH", "ECONOMY_TX", "AGENT_DEPLOYED", "REALM_VAULTED",
  ]),
  /** Optional dotted-namespace civilization event name (e.g. 'deployment.launch'). */
  event_name: z.string().max(120).regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, "event_name must be lowercase dotted (e.g. deployment.launch)").optional(),
  title: z.string().min(2).max(140),
  body: z.string().max(2000).optional(),
  operator_id: z.string().uuid().optional(),
  /** Canonical field. */
  callsign: z.string().optional(),
  /** Legacy alias accepted for back-compat with older OG worker (P0-2). */
  operator_callsign: z.string().optional(),
  /** Legacy field — silently ignored (P0-2). */
  realm_slug: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  occurred_at: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "fed:tx:get", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const realmId = url.searchParams.get("realm_id") ?? undefined;
  const operatorId = url.searchParams.get("operator_id") ?? undefined;
  const eventName = url.searchParams.get("event_name") ?? undefined;

  const rows = await listTransmissions({ limit, realmId, operatorId, eventName });
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

  // 600 events per minute per realm key — enough for legitimate bursts,
  // sharp enough to stop a runaway loop.
  const limited = await rateLimit(req, { bucket: "fed:tx:post", limit: 600, windowMs: 60_000, identifier: auth.realm.id });
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = PushBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  // Resolve callsign → operator_id if needed (accept both field names for
  // back-compat with the older OG worker).
  let operatorId = parsed.data.operator_id ?? null;
  const callsign = parsed.data.callsign ?? parsed.data.operator_callsign;
  if (!operatorId && callsign) {
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const admin = createSupabaseAdmin();
    const { data: op } = await admin.from("operator_profiles").select("id").ilike("callsign", callsign).maybeSingle();
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
