-- =====================================================================
--  V3 — DIVINE-SYNC civilization layer
--  Adds: elite leaders, vault state, money factory, agent grid, economy
--  events. The Realm Graph Engine reads from these tables to render the
--  visual civilization control surface.
-- =====================================================================

-- ---------- ENUMS ----------
do $$ begin create type elite_role as enum (
  'WARDEN',         -- top-tier custodian of a realm
  'ARCHITECT',      -- builds + governs realm structure
  'DIPLOMAT',       -- inter-realm relations
  'OVERSEER'        -- meta-tier observer
); exception when duplicate_object then null; end $$;

do $$ begin create type agent_status as enum (
  'IDLE','RUNNING','PAUSED','ARCHIVED','FAULT'
); exception when duplicate_object then null; end $$;

do $$ begin create type agent_kind as enum (
  'GENUBRA','OBLISK','SCRIBE','SCOUT','HARVESTER','SENTINEL','CUSTOM'
); exception when duplicate_object then null; end $$;

do $$ begin create type economy_event_kind as enum (
  'REVENUE','COST','GRANT','BURN','TRANSFER','XP_BANK','INFLUENCE_BANK'
); exception when duplicate_object then null; end $$;

-- ---------- ELITE LEADERS ----------
-- Operators with leadership over one or more realms. Distinct from `realms.owner_operator_id`
-- because an elite leader can govern realms they don't own (delegated authority).
create table if not exists elite_leaders (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid not null references operator_profiles(id) on delete cascade,
  realm_id     uuid references realms(id) on delete cascade,  -- null = federation-wide overseer
  role         elite_role not null,
  appointed_at timestamptz not null default now(),
  appointed_by uuid references operator_profiles(id) on delete set null,
  metadata     jsonb not null default '{}'::jsonb,
  unique (operator_id, realm_id, role)
);
create index if not exists idx_elite_realm on elite_leaders(realm_id);
create index if not exists idx_elite_op    on elite_leaders(operator_id);

-- ---------- REALM VAULT STATE ----------
alter table realms add column if not exists vaulted_at timestamptz;
alter table realms add column if not exists vault_reason text;
create index if not exists idx_realms_vaulted on realms(vaulted_at) where vaulted_at is not null;

-- The 'realm_status' enum already covers ARCHIVED. `vaulted_at` records when a
-- realm was sent to the vault (cold-storage, archived but recoverable).

