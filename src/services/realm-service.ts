import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import type { Realm, RealmApiKey } from "@/types/federation";

export async function listRealms(): Promise<Realm[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("realms").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Realm[];
}

/**
 * Public projection of a realm — strips owner_operator_id (PII / join-key
 * exposure) and any internal metadata. Use for anonymous federation API.
 */
export type PublicRealm = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_url: string | null;
  icon_url: string | null;
  status: Realm["status"];
  vaulted_at: string | null;
  created_at: string;
  approved_at: string | null;
};

export async function listPublicRealms(opts: { includeVaulted?: boolean } = {}): Promise<PublicRealm[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("realms")
    .select("id, slug, name, description, base_url, icon_url, status, vaulted_at, created_at, approved_at")
    .order("created_at", { ascending: true });
  const all = (data ?? []) as PublicRealm[];
  return opts.includeVaulted
    ? all
    : all.filter((r) => r.status === "ACTIVE" && !r.vaulted_at);
}

export async function getRealmBySlug(slug: string): Promise<Realm | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("realms").select("*").eq("slug", slug).maybeSingle();
  return (data as Realm) ?? null;
}

export async function getRealm(id: string): Promise<Realm | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("realms").select("*").eq("id", id).maybeSingle();
  return (data as Realm) ?? null;
}

export async function listOperatorRealms(operatorId: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("operator_realms")
    .select("*, realms(*)")
    .eq("operator_id", operatorId)
    .order("joined_at", { ascending: false });
  return data ?? [];
}

export async function registerRealm(input: {
  ownerOperatorId: string;
  slug: string;
  name: string;
  description?: string;
  base_url?: string;
}): Promise<Realm> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("realms")
    .insert({
      owner_operator_id: input.ownerOperatorId,
      slug: input.slug.toLowerCase(),
      name: input.name,
      description: input.description ?? null,
      base_url: input.base_url ?? null,
      // We auto-approve owner-registered realms in V1 of federation.
      // Admin moderation will gate this in a future migration.
      status: "ACTIVE",
      approved_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Realm;
}

// API key issuance — full key returned ONCE here, never stored as plaintext.
export async function issueApiKey(input: {
  realmId: string;
  name: string;
  scope?: "READ" | "WRITE" | "ADMIN";
  expiresAt?: Date | null;
}): Promise<{ key: string; record: RealmApiKey }> {
  const admin = createSupabaseAdmin();
  const fullKey = generateKey();
  const prefix = fullKey.slice(0, 16);
  const keyHash = await sha256(fullKey);

  const { data, error } = await admin
    .from("realm_api_keys")
    .insert({
      realm_id: input.realmId,
      name: input.name,
      key_prefix: prefix,
      key_hash: keyHash,
      scope: input.scope ?? "WRITE",
      expires_at: input.expiresAt?.toISOString() ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { key: fullKey, record: data as RealmApiKey };
}

export async function revokeApiKey(keyId: string) {
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("realm_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);
  if (error) throw error;
}

/**
 * Vault a realm — sends it to cold storage. Records preserved, deploy frozen.
 * Owner-only. Pushes a `realm.vault` transmission so the federation sees it.
 */
export async function vaultRealm(input: { realmId: string; reason?: string; actorOperatorId: string }): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: realm, error: rErr } = await admin
    .from("realms")
    .select("id, slug, name, owner_operator_id, vaulted_at")
    .eq("id", input.realmId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!realm) throw new Error("Realm not found");
  if (realm.owner_operator_id !== input.actorOperatorId) {
    throw new Error("Only the realm owner can vault");
  }
  if (realm.vaulted_at) return; // already vaulted

  const { error: uErr } = await admin
    .from("realms")
    .update({ vaulted_at: new Date().toISOString(), vault_reason: input.reason ?? null })
    .eq("id", input.realmId);
  if (uErr) throw uErr;
}

/**
 * Restore a vaulted realm. Owner-only. Clears `vaulted_at`.
 */
export async function restoreRealm(input: { realmId: string; actorOperatorId: string }): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: realm, error: rErr } = await admin
    .from("realms")
    .select("id, slug, name, owner_operator_id, vaulted_at")
    .eq("id", input.realmId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!realm) throw new Error("Realm not found");
  if (realm.owner_operator_id !== input.actorOperatorId) {
    throw new Error("Only the realm owner can restore");
  }
  if (!realm.vaulted_at) return; // already active

  const { error: uErr } = await admin
    .from("realms")
    .update({ vaulted_at: null, vault_reason: null })
    .eq("id", input.realmId);
  if (uErr) throw uErr;
}

// ----- helpers -----

function generateKey(): string {
  // Edge-runtime-safe: use Web Crypto for entropy.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const body = base62(bytes);
  return `nros_pk_${body}`;
}

function base62(bytes: Uint8Array): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
