// Server-to-server auth for federation API routes.
// Realms include `Authorization: Bearer nros_pk_<...>` on every call.

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sha256 } from "./realm-service";
import type { Realm, RealmApiKey } from "@/types/federation";

export type AuthenticatedRealm = {
  realm: Realm;
  key: RealmApiKey;
};

export class FederationAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function authenticateRealm(req: Request): Promise<AuthenticatedRealm> {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    throw new FederationAuthError(401, "Missing bearer token");
  }
  const token = auth.slice(7).trim();
  if (!token.startsWith("nros_pk_")) {
    throw new FederationAuthError(401, "Invalid token format");
  }

  const hash = await sha256(token);
  const admin = createSupabaseAdmin();
  const { data: key } = await admin
    .from("realm_api_keys")
    .select("*")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!key) throw new FederationAuthError(401, "Token not recognized");
  if (key.revoked_at) throw new FederationAuthError(401, "Token revoked");
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    throw new FederationAuthError(401, "Token expired");
  }

  const { data: realm } = await admin.from("realms").select("*").eq("id", key.realm_id).maybeSingle();
  if (!realm) throw new FederationAuthError(401, "Realm not found");
  if (realm.status !== "ACTIVE") throw new FederationAuthError(403, `Realm status: ${realm.status}`);

  // Touch last_used_at (fire-and-forget).
  void admin
    .from("realm_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return { realm: realm as Realm, key: key as RealmApiKey };
}

export function requireScope(auth: AuthenticatedRealm, scope: "READ" | "WRITE" | "ADMIN") {
  const order = { READ: 0, WRITE: 1, ADMIN: 2 } as const;
  if (order[auth.key.scope] < order[scope]) {
    throw new FederationAuthError(403, `Scope ${auth.key.scope} insufficient (need ${scope})`);
  }
}
