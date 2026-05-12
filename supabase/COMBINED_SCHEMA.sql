-- =====================================================================
-- NROS combined schema migrations — paste this entire file into the
-- Supabase SQL editor and click Run.
-- 
-- Sources (concatenated in order):
--   supabase/migrations/0001_kernel_init.sql
--   supabase/migrations/0002_federation.sql
--   supabase/migrations/0003_ai_provider_cloudflare.sql
-- =====================================================================

-- ===== supabase/migrations/0001_kernel_init.sql =====
-- =====================================================================
--  NROS KERNEL V1 — schema bootstrap
--  Run via:  supabase db push   (or paste into Supabase SQL editor)
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------- ENUMS ----------
do $$ begin
  create type rank_tier as enum ('INITIATE','OPERATOR','VANGUARD','ARCHITECT','WARDEN','SOVEREIGN');
exception when duplicate_object then null; end $$;

do $$ begin create type mission_status      as enum ('DRAFT','ACTIVE','ARCHIVED'); exception when duplicate_object then null; end $$;
do $$ begin create type mission_difficulty  as enum ('T1','T2','T3','T4','T5');     exception when duplicate_object then null; end $$;
do $$ begin create type mission_progress_state as enum ('ACCEPTED','IN_PROGRESS','COMPLETED','FAILED'); exception when duplicate_object then null; end $$;
do $$ begin create type xp_source           as enum ('MISSION','WORKFLOW','ACHIEVEMENT','SYSTEM'); exception when duplicate_object then null; end $$;
do $$ begin create type squad_role          as enum ('FOUNDER','OFFICER','MEMBER'); exception when duplicate_object then null; end $$;
do $$ begin create type workflow_status     as enum ('DRAFT','ACTIVE','ARCHIVED','COMPLETED'); exception when duplicate_object then null; end $$;
do $$ begin create type workflow_step_type  as enum ('PHASE','TASK','AUTOMATION','DECISION'); exception when duplicate_object then null; end $$;
do $$ begin create type workflow_step_status as enum ('PENDING','IN_PROGRESS','COMPLETED','BLOCKED'); exception when duplicate_object then null; end $$;
do $$ begin create type ai_provider         as enum ('anthropic','openai'); exception when duplicate_object then null; end $$;
do $$ begin create type ai_surface          as enum ('GENUBRA','OBLISK','MISSION_GEN','AD_HOC'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_kind   as enum ('MISSION','RANK','SQUAD','WORKFLOW','SYSTEM'); exception when duplicate_object then null; end $$;

-- ---------- RANKS ----------
create table if not exists ranks (
  id           uuid primary key default gen_random_uuid(),
  tier         rank_tier not null unique,
  name         text not null,
  min_xp       integer not null,
  badge_color  text not null default '#7c5cff',
  order_index  integer not null
);

-- ---------- OPERATOR PROFILES ----------
create table if not exists operator_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  callsign     citext not null unique,
  bio          text,
  avatar_url   text,
  rank_id      uuid references ranks(id),
  xp           integer not null default 0,
  squad_id     uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_op_profiles_xp on operator_profiles(xp desc);

-- ---------- MISSIONS ----------
create table if not exists missions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  brief        text not null,
  status       mission_status not null default 'ACTIVE',
  difficulty   mission_difficulty not null default 'T1',
  xp_reward    integer not null default 100,
  tags         text[] not null default '{}',
  created_by   uuid references operator_profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_missions_status on missions(status);

-- ---------- MISSION PROGRESS ----------
create table if not exists mission_progress (
  id            uuid primary key default gen_random_uuid(),
  mission_id    uuid not null references missions(id) on delete cascade,
  operator_id   uuid not null references operator_profiles(id) on delete cascade,
  state         mission_progress_state not null default 'ACCEPTED',
  progress_pct  integer not null default 0 check (progress_pct between 0 and 100),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (mission_id, operator_id)
);
create index if not exists idx_mp_operator on mission_progress(operator_id);

-- ---------- XP LOGS ----------
create table if not exists xp_logs (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references operator_profiles(id) on delete cascade,
  delta         integer not null,
  reason        text not null,
  source_type   xp_source not null,
  source_id     uuid,
  created_at    timestamptz not null default now()
);
create index if not exists idx_xp_logs_operator on xp_logs(operator_id, created_at desc);

-- ---------- SQUADS ----------
create table if not exists squads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tag          citext not null unique,
  motto        text,
  banner_url   text,
  founder_id   uuid not null references operator_profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists squad_members (
  squad_id     uuid not null references squads(id) on delete cascade,
  operator_id  uuid not null references operator_profiles(id) on delete cascade,
  role         squad_role not null default 'MEMBER',
  joined_at    timestamptz not null default now(),
  primary key (squad_id, operator_id)
);

alter table operator_profiles
  add constraint operator_profiles_squad_fk
  foreign key (squad_id) references squads(id) on delete set null
  not valid;

-- ---------- ACHIEVEMENTS ----------
create table if not exists achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text not null,
  icon        text not null default 'shield',
  xp_bonus    integer not null default 0
);

