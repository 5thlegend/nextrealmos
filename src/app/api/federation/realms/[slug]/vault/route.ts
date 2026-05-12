// POST /api/federation/realms/[slug]/vault    — owner-only, vault realm
// DELETE /api/federation/realms/[slug]/vault   — owner-only, restore realm
//
// Operator-authenticated (NOT API-key — vaulting is governance, not realm self-service).

import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/services/operator-service";
import { getRealmBySlug, vaultRealm, restoreRealm } from "@/services/realm-service";
import { pushTransmission } from "@/services/transmission-service";

export const runtime = "edge";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) return NextResponse.json({ error: "Realm not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 280) : undefined;

  try {
    await vaultRealm({ realmId: realm.id, actorOperatorId: op.profile.id, reason });
    await pushTransmission({
      realmId: realm.id,
      operatorId: op.profile.id,
      kind: "REALM_VAULTED",
      eventName: "realm.vault",
      title: `${realm.name} sent to vault`,
      body: reason ?? null,
      metadata: { slug: realm.slug, reason: reason ?? null },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, vaulted_at: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Vault failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("owner") ? 403 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const op = await getCurrentOperator();
  if (!op) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { slug } = await params;
  const realm = await getRealmBySlug(slug);
  if (!realm) return NextResponse.json({ error: "Realm not found" }, { status: 404 });

  try {
    await restoreRealm({ realmId: realm.id, actorOperatorId: op.profile.id });
    await pushTransmission({
      realmId: realm.id,
      operatorId: op.profile.id,
      kind: "SYSTEM",
      eventName: "realm.restore",
      title: `${realm.name} restored from vault`,
      metadata: { slug: realm.slug },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, vaulted_at: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Restore failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("owner") ? 403 : 500 });
  }
}
