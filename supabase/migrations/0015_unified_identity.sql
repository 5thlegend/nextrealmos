-- =====================================================================
--  V3.10 — UNIFIED IDENTITY
--  Today: every realm has its own auth (NROS Supabase, OG Supabase, etc.)
--  → callsigns can collide across the ecosystem and there's no canonical
--  "is this operator already known to the federation?"
--
--  This migration makes NROS the canonical callsign registry.
--   • operator_profiles.user_id becomes NULLABLE — a realm can mirror an
--     operator into NROS without that operator having a NROS auth account
--   • New columns: source_realm_id, claimed_at (when the operator links
--     a NROS auth.users row to a previously-mirrored callsign)
--   • New table: operator_external_identities — maps callsigns to external
--     realm identities (email_hash, external_uid, source_realm_id). Lets us
--     reconcile signups from any realm.
--   • Case-insensitive uniqueness on callsign already enforced by citext.
--   • Helper RPC nros_register_realm_operator() — idempotent mirror.
-- =====================================================================

-- ---------- relax operator_profiles auth coupling ----------
alter table operator_profiles alter column user_id drop not null;

alter table operator_profiles add column if not exists source_realm_id uuid references realms(id) on delete set null;
alter table operator_profiles add column if not exists claimed_at      timestamptz;
alter table operator_profiles add column if not exists display_name    text;
alter table operator_profiles add column if not exists email_hash      text;  -- sha256 lowercase email for dedupe without storing PII

create index if not exists idx_op_source_realm on operator_profiles(source_realm_id);
create index if not exists idx_op_email_hash   on operator_profiles(email_hash) where email_hash is not null;

-- ---------- external identity links ----------
create table if not exists operator_external_identities (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid not null references operator_profiles(id) on delete cascade,
  realm_id        uuid not null references realms(id) on delete cascade,
  external_uid    text not null,                  -- realm's own user id (uuid, slug, whatever)
  email_hash      text,                            -- sha256 lowercase email
  display_name    text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (realm_id, external_uid)
);
create index if not exists idx_oei_op     on operator_external_identities(operator_id);
create index if not exists idx_oei_realm  on operator_external_identities(realm_id);
create index if not exists idx_oei_email  on operator_external_identities(email_hash) where email_hash is not null;

alter table operator_external_identities enable row level security;
drop policy if exists "oei_self_readable" on operator_external_identities;
create policy "oei_self_readable" on operator_external_identities for select
  using (operator_id = current_operator_id() or true);  -- public for now; can tighten later

-- ---------- canonical register/mirror function ----------
-- Called from /api/federation/operators POST. Idempotent.
-- Strategy:
--   1. If (realm_id, external_uid) already linked → return existing operator_id.
--   2. If email_hash matches an existing operator → link them (same person, new realm).
--   3. If callsign exists already → link to that operator (assume same person).
--   4. Otherwise → mint a new mirrored operator_profile (user_id=null).
create or replace function nros_register_realm_operator(
  p_realm_id      uuid,
  p_external_uid  text,
  p_callsign      text,
  p_email_hash    text default null,
  p_display_name  text default null,
  p_metadata      jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
as $func$
declare
  v_op_id uuid;
begin
  if p_realm_id is null or p_external_uid is null or coalesce(p_callsign, '') = '' then
    raise exception 'nros_register_realm_operator: realm_id + external_uid + callsign required';
  end if;

  -- 1) Already linked?
  select operator_id into v_op_id
    from operator_external_identities
   where realm_id = p_realm_id and external_uid = p_external_uid
   limit 1;
  if v_op_id is not null then
    return v_op_id;
  end if;

  -- 2) Match by email_hash (same person already in another realm)
  if p_email_hash is not null then
    select id into v_op_id from operator_profiles where email_hash = p_email_hash limit 1;
  end if;

  -- 3) Match by callsign (case-insensitive via citext)
  if v_op_id is null then
    select id into v_op_id from operator_profiles where callsign = p_callsign limit 1;
  end if;

  -- 4) Create new mirrored operator
  if v_op_id is null then
    insert into operator_profiles (callsign, source_realm_id, email_hash, display_name, xp)
    values (p_callsign, p_realm_id, p_email_hash, p_display_name, 0)
    returning id into v_op_id;
  else
    -- Backfill email_hash + display_name if missing
    update operator_profiles set
      email_hash = coalesce(email_hash, p_email_hash),
      display_name = coalesce(display_name, p_display_name)
    where id = v_op_id;
  end if;

  -- Link this realm's external id
  insert into operator_external_identities (operator_id, realm_id, external_uid, email_hash, display_name, metadata)
  values (v_op_id, p_realm_id, p_external_uid, p_email_hash, p_display_name, coalesce(p_metadata, '{}'::jsonb))
  on conflict (realm_id, external_uid) do nothing;

  -- Ensure operator_realms membership row exists
  insert into operator_realms (operator_id, realm_id, joined_at)
  values (v_op_id, p_realm_id, now())
  on conflict (operator_id, realm_id) do nothing;

  return v_op_id;
end
$func$;

notify pgrst, 'reload schema';
