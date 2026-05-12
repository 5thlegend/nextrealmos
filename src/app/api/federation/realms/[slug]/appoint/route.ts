// POST /api/federation/realms/[slug]/appoint — owner-only elite leader appointment
// DELETE /api/federation/realms/[slug]/appoint?leader_id=<uuid> — revoke

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOperator } from "@/services/operator-service";
import { getRealmBySlug } from "@/services/realm-service";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

const Body = z.object({
  callsign: z.string().min(2).max(48),
  role: z.enum(["WARDEN", "ARCHITECT", "DIPLOMAT", "OVERSEER"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) return NextResponse.json({ error: "Realm not found" }, { status: 404 });
  if (realm.owner_operator_id !== op.profile.id) {
    return NextResponse.json({ error: "Only the realm owner can appoint" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: target } = await admin
    .from("operator_profiles")
    .select("id, callsign")
    .ilike("callsign", parsed.data.callsign)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: `Operator '${parsed.data.callsign}' not found` }, { status: 404 });

  const { data: appointed, error } = await admin
    .from("elite_leaders")
    .insert({
      operator_id: target.id,
      realm_id: realm.id,
      role: parsed.data.role,
      appointed_by: op.profile.id,
    })
    .select("id, role")
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return NextResponse.json({ error: "Already appointed in that role" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await pushTransmission({
    realmId: realm.id,
    operatorId: target.id,
    kind: "SYSTEM",
    eventName: "operator.ascension",
    title: `${target.callsign} appointed ${parsed.data.role} of ${realm.slug}`,
    metadata: { role: parsed.data.role, realm_slug: realm.slug, appointment_id: appointed.id },
  }).catch(() => undefined);

  return NextResponse.json({ id: appointed.id, role: appointed.role, callsign: target.callsign }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) return NextResponse.json({ error: "Realm not found" }, { status: 404 });
  if (realm.owner_operator_id !== op.profile.id) {
    return NextResponse.json({ error: "Only the realm owner can revoke" }, { status: 403 });
  }

  const url = new URL(req.url);
  const leaderId = url.searchParams.get("leader_id");
  if (!leaderId) return NextResponse.json({ error: "leader_id required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("elite_leaders")
    .delete()
    .eq("id", leaderId)
    .eq("realm_id", realm.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
