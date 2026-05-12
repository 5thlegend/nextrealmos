-- =====================================================================
--  V3.1 — Governance enforcement via RLS
--  Elite leaders gain write access to their realm's mutable resources
--  (missions, agents, money_factory_entries). Realm owners always have
--  full access; OVERSEER (federation-wide) leaders can govern any realm.
-- =====================================================================

-- ---------- Helper: current operator's elite-leader scope ----------
create or replace function current_op_governs_realm(target_realm_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from elite_leaders
    where operator_id = current_operator_id()
      and (realm_id = target_realm_id or realm_id is null)   -- realm-scoped OR federation-wide
  )
  or exists (
    select 1 from realms
    where id = target_realm_id and owner_operator_id = current_operator_id()
  );
$$;

create or replace function current_op_is_overseer()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from elite_leaders
    where operator_id = current_operator_id() and realm_id is null and role = 'OVERSEER'
  );
$$;

-- ---------- Missions: elite leaders can publish + manage realm missions ----------
-- Existing policy: read if status=ACTIVE
-- New: governing operator can insert/update/delete their realm's missions.
do $$ begin
  drop policy if exists "missions_governance" on missions;
exception when undefined_object then null; end $$;

create policy "missions_governance"
  on missions
  for all
  using (realm_id is null or current_op_governs_realm(realm_id))
  with check (realm_id is null or current_op_governs_realm(realm_id));

-- ---------- Agents: elite leaders can manage realm agents ----------
-- Replace the owner-only policy with one that respects elite governance.
do $$ begin
  drop policy if exists "agents_realm_owner_rw" on agents;
exception when undefined_object then null; end $$;

create policy "agents_governance"
  on agents
  for all
  using (realm_id is null or current_op_governs_realm(realm_id))
  with check (realm_id is null or current_op_governs_realm(realm_id));

-- ---------- Money factory: elite leaders can manage entries ----------
do $$ begin
  drop policy if exists "mfe_owner_rw" on money_factory_entries;
exception when undefined_object then null; end $$;

create policy "mfe_governance"
  on money_factory_entries
  for all
  using (current_op_governs_realm(realm_id))
  with check (current_op_governs_realm(realm_id));

-- ---------- Elite leader appointment governance ----------
-- Realm owners + federation overseers can appoint/revoke leaders for their realm.
-- Operators can always remove themselves from a leadership role (resign).
do $$ begin
  drop policy if exists "elite_self_resign" on elite_leaders;
exception when undefined_object then null; end $$;

create policy "elite_self_resign" on elite_leaders for delete
  using (operator_id = current_operator_id());

create policy "elite_owner_appoint" on elite_leaders for insert
  with check (
    realm_id is null
      and current_op_is_overseer()                           -- only overseers create overseers
    or
    realm_id in (select id from realms where owner_operator_id = current_operator_id())  -- realm owner appoints
    or
    current_op_is_overseer()                                  -- overseers can appoint anyone
  );

create policy "elite_owner_revoke" on elite_leaders for delete
  using (
    operator_id = current_operator_id()                      -- self-resign (already covered, here for redundancy)
    or realm_id in (select id from realms where owner_operator_id = current_operator_id())
    or current_op_is_overseer()
  );

-- ---------- Realm vault state: only owners + overseers can vault/unvault ----------
do $$ begin
  drop policy if exists "realms_owner_update" on realms;
exception when undefined_object then null; end $$;

create policy "realms_governance_update" on realms for update
  using (owner_operator_id = current_operator_id() or current_op_is_overseer());

-- ---------- Notes ----------
-- Service-role bypasses RLS entirely (used by NROS internals + federation API
-- routes that already authenticate via realm bearer tokens). This RLS layer
-- enforces governance for direct supabase calls from authenticated browsers.
