// POST /api/federation/realms — register a new realm (operator-authenticated, NOT API-key)
// GET  /api/federation/realms — list ACTIVE realms (public discovery, owner UUID stripped)

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOperator } from "@/services/operator-service";
import { listPublicRealms, registerRealm, issueApiKey } from "@/services/realm-service";
import { pushTransmission } from "@/services/transmission-service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const RegisterBody = z.object({
  slug: z.string().min(2).max(48).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug: lowercase letters, digits, hyphens; cannot start/end with hyphen"),
  name: z.string().min(2).max(64),
  description: z.string().max(280).optional(),
  base_url: z.string().url().optional(),
});

export async function GET(req: Request) {
  const limited = await rateLimit(req, { bucket: "fed:realms:get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const includeVaulted = url.searchParams.get("include_vaulted") === "1";

  // Always fetch the full set so counts reflect truth, then trim the
  // returned realms list per the includeVaulted flag.
  const all = await listPublicRealms({ includeVaulted: true });
  const visible = includeVaulted ? all : all.filter((r) => r.status === "ACTIVE" && !r.vaulted_at);

  return NextResponse.json({
    realms: visible,
    counts: {
      active:  all.filter((r) => r.status === "ACTIVE" && !r.vaulted_at).length,
      vaulted: all.filter((r) => r.vaulted_at).length,
      total:   all.length,
    },
  });
}

export async function POST(req: Request) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await rateLimit(req, { bucket: "fed:realms:post", limit: 10, windowMs: 60_000, identifier: op.profile.id });
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = RegisterBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  try {
    const realm = await registerRealm({
      ownerOperatorId: op.profile.id,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      base_url: parsed.data.base_url,
    });

    const issued = await issueApiKey({
      realmId: realm.id,
      name: "Initial bootstrap key",
      scope: "WRITE",
    });

    await pushTransmission({
      realmId: realm.id,
      operatorId: op.profile.id,
      kind: "REALM_REGISTERED",
      eventName: "realm.attach",
      title: `${realm.name} joined the federation`,
      body: realm.description,
      metadata: { slug: realm.slug, base_url: realm.base_url },
    }).catch(() => undefined);

    return NextResponse.json({
      realm: {
        id: realm.id,
        slug: realm.slug,
        name: realm.name,
        description: realm.description,
        base_url: realm.base_url,
        status: realm.status,
        created_at: realm.created_at,
      },
      api_key: { id: issued.record.id, value: issued.key, scope: issued.record.scope },
    }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not register realm";
    const status = msg.includes("duplicate") || msg.includes("unique") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
