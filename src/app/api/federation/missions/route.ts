// Cross-realm mission publishing API.
//
//   GET   /api/federation/missions                            - list ACTIVE missions
//   GET   /api/federation/missions?realm=<slug>               - filter to a realm
//   POST  /api/federation/missions                            - publish (bearer WRITE)
//
// Realms publish missions that operators can accept anywhere. Mission completion
// (already supported via /api/federation/transmissions with kind=MISSION_COMPLETED)
// awards the mission's xp_reward via the federation XP API.

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRealm, FederationAuthError, requireScope } from "@/services/federation-auth";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "edge";

const PublishBody = z.object({
  title: z.string().min(2).max(120),
  brief: z.string().min(2).max(1000),
  difficulty: z.enum(["T1", "T2", "T3", "T4", "T5"]).default("T1"),
  xp_reward: z.number().int().min(0).max(10000).default(100),
  tags: z.array(z.string().max(32)).max(10).default([]),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const realmSlug = url.searchParams.get("realm");

  let query = supabase
    .from("missions")
    .select("id, title, brief, difficulty, xp_reward, tags, realm_id, status, created_at, realms(slug, name)")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(200);

  if (realmSlug) {
    const { data: realm } = await supabase.from("realms").select("id").eq("slug", realmSlug).maybeSingle();
    if (!realm) return NextResponse.json({ missions: [] });
    query = query.eq("realm_id", realm.id);
  }

  const { data } = await query;
  const missions = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    brief: row.brief,
    difficulty: row.difficulty,
    xp_reward: row.xp_reward,
    tags: row.tags,
    status: row.status,
    realm: row.realm_id ? { id: row.realm_id, slug: row.realms?.slug ?? null, name: row.realms?.name ?? null } : null,
    created_at: row.created_at,
  }));
  return NextResponse.json({ missions });
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
  const parsed = PublishBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: created, error } = await admin
    .from("missions")
    .insert({
      title: parsed.data.title,
      brief: parsed.data.brief,
      difficulty: parsed.data.difficulty,
      xp_reward: parsed.data.xp_reward,
      tags: parsed.data.tags,
      status: "ACTIVE",
      realm_id: auth.realm.id,
      created_by: auth.realm.owner_operator_id,
    })
    .select("id, title, xp_reward")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Emit transmission
  const { pushTransmission } = await import("@/services/transmission-service");
  await pushTransmission({
    realmId: auth.realm.id,
    kind: "SYSTEM",
    eventName: "mission.publish",
    title: `New mission published in /${auth.realm.slug}: ${created.title}`,
    metadata: { mission_id: created.id, xp_reward: created.xp_reward, difficulty: parsed.data.difficulty },
  }).catch(() => undefined);

  return NextResponse.json({ id: created.id, title: created.title, xp_reward: created.xp_reward }, { status: 201 });
}
