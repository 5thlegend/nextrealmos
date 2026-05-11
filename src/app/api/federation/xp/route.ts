// POST /api/federation/xp — realm awards XP to an operator (Bearer auth)

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { awardXp } from "@/services/xp-service";
import { pushTransmission } from "@/services/transmission-service";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "edge";

const Body = z.object({
  operator_id: z.string().uuid().optional(),
  callsign: z.string().optional(),
  delta: z.number().int().min(-10000).max(10000),
  reason: z.string().min(2).max(280),
  source_id: z.string().uuid().optional(),
  emit_transmission: z.boolean().optional().default(true),
}).refine((v) => v.operator_id || v.callsign, { message: "operator_id or callsign required" });

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
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  // Resolve operator
  const admin = createSupabaseAdmin();
  let operatorId = parsed.data.operator_id;
  if (!operatorId && parsed.data.callsign) {
    const { data: op } = await admin
      .from("operator_profiles")
      .select("id")
      .ilike("callsign", parsed.data.callsign)
      .maybeSingle();
    if (!op) return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    operatorId = op.id;
  }

  const result = await awardXp({
    operatorId: operatorId!,
    delta: parsed.data.delta,
    reason: parsed.data.reason,
    sourceType: "SYSTEM",
    sourceId: parsed.data.source_id ?? null,
    realmId: auth.realm.id,
  });

  if (parsed.data.emit_transmission) {
    await pushTransmission({
      realmId: auth.realm.id,
      operatorId,
      kind: result.promoted ? "RANK_CHANGED" : "XP_AWARDED",
      title: result.promoted
        ? `Rank ascended → ${result.newRank?.name}`
        : `+${parsed.data.delta} XP — ${parsed.data.reason}`,
      metadata: { delta: parsed.data.delta, new_xp: result.newXp, rank: result.newRank?.tier ?? null },
    }).catch(() => undefined);
  }

  return NextResponse.json({
    operator_id: operatorId,
    new_xp: result.newXp,
    promoted: result.promoted,
    new_rank: result.newRank,
  });
}
