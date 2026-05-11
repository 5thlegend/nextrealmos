// POST /api/federation/realms — register a new realm (operator-authenticated, NOT API-key)
// GET  /api/federation/realms — list ACTIVE realms (public discovery)

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOperator } from "@/services/operator-service";
import { listRealms, registerRealm, issueApiKey } from "@/services/realm-service";
import { pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

const RegisterBody = z.object({
  slug: z.string().min(2).max(48).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug: lowercase letters, digits, hyphens; cannot start/end with hyphen"),
  name: z.string().min(2).max(64),
  description: z.string().max(280).optional(),
  base_url: z.string().url().optional(),
});

export async function GET() {
  const realms = await listRealms();
  // Only expose ACTIVE to anonymous discovery
  const visible = realms.filter((r) => r.status === "ACTIVE");
  return NextResponse.json({ realms: visible });
}

export async function POST(req: Request) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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

    // Issue an initial WRITE-scoped key so the realm can start pushing immediately.
    const issued = await issueApiKey({
      realmId: realm.id,
      name: "Initial bootstrap key",
      scope: "WRITE",
    });

    // Federated event: this realm just came online.
    await pushTransmission({
      realmId: realm.id,
      operatorId: op.profile.id,
      kind: "REALM_REGISTERED",
      title: `${realm.name} joined the federation`,
      body: realm.description,
      metadata: { slug: realm.slug, base_url: realm.base_url },
    }).catch(() => undefined);

    // The full key is shown ONCE here. After this it lives only as a hash.
    return NextResponse.json({
      realm,
      api_key: { id: issued.record.id, value: issued.key, scope: issued.record.scope },
    }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message ?? "Could not register realm";
    const status = msg.includes("duplicate") || msg.includes("unique") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
