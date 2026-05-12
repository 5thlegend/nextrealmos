// Elite Leader appointment API.
//
//   GET    /api/federation/elite-leaders                    - list all (public)
//   GET    /api/federation/elite-leaders?realm=<slug>       - filter
//   POST   /api/federation/elite-leaders                    - appoint (bearer ADMIN scope)
//
// Per DIVINE-SYNC v2: elite leaders govern realms with formal roles
// (WARDEN/ARCHITECT/DIPLOMAT/OVERSEER). Distinct from realm `owner_operator_id`
// because leaders can be delegated authority over realms they don't own.

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "edge";

const AppointBody = z.object({
  callsign: z.string().min(2).max(48),
  realm_slug: z.string().min(2).max(64).optional(),     // null = federation-wide overseer
  role: z.enum(["WARDEN", "ARCHITECT", "DIPLOMAT", "OVERSEER"]),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const realmSlug = url.searchParams.get("realm");

  let query = supabase
    .from("elite_leaders")
    .select("id, role, appointed_at, operator_id, realm_id, operator_profiles(callsign), realms(slug, name)")
    .order("appointed_at", { ascending: false })
    .limit(200);

  if (realmSlug) {
    const { data: realm } = await supabase.from("realms").select("id").eq("slug", realmSlug).maybeSingle();
    if (!realm) return NextResponse.json({ leaders: [] });
    query = query.eq("realm_id", realm.id);
  }

  const { data } = await query;
  const leaders = (data ?? []).map((row: any) => ({
    id: row.id,
    role: row.role,
    appointed_at: row.appointed_at,
    operator: { id: row.operator_id, callsign: row.operator_profiles?.callsign ?? null },
    realm: row.realm_id ? { id: row.realm_id, slug: row.realms?.slug ?? null, name: row.realms?.name ?? null } : null,
  }));
  return NextResponse.json({ leaders });
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await authenticateRealm(req);
    requireScope(auth, "ADMIN");
  } catch (e) {
    if (e instanceof FederationAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const json = await req.json().catch(() => null);
  const parsed = AppointBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const admin = createSupabaseAdmin();

  // Resolve operator
  const { data: op } = await admin.from("operator_profiles").select("id").ilike("callsign", parsed.data.callsign).maybeSingle();
  if (!op) return NextResponse.json({ error: `Operator '${parsed.data.callsign}' not found` }, { status: 404 });

  // Resolve realm (or null for federation-wide)
  let realmId: string | null = null;
  if (parsed.data.realm_slug) {
    const { data: realm } = await admin.from("realms").select("id").eq("slug", parsed.data.realm_slug).maybeSingle();
    if (!realm) return NextResponse.json({ error: `Realm '${parsed.data.realm_slug}' not found` }, { status: 404 });
    realmId = realm.id;
  }

  // Insert appointment (with appointed_by = the realm's owner if known)
  const { data: appointed, error } = await admin
    .from("elite_leaders")
    .insert({
      operator_id: op.id,
      realm_id: realmId,
      role: parsed.data.role,
      appointed_by: auth.realm.owner_operator_id,
    })
    .select("id, role")
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json({ error: "This appointment already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Emit transmission so the appointment shows in the federated feed
  const { pushTransmission } = await import("@/services/transmission-service");
  await pushTransmission({
    realmId: auth.realm.id,
    operatorId: op.id,
    kind: "SYSTEM",
    eventName: "operator.ascension",
    title: `${parsed.data.callsign} appointed ${parsed.data.role}${parsed.data.realm_slug ? ` of ${parsed.data.realm_slug}` : " (federation-wide)"}`,
    metadata: { role: parsed.data.role, realm_slug: parsed.data.realm_slug ?? null, appointment_id: appointed.id },
  }).catch(() => undefined);

  return NextResponse.json({ id: appointed.id, role: appointed.role }, { status: 201 });
}
