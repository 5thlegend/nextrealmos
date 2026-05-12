-- =====================================================================
--  V3.1 — DIVINE-SYNC civilization event taxonomy + canonical realms
--  Adds:
--   • event_name on transmissions for dotted-namespace civilization events
--   • guild system (operator collectives larger than squads)
--   • influence tracking columns on operator_profiles
--   • ARCSEED + OverNight_Money_Apps as canonical realms
-- =====================================================================

-- ---------- STRUCTURED EVENT NAMING ----------
-- Civilization events use dotted namespaces so realms can emit anything:
--   deployment.launch · operator.ascension · realm.attach · guild.create ·
--   mission.complete · influence.growth · economy.transaction · agent.deploy
-- The existing transmission_kind enum stays as a coarse bucket for filtering.
alter table transmissions add column if not exists event_name text;
create index if not exists idx_tx_event_name on transmissions (event_name) where event_name is not null;

-- Extend transmission_kind for new civilization event categories
do $$ begin alter type transmission_kind add value if not exists 'GUILD_FORMED';     exception when duplicate_object then null; end $$;
do $$ begin alter type transmission_kind add value if not exists 'INFLUENCE_GROWTH'; exception when duplicate_object then null; end $$;
do $$ begin alter type transmission_kind add value if not exists 'ECONOMY_TX';       exception when duplicate_object then null; end $$;
do $$ begin alter type transmission_kind add value if not exists 'AGENT_DEPLOYED';   exception when duplicate_object then null; end $$;
do $$ begin alter type transmission_kind add value if not exists 'REALM_VAULTED';    exception when duplicate_object then null; end $$;

-- ---------- GUILDS ----------
-- Larger than squads (which are realm-internal small teams). Guilds are
-- federation-wide collectives that span realms, with formal hierarchies.
do $$ begin create type guild_role as enum ('FOUNDER','SOVEREIGN','OFFICER','MEMBER'); exception when duplicate_object then null; end $$;
do $$ begin create type guild_status as enum ('FORMING','ACTIVE','DISSOLVED'); exception when duplicate_object then null; end $$;

create table if not exists guilds (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  motto         text,
  banner_url    text,
  status        guild_status not null default 'ACTIVE',
  founder_id    uuid not null references operator_profiles(id) on delete restrict,
  home_realm_id uuid references realms(id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_guilds_status on guilds(status);

create table if not exists guild_members (
  guild_id    uuid not null references guilds(id) on delete cascade,
  operator_id uuid not null references operator_profiles(id) on delete cascade,
  role        guild_role not null default 'MEMBER',
  joined_at   timestamptz not null default now(),
  primary key (guild_id, operator_id)
);
create index if not exists idx_guild_members_op on guild_members(operator_id);

-- ---------- INFLUENCE TRACKING ----------
-- Per-operator influence score (separate from XP). Influence reflects social
-- weight + reach across the federation. Recomputed by background jobs.
alter table operator_profiles add column if not exists influence_score integer not null default 0;
alter table operator_profiles add column if not exists followers_count integer not null default 0;
alter table operator_profiles add column if not exists last_seen_at timestamptz;
create index if not exists idx_op_influence on operator_profiles(influence_score desc);

-- ---------- CANONICAL REALMS — V3 active set ----------
-- Per DIVINE-SYNC v2:
--   NextRealmOperators  · NROS · OverNight_Money_Apps · ARCSEED ·
--   LEGVCY · DivinWine  · LASTMILE OS · WeightRoomApp
-- Plus vaulted: Boba AI
do $$
declare v_owner uuid;
begin
  select id into v_owner from operator_profiles where callsign = 'FOUNDER' limit 1;
  if v_owner is null then return; end if;

  insert into realms (slug, name, description, status, owner_operator_id, approved_at) values
    ('overnight-money-apps', 'OverNight Money Apps',
     'Rapid-ship micro-SaaS factory. Each app shipped as NR-[name] under nr-[name].pages.dev. Shared core lib + NRO export adapter.',
     'ACTIVE', v_owner, now()),
    ('arcseed', 'ARCSEED',
     'Worldcraft + simulation division. Games, immersive worlds, simulations, future VR Nexus integration.',
     'ACTIVE', v_owner, now())
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    status = 'ACTIVE';
end $$;

-- ---------- CIVILIZATION EVENT VOCABULARY (reference table) ----------
-- Documents the canonical event_name vocabulary realms emit. Acts as a
-- self-describing API contract. Realms may emit unknown event_names but
-- registered ones get richer rendering in the UI.
create table if not exists civilization_event_types (
  event_name   text primary key,
  kind         transmission_kind not null,
  description  text not null,
  emoji        text,
  rendering_template text,
  created_at   timestamptz not null default now()
);

-- Note: seeded with existing enum values only. New enum values (GUILD_FORMED,
-- INFLUENCE_GROWTH, ECONOMY_TX, AGENT_DEPLOYED, REALM_VAULTED) become usable
-- in subsequent migrations via UPDATE statements once the enum commit lands.
insert into civilization_event_types (event_name, kind, description, emoji) values
  ('deployment.iteration',  'CUSTOM',              'Operator made an iteration in a realm',           '⚙'),
  ('deployment.ship',       'CUSTOM',              'Operator shipped a feature in a realm',           '🚀'),
  ('deployment.milestone',  'MISSION_COMPLETED',   'Operator hit a milestone in a realm',             '🎯'),
  ('deployment.launch',     'WORKFLOW_FORGED',     'Operator launched something in a realm',          '🌠'),
  ('operator.ascension',    'RANK_CHANGED',        'Operator ascended to a higher rank',              '↗'),
  ('operator.activation',   'OPERATOR_JOINED',     'New operator activated identity in NROS',         '✦'),
  ('realm.attach',          'REALM_REGISTERED',    'New realm attached to the federation',            '◈'),
  ('realm.vault',           'SYSTEM',              'Realm sent to vault (archived but preserved)',    '🗝'),
  ('guild.create',          'CUSTOM',              'New guild formed across the federation',          '◇'),
  ('guild.merge',           'CUSTOM',              'Two guilds merged',                                '⬡'),
  ('mission.complete',      'MISSION_COMPLETED',   'Operator completed a mission',                    '✓'),
  ('mission.fail',          'CUSTOM',              'Operator failed a mission',                       '✗'),
  ('influence.growth',      'CUSTOM',              'Operator influence score increased materially',   '◐'),
  ('economy.transaction',   'CUSTOM',              'Money/credit/grant moved through the economy',    '◎'),
  ('agent.deploy',          'SYSTEM',              'New AI agent activated in the agent grid',        '◉'),
  ('agent.fault',           'CUSTOM',              'AI agent entered fault state',                    '⚠'),
  ('achievement.unlock',    'ACHIEVEMENT_UNLOCKED','Operator unlocked an achievement',                '✦')
on conflict (event_name) do nothing;

-- ---------- RLS for new tables ----------
alter table guilds                    enable row level security;
alter table guild_members             enable row level security;
alter table civilization_event_types  enable row level security;

create policy "guilds_readable"        on guilds                   for select using (true);
create policy "guilds_founder_create"  on guilds                   for insert with check (founder_id = current_operator_id());
create policy "gm_readable"            on guild_members            for select using (true);
create policy "gm_self_join"           on guild_members            for insert with check (operator_id = current_operator_id());
create policy "gm_self_leave"          on guild_members            for delete using (operator_id = current_operator_id());
create policy "evt_types_readable"     on civilization_event_types for select using (true);