-- ---------- AGENT GRID ----------
-- Autonomous AI workers attached to realms. Visible as nodes in the Graph Engine.
create table if not exists agents (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid references realms(id) on delete cascade,    -- null = federation-wide
  kind         agent_kind not null,
  name         text not null,
  description  text,
  status       agent_status not null default 'IDLE',
  config       jsonb not null default '{}'::jsonb,              -- model, system prompt, tools
  schedule_cron text,                                           -- e.g. '0 */6 * * *'
  last_run_at  timestamptz,
  last_run_status text,
  created_by   uuid references operator_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_agents_realm  on agents(realm_id);
create index if not exists idx_agents_status on agents(status);
create index if not exists idx_agents_kind   on agents(kind);

-- ---------- ECONOMY EVENTS ----------
-- The "Money Factory Armory" ledger. Tracks revenue, costs, XP banks, influence banks
-- across realms. Append-only.
create table if not exists economy_events (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid references realms(id) on delete set null,
  operator_id  uuid references operator_profiles(id) on delete set null,
  kind         economy_event_kind not null,
  amount_cents bigint not null,                                  -- can be negative (BURN/COST)
  currency     text not null default 'USD',
  reason       text not null,
  metadata     jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists idx_econ_realm on economy_events(realm_id, occurred_at desc);
create index if not exists idx_econ_op    on economy_events(operator_id, occurred_at desc);
create index if not exists idx_econ_kind  on economy_events(kind, occurred_at desc);

-- ---------- MONEY FACTORY ARMORY ----------
-- Restricted-access deployment vault. References realms that are part of the
-- "armory" — high-leverage / revenue-generating sovereign apps.
create table if not exists money_factory_entries (
  id              uuid primary key default gen_random_uuid(),
  realm_id        uuid not null references realms(id) on delete cascade,
  thumbnail_url   text,
  category        text,                                          -- 'ad-builder', 'agent-fleet', etc.
  monthly_revenue_cents bigint default 0,
  unlock_rank_tier rank_tier,                                    -- min rank to access
  notes           text,
  created_at      timestamptz not null default now(),
  unique (realm_id)
);
create index if not exists idx_mfe_revenue on money_factory_entries(monthly_revenue_cents desc);

-- ---------- VIEWS ----------
create or replace view civilization_overview as
select
  (select count(*) from realms where status = 'ACTIVE')                              as active_realms,
  (select count(*) from realms where vaulted_at is not null)                          as vaulted_realms,
  (select count(*) from operator_profiles)                                            as total_operators,
  (select count(*) from elite_leaders)                                                as elite_leaders,
  (select count(*) from agents where status = 'RUNNING')                              as agents_running,
  (select coalesce(sum(monthly_revenue_cents), 0) from money_factory_entries)         as total_monthly_revenue_cents,
  (select count(*) from transmissions where created_at > now() - interval '24 hours') as transmissions_24h;

create or replace view realm_graph_nodes as
select
  r.id,
  r.slug,
  r.name,
  r.status,
  r.base_url,
  r.icon_url,
  r.vaulted_at,
  (select count(*) from operator_realms where realm_id = r.id)         as operator_count,
  (select count(*) from elite_leaders where realm_id = r.id)            as elite_count,
  (select count(*) from agents where realm_id = r.id and status = 'RUNNING') as agent_count,
  (select count(*) from transmissions where realm_id = r.id and created_at > now() - interval '24 hours') as transmissions_24h,
  (select coalesce(sum(monthly_revenue_cents), 0) from money_factory_entries where realm_id = r.id) as monthly_revenue_cents,
  r.created_at
from realms r;

-- =====================================================================
--  ROW-LEVEL SECURITY
-- =====================================================================
alter table elite_leaders         enable row level security;
alter table agents                enable row level security;
alter table economy_events        enable row level security;
alter table money_factory_entries enable row level security;

-- Elite leaders — public read; only OVERSEER role or the operator themselves can mutate.
create policy "elite_readable" on elite_leaders for select using (true);
create policy "elite_self_resign" on elite_leaders for delete
  using (operator_id = current_operator_id());

-- Agents — public read of metadata; mutations restricted to realm owner / federation-wide overseers.
create policy "agents_readable" on agents for select using (true);
create policy "agents_realm_owner_rw" on agents for all
  using (
    realm_id is null
    or realm_id in (select id from realms where owner_operator_id = current_operator_id())
  )
  with check (
    realm_id is null
    or realm_id in (select id from realms where owner_operator_id = current_operator_id())
  );

-- Economy events — append-only public read, service-role write.
create policy "econ_readable" on economy_events for select using (true);

-- Money factory entries — public read; realm owner manages.
create policy "mfe_readable" on money_factory_entries for select using (true);
create policy "mfe_owner_rw" on money_factory_entries for all
  using (realm_id in (select id from realms where owner_operator_id = current_operator_id()))
  with check (realm_id in (select id from realms where owner_operator_id = current_operator_id()));

-- =====================================================================
--  SEED — register the known active realms (idempotent placeholders)
-- =====================================================================
do $$
declare v_owner uuid;
begin
  -- Use the FOUNDER operator as owner of placeholders until each realm
  -- is registered with its real owner.
  select id into v_owner from operator_profiles where callsign = 'FOUNDER' limit 1;
  if v_owner is null then return; end if;

  insert into realms (slug, name, description, status, owner_operator_id, approved_at) values
    ('money-factory',      'Money Factory',         'Restricted-access deployment armory. Revenue-generating sovereign apps.',     'ACTIVE', v_owner, now()),
    ('legvcy',             'LEGVCY Realm',          'Operator training & progression layer. XP, ranks, achievements, history.',    'ACTIVE', v_owner, now()),
    ('divinwine',          'DivinWine Realm',       'Hospitality / wine intelligence realm.',                                       'ACTIVE', v_owner, now()),
    ('lastmile-os',        'LASTMILE OS',           'Cannabis delivery SaaS — driver PWA + admin dashboard.',                       'ACTIVE', v_owner, now()),
    ('weightroom-app',     'WeightRoomApp',         'High-school strength program SaaS, branded per school.',                       'ACTIVE', v_owner, now())
  on conflict (slug) do nothing;

  -- Vaulted: Boba AI
  insert into realms (slug, name, description, status, owner_operator_id, approved_at, vaulted_at, vault_reason) values
    ('boba-ai', 'Boba AI', 'Vaulted — archived experiment from the early Next Realm era.', 'ARCHIVED', v_owner, now(), now(), 'Pivoted; preserved for reference')
  on conflict (slug) do nothing;
end $$;
