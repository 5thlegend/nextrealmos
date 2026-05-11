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
