// GET  /api/federation/operators?q=<query>&limit=20
//   Public operator search by callsign prefix. Useful for autocomplete.
//
// POST /api/federation/operators  (Bearer realm key, WRITE scope)
//   Mirror a realm's signup into the canonical NROS callsign registry.
//   Body: { external_uid, callsign, email?, display_name?, metadata? }
//   Returns: { operator_id, callsign, claimed, mirror_status }
//   - claimed=true means this operator already has a NROS account (auth.users link)
//   - mirror_status: "created" | "linked_existing" | "already_mirrored"
//
// The contract realms agree to: post once per signup, NROS dedupes globally
// by (realm_id, external_uid) → email_hash → callsign.

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

const MirrorBody = z.object({
  external_uid:  z.string().min(1).max(128),
  callsign:      z.string().min(2).max(48).regex(/^[A-Za-z0-9_.\-]+$/, "callsign: letters, digits, _ . -"),
  email:         z.string().email().optional(),
  display_name:  z.string().min(1).max(96).optional(),
  metadata:      z.record(z.any()).optional(),
});

/** sha256 lowercase email — for cross-realm dedupe without storing PII. */
async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "fed:ops:search", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 50);
  if (q.length < 1) return NextResponse.json({ operators: [] });

  const supabase = await createSupabaseServer();
  const esc = q.replace(/[%_]/g, (m) => `\\${m}`);
  const { data } = await supabase
    .from("operator_profiles")
    .select("id, callsign, xp, rank_id, avatar_url, ranks(name, badge_color)")
    .or(`callsign.ilike.${esc}%,callsign.ilike.%${esc}%`)
    .order("xp", { ascending: false })
    .limit(limit);

  type Row = { id: string; callsign: string; xp: number; rank_id: string | null; avatar_url: string | null; ranks: { name?: string; badge_color?: string } | null };
  const operators = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    callsign: r.callsign,
    xp: r.xp,
    avatar_url: r.avatar_url,
    rank: r.ranks?.name ?? null,
    rank_color: r.ranks?.badge_color ?? null,
  }));

  return NextResponse.json({ operators });
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

  const limited = await rateLimit(req, { bucket: "fed:ops:mirror", limit: 600, windowMs: 60_000, identifier: auth.realm.id });
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = MirrorBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const email_hash = parsed.data.email ? await hashEmail(parsed.data.email) : null;

  const admin = createSupabaseAdmin();

  const { data: existing } = await admin
    .from("operator_external_identities")
    .select("operator_id")
    .eq("realm_id", auth.realm.id)
    .eq("external_uid", parsed.data.external_uid)
    .maybeSingle();
  const wasAlreadyMirrored = !!existing;

  let attachedExisting = false;
  if (!wasAlreadyMirrored) {
    if (email_hash) {
      const { data: byEmail } = await admin
        .from("operator_profiles")
        .select("id")
        .eq("email_hash", email_hash)
        .maybeSingle();
      if (byEmail) attachedExisting = true;
    }
    if (!attachedExisting) {
      const { data: byCallsign } = await admin
        .from("operator_profiles")
        .select("id")
        .eq("callsign", parsed.data.callsign)
        .maybeSingle();
      if (byCallsign) attachedExisting = true;
    }
  }

  const { data: opIdData, error: rpcErr } = await admin.rpc("nros_register_realm_operator", {
    p_realm_id:     auth.realm.id,
    p_external_uid: parsed.data.external_uid,
    p_callsign:     parsed.data.callsign,
    p_email_hash:   email_hash,
    p_display_name: parsed.data.display_name ?? null,
    p_metadata:     parsed.data.metadata ?? {},
  });
  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }
  const operator_id = opIdData as string;

  const { data: profile } = await admin
    .from("operator_profiles")
    .select("id, callsign, user_id, xp, claimed_at")
    .eq("id", operator_id)
    .single();

  if (!wasAlreadyMirrored && profile) {
    await pushTransmission({
      realmId: auth.realm.id,
      operatorId: operator_id,
      kind: "OPERATOR_JOINED",
      eventName: "operator.activation",
      title: `${(profile as { callsign: string }).callsign} joined via /${auth.realm.slug}`,
      metadata: {
        source_realm: auth.realm.slug,
        external_uid: parsed.data.external_uid,
        attached_existing: attachedExisting,
      },
    }).catch(() => undefined);
  }

  const mirror_status = wasAlreadyMirrored
    ? "already_mirrored"
    : attachedExisting
      ? "linked_existing"
      : "created";

  return NextResponse.json({
    operator_id,
    callsign: (profile as { callsign?: string } | null)?.callsign ?? parsed.data.callsign,
    claimed:  !!(profile as { user_id?: string | null } | null)?.user_id,
    mirror_status,
  }, { status: wasAlreadyMirrored ? 200 : 201 });
}
