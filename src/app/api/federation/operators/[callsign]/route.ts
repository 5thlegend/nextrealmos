// GET /api/federation/operators/[callsign] — federated identity lookup (Bearer auth)
// Returns the operator's universal profile + their realms membership (READ scope).

import { NextResponse } from "next/server";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ callsign: string }> }) {
  let auth;
  try {
    auth = await authenticateRealm(_req);
    requireScope(auth, "READ");
  } catch (e) {
    if (e instanceof FederationAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { callsign } = await params;
  const admin = createSupabaseAdmin();

  const { data: profile } = await admin
    .from("operator_profiles")
    .select("id, callsign, xp, rank_id, avatar_url, created_at")
    .ilike("callsign", callsign)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const [{ data: rank }, { data: realms }] = await Promise.all([
    admin.from("ranks").select("*").eq("id", profile.rank_id).maybeSingle(),
    admin
      .from("operator_realms")
      .select("realm_xp, joined_at, last_active_at, realms(slug, name)")
      .eq("operator_id", profile.id),
  ]);

  return NextResponse.json({
    operator: {
      id: profile.id,
      callsign: profile.callsign,
      universal_xp: profile.xp,
      rank,
      avatar_url: profile.avatar_url,
      since: profile.created_at,
    },
    realms: realms ?? [],
    requested_by: { realm: auth.realm.slug },
  });
}
