import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import type { Realm, RealmApiKey } from "@/types/federation";

export async function listRealms(): Promise<Realm[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("realms").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Realm[];
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