create table if not exists operator_achievements (
  operator_id    uuid not null references operator_profiles(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  awarded_at     timestamptz not null default now(),
  primary key (operator_id, achievement_id)
);

-- ---------- WORKFLOWS (OBLISK) ----------
create table if not exists workflows (
  id                 uuid primary key default gen_random_uuid(),
  operator_id        uuid not null references operator_profiles(id) on delete cascade,
  title              text not null,
  objective          text not null,
  status             workflow_status not null default 'DRAFT',
  ai_summary         text,
  monetization_notes text,
  recommended_stack  text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_workflows_operator on workflows(operator_id);

create table if not exists workflow_steps (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references workflows(id) on delete cascade,
  parent_id       uuid references workflow_steps(id) on delete cascade,
  type            workflow_step_type not null,
  title           text not null,
  detail          text,
  status          workflow_step_status not null default 'PENDING',
  order_index     integer not null default 0,
  estimated_hours numeric(6,2)
);
create index if not exists idx_steps_workflow on workflow_steps(workflow_id, order_index);

-- ---------- AI REQUESTS ----------
create table if not exists ai_requests (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid references operator_profiles(id) on delete set null,
  surface         ai_surface not null,
  provider        ai_provider not null,
  model           text not null,
  input_tokens    integer,
  output_tokens   integer,
  prompt_excerpt  text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_ai_requests_op on ai_requests(operator_id, created_at desc);

-- ---------- NOTIFICATIONS ----------
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid not null references operator_profiles(id) on delete cascade,
  kind         notification_kind not null,
  title        text not null,
  body         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_op on notifications(operator_id, created_at desc);

-- ---------- LEADERBOARD VIEW ----------
create or replace view leaderboard_global as
select
  op.id           as operator_id,
  op.callsign,
  op.xp,
  r.name          as rank_name,
  r.order_index   as rank_index
from operator_profiles op
left join ranks r on r.id = op.rank_id
order by op.xp desc;

-- =====================================================================
--  ROW-LEVEL SECURITY
-- =====================================================================
alter table operator_profiles      enable row level security;
alter table missions               enable row level security;
alter table mission_progress       enable row level security;
alter table xp_logs                enable row level security;
alter table squads                 enable row level security;
alter table squad_members          enable row level security;
alter table achievements           enable row level security;
alter table operator_achievements  enable row level security;
alter table workflows              enable row level security;
alter table workflow_steps         enable row level security;
alter table ai_requests            enable row level security;
alter table notifications          enable row level security;
alter table ranks                  enable row level security;

-- helper: current operator id
create or replace function current_operator_id() returns uuid
language sql stable as $$
  select id from operator_profiles where user_id = auth.uid()
$$;

-- read-mostly tables visible to authenticated users
create policy "ranks_readable"        on ranks        for select using (true);
create policy "achievements_readable" on achievements for select using (true);
create policy "missions_readable"     on missions     for select using (status = 'ACTIVE' or auth.role() = 'service_role');
create policy "leaderboard_readable"  on operator_profiles for select using (true);

-- operator-owned writes
create policy "operator_self_update"  on operator_profiles for update using (user_id = auth.uid());
create policy "operator_self_insert"  on operator_profiles for insert with check (user_id = auth.uid());

create policy "mp_self_rw"            on mission_progress  for all
  using (operator_id = current_operator_id())
  with check (operator_id = current_operator_id());

create policy "xp_self_read"          on xp_logs           for select using (operator_id = current_operator_id());

create policy "squads_readable"       on squads            for select using (true);
create policy "squads_founder_write"  on squads            for update using (founder_id = current_operator_id());
create policy "squads_create"         on squads            for insert with check (founder_id = current_operator_id());

create policy "sm_readable"           on squad_members     for select using (true);
create policy "sm_self_join"          on squad_members     for insert with check (operator_id = current_operator_id());
create policy "sm_self_leave"         on squad_members     for delete using (operator_id = current_operator_id());

create policy "wf_self_rw"            on workflows         for all
  using (operator_id = current_operator_id())
  with check (operator_id = current_operator_id());

create policy "ws_self_rw"            on workflow_steps    for all
  using (exists (select 1 from workflows w where w.id = workflow_id and w.operator_id = current_operator_id()))
  with check (exists (select 1 from workflows w where w.id = workflow_id and w.operator_id = current_operator_id()));

create policy "ai_self_read"          on ai_requests       for select using (operator_id = current_operator_id());

create policy "notif_self_rw"         on notifications     for all
  using (operator_id = current_operator_id())
  with check (operator_id = current_operator_id());

create policy "oa_self_read"          on operator_achievements for select using (operator_id = current_operator_id());

-- =====================================================================
--  SEED DATA — ranks + starter missions + achievements
-- =====================================================================
insert into ranks (tier, name, min_xp, badge_color, order_index) values
  ('INITIATE',  'Initiate',   0,      '#64748b', 1),
  ('OPERATOR',  'Operator',   500,    '#22d3ee', 2),
  ('VANGUARD',  'Vanguard',   2500,   '#7c5cff', 3),
  ('ARCHITECT', 'Architect',  10000,  '#facc15', 4),
  ('WARDEN',    'Warden',     30000,  '#f97316', 5),
  ('SOVEREIGN', 'Sovereign',  100000, '#ef4444', 6)
on conflict (tier) do nothing;

insert into missions (title, brief, difficulty, xp_reward, tags) values
  ('First Signal',           'Create your operator identity and complete onboarding.', 'T1', 250, '{onboarding}'),
  ('Forge a Workflow',       'Use the OBLISK engine to decompose your first objective into steps.', 'T1', 300, '{oblisk,workflow}'),
  ('Consult GENUBRA',        'Open the GENUBRA panel and request a strategic recommendation.', 'T1', 200, '{genubra,ai}'),
  ('Recruit a Squad',        'Found a squad or join an existing one.', 'T2', 500, '{squad,social}'),
  ('Climb the Board',        'Reach top 100 on the global leaderboard.', 'T3', 1500, '{leaderboard}'),
  ('Architect''s Path',      'Reach the Architect rank.', 'T4', 5000, '{rank,progression}')
on conflict do nothing;

insert into achievements (code, name, description, icon, xp_bonus) values
  ('FIRST_LIGHT',     'First Light',     'Activated your operator identity.', 'sparkles', 50),
  ('FIRST_WORKFLOW',  'Schema Forged',   'Generated your first OBLISK workflow.', 'workflow', 100),
  ('FIRST_GENUBRA',   'Whispered Back',  'Engaged GENUBRA for strategy.', 'brain', 75),
  ('SQUAD_FOUNDER',   'Banner Raised',   'Founded a squad.', 'flag', 250),
  ('TOP_100',         'Marked',          'Entered the top 100 leaderboard.', 'trophy', 500)
on conflict (code) do nothing;

-- ===== supabase/migrations/0002_federation.sql =====
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

-- ===== supabase/migrations/0003_ai_provider_cloudflare.sql =====
-- =====================================================================
--  V3 — extend ai_provider enum to include Cloudflare Workers AI
--  Used as the default free-tier provider during development/testing.
-- =====================================================================
do $$ begin
  alter type ai_provider add value if not exists 'cloudflare';
exception when duplicate_object then null; end $$;

