-- =====================================================================
--  NROS KERNEL V2 — federation pivot
--  Adds realm registry, federated identity graph, transmissions feed,
--  realm-scoped XP/AI/notifications, and per-realm API keys.
-- =====================================================================

-- ---------- ENUMS ----------
do $$ begin
  create type realm_status as enum ('PENDING','ACTIVE','SUSPENDED','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type api_key_scope as enum ('READ','WRITE','ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transmission_kind as enum (
    'OPERATOR_JOINED',
    'XP_AWARDED',
    'RANK_CHANGED',
    'ACHIEVEMENT_UNLOCKED',
    'MISSION_COMPLETED',
    'WORKFLOW_FORGED',
    'REALM_REGISTERED',
    'SYSTEM',
    'CUSTOM'
  );
exception when duplicate_object then null; end $$;

-- ---------- REALMS ----------
create table if not exists realms (
  id                 uuid primary key default gen_random_uuid(),
  slug               citext not null unique,
  name               text not null,
  description        text,
  base_url           text,
  icon_url           text,
  status             realm_status not null default 'PENDING',
  owner_operator_id  uuid not null references operator_profiles(id) on delete restrict,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  approved_at        timestamptz,
  archived_at        timestamptz
);
create index if not exists idx_realms_status on realms(status);
create index if not exists idx_realms_owner on realms(owner_operator_id);

-- ---------- REALM API KEYS ----------
-- key_hash is sha256(full_key); we store only the hash + a short prefix
-- for human identification. The full key is shown ONCE at creation time.
create table if not exists realm_api_keys (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references realms(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null unique,
  scope        api_key_scope not null default 'WRITE',
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_realm_keys_realm on realm_api_keys(realm_id);
create index if not exists idx_realm_keys_active on realm_api_keys(realm_id) where revoked_at is null;

-- ---------- OPERATOR <-> REALM GRAPH ----------
create table if not exists operator_realms (
  operator_id     uuid not null references operator_profiles(id) on delete cascade,
  realm_id        uuid not null references realms(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  realm_xp        integer not null default 0,
  realm_metadata  jsonb not null default '{}'::jsonb,
  last_active_at  timestamptz,
  primary key (operator_id, realm_id)
);
create index if not exists idx_op_realms_realm on operator_realms(realm_id);
create index if not exists idx_op_realms_op    on operator_realms(operator_id);

-- ---------- TRANSMISSIONS (federated event feed) ----------
create table if not exists transmissions (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references realms(id) on delete cascade,
  operator_id  uuid references operator_profiles(id) on delete set null,
  kind         transmission_kind not null,
  title        text not null,
  body         text,
  metadata     jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists idx_tx_feed   on transmissions (created_at desc);
create index if not exists idx_tx_realm  on transmissions (realm_id, created_at desc);
create index if not exists idx_tx_op     on transmissions (operator_id, created_at desc);
create index if not exists idx_tx_kind   on transmissions (kind, created_at desc);

-- ---------- REALM-SCOPING ON EXISTING TABLES ----------
alter table xp_logs       add column if not exists realm_id uuid references realms(id);
alter table ai_requests   add column if not exists realm_id uuid references realms(id);
alter table notifications add column if not exists realm_id uuid references realms(id);
alter table missions      add column if not exists realm_id uuid references realms(id);
alter table workflows     add column if not exists realm_id uuid references realms(id);

create index if not exists idx_xp_logs_realm   on xp_logs(realm_id) where realm_id is not null;
create index if not exists idx_missions_realm  on missions(realm_id) where realm_id is not null;
create index if not exists idx_workflows_realm on workflows(realm_id) where realm_id is not null;

-- ---------- AGGREGATE VIEWS ----------
create or replace view realm_activity as
select
  r.id            as realm_id,
  r.slug,
  r.name,
  r.status,
  count(distinct orm.operator_id)  as operator_count,
  count(distinct tx.id)            as transmission_count,
  max(tx.created_at)               as last_transmission_at
from realms r
left join operator_realms orm on orm.realm_id = r.id
left join transmissions    tx on tx.realm_id  = r.id
group by r.id, r.slug, r.name, r.status;

create or replace view operator_realm_summary as
select
  op.id            as operator_id,
  op.callsign,
  op.xp            as universal_xp,
  count(distinct orm.realm_id) as realm_count,
  array_agg(distinct r.slug order by r.slug) filter (where r.slug is not null) as realm_slugs
from operator_profiles op
left join operator_realms orm on orm.operator_id = op.id
left join realms r            on r.id = orm.realm_id
group by op.id, op.callsign, op.xp;

-- =====================================================================
--  ROW-LEVEL SECURITY
-- =====================================================================
alter table realms          enable row level security;
alter table realm_api_keys  enable row level security;
alter table operator_realms enable row level security;
alter table transmissions   enable row level security;

-- Realms — public read of ACTIVE; owners see their PENDING/SUSPENDED too
create policy "realms_active_readable" on realms for select
  using (status = 'ACTIVE' or owner_operator_id = current_operator_id());

create policy "realms_owner_create" on realms for insert
  with check (owner_operator_id = current_operator_id());

create policy "realms_owner_update" on realms for update
  using (owner_operator_id = current_operator_id());

-- API keys — owner-only; full key never exposed
create policy "keys_owner_read" on realm_api_keys for select
  using (realm_id in (select id from realms where owner_operator_id = current_operator_id()));

create policy "keys_owner_revoke" on realm_api_keys for update
  using (realm_id in (select id from realms where owner_operator_id = current_operator_id()));

-- Operator-realm graph — operator-self
create policy "op_realms_self_read"   on operator_realms for select using (operator_id = current_operator_id());
create policy "op_realms_self_join"   on operator_realms for insert with check (operator_id = current_operator_id());
create policy "op_realms_self_leave"  on operator_realms for delete using (operator_id = current_operator_id());

-- Transmissions — public read, writes only via service role (federation API)
create policy "tx_public_read" on transmissions for select using (true);

-- =====================================================================
--  SEED DATA — the founding "core" realm
-- =====================================================================
-- The original V1 missions/achievements live under a virtual "NROS Core" realm.
-- Subsequent realms register dynamically.
do $$
declare
  core_owner uuid;
  core_realm uuid;
begin
  select id into core_owner from operator_profiles order by created_at asc limit 1;
  if core_owner is null then
    return;  -- no operators yet; the first signup becomes implicit core owner via app logic
  end if;

  insert into realms (slug, name, description, status, owner_operator_id, approved_at)
  values ('nros-core', 'NROS Core', 'The founding realm. Onboarding, mission system reference, federation primitives.', 'ACTIVE', core_owner, now())
  on conflict (slug) do nothing
  returning id into core_realm;

  if core_realm is not null then
    update missions set realm_id = core_realm where realm_id is null;
  end if;
end $$;
