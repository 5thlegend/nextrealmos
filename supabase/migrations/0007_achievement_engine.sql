-- =====================================================================
--  V3.2 — DIVINE-SYNC achievement engine
--  Adds:
--   • Achievement metadata (rarity, era, banner_color, criteria, secret)
--   • Universal grant function nros_grant_achievement(operator, code)
--      → idempotent, awards xp_bonus, pushes federation transmission
--        with event_name='achievement.unlock'
--   • Trigger functions on xp_logs, mission_progress, workflows,
--     operator_realms, guilds, transmissions, operator_profiles.rank_id
--   • Seeds 24 starter achievements across 4 rarities (Common → Mythic)
-- =====================================================================

-- ---------- ENUMS ----------
do $$ begin create type achievement_rarity as enum (
  'COMMON','UNCOMMON','RARE','EPIC','MYTHIC'
); exception when duplicate_object then null; end $$;

do $$ begin create type civilization_era as enum (
  'ANCIENT','CLASSICAL','MEDIEVAL','RENAISSANCE','INDUSTRIAL','MODERN','INFORMATION','FUTURE'
); exception when duplicate_object then null; end $$;

-- ---------- EXTEND ACHIEVEMENTS TABLE ----------
alter table achievements add column if not exists rarity        achievement_rarity not null default 'COMMON';
alter table achievements add column if not exists era           civilization_era   not null default 'ANCIENT';
alter table achievements add column if not exists banner_color  text not null default '#7c5cff';
alter table achievements add column if not exists criteria      jsonb not null default '{}'::jsonb;
alter table achievements add column if not exists secret        boolean not null default false;
alter table achievements add column if not exists order_index   integer not null default 0;

create index if not exists idx_achievements_rarity on achievements(rarity);
create index if not exists idx_achievements_era    on achievements(era);

-- ---------- UNIVERSAL GRANT FUNCTION ----------
-- Idempotent. Returns true if granted (first time), false if already had it.
-- Awards xp_bonus, logs xp, pushes a federation transmission via the NROS
-- system realm so realtime subscribers see it.
create or replace function nros_grant_achievement(p_operator uuid, p_code text)
returns boolean
language plpgsql
security definer
as $func$
declare
  v_ach        achievements%rowtype;
  v_realm_id   uuid;
  v_inserted   integer;
begin
  if p_operator is null or p_code is null then return false; end if;

  select * into v_ach from achievements where code = p_code;
  if not found then return false; end if;

  insert into operator_achievements (operator_id, achievement_id)
  values (p_operator, v_ach.id)
  on conflict do nothing;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  if v_inserted = 0 then return false; end if;

  -- Award the xp_bonus directly (avoid recursion through trigger by using
  -- inline update + xp_logs insert; xp_logs trigger guards against re-firing
  -- on source_type='ACHIEVEMENT').
  if v_ach.xp_bonus > 0 then
    update operator_profiles
       set xp = xp + v_ach.xp_bonus,
           updated_at = now()
     where id = p_operator;

    insert into xp_logs (operator_id, delta, reason, source_type, source_id)
    values (p_operator, v_ach.xp_bonus, 'Achievement: ' || v_ach.name, 'ACHIEVEMENT', v_ach.id);
  end if;

  -- Federation transmission so /transmissions feed + realtime subscribers
  -- see it across all realms. Routed through the NROS system realm.
  select id into v_realm_id from realms where slug = 'nros' limit 1;
  if v_realm_id is null then
    select id into v_realm_id from realms order by created_at limit 1;
  end if;

  if v_realm_id is not null then
    insert into transmissions (realm_id, operator_id, kind, event_name, title, body, metadata)
    values (
      v_realm_id,
      p_operator,
      'ACHIEVEMENT_UNLOCKED'::transmission_kind,
      'achievement.unlock',
      'Achievement unlocked · ' || v_ach.name,
      v_ach.description,
      jsonb_build_object(
        'achievement_code', v_ach.code,
        'achievement_id',   v_ach.id,
        'rarity',           v_ach.rarity,
        'era',              v_ach.era,
        'icon',             v_ach.icon,
        'banner_color',     v_ach.banner_color,
        'xp_bonus',         v_ach.xp_bonus
      )
    );
  end if;

  return true;
end;
$func$;

-- ---------- EVALUATION FUNCTION ----------
-- Re-evaluates all standard achievements for an operator. Cheap to call
-- from triggers because each grant is idempotent.
create or replace function nros_evaluate_achievements(p_operator uuid)
returns void
language plpgsql
security definer
as $func$
declare
  v_xp                integer;
  v_rank_tier         text;
  v_missions_done     integer;
  v_workflows_done    integer;
  v_workflows_total   integer;
  v_realms_joined     integer;
  v_guilds_founded    integer;
  v_tx_sent           integer;
  v_launches          integer;
  v_ships             integer;
begin
  if p_operator is null then return; end if;

  select op.xp, r.tier::text
    into v_xp, v_rank_tier
    from operator_profiles op
    left join ranks r on r.id = op.rank_id
   where op.id = p_operator;
  if not found then return; end if;

  select count(*) into v_missions_done   from mission_progress where operator_id = p_operator and state = 'COMPLETED';
  select count(*) into v_workflows_total from workflows         where operator_id = p_operator;
  select count(*) into v_workflows_done  from workflows         where operator_id = p_operator and status = 'COMPLETED';
  select count(*) into v_realms_joined   from operator_realms   where operator_id = p_operator;
  select count(*) into v_guilds_founded  from guilds            where founder_id  = p_operator;
  select count(*) into v_tx_sent         from transmissions     where operator_id = p_operator;
  select count(*) into v_launches        from transmissions     where operator_id = p_operator and event_name = 'deployment.launch';
  select count(*) into v_ships           from transmissions     where operator_id = p_operator and event_name in ('deployment.ship','deployment.launch','deployment.milestone');

  -- XP-total milestones
  if v_xp >=    100 then perform nros_grant_achievement(p_operator, 'XP_FIRST_BLOOD');    end if;
  if v_xp >=  1_000 then perform nros_grant_achievement(p_operator, 'XP_KILOWATT');       end if;
  if v_xp >= 10_000 then perform nros_grant_achievement(p_operator, 'XP_MEGAWATT');       end if;
  if v_xp >= 50_000 then perform nros_grant_achievement(p_operator, 'XP_GIGAWATT');       end if;

  -- Rank ascensions
  if v_rank_tier = 'OPERATOR'  then perform nros_grant_achievement(p_operator, 'RANK_OPERATOR');  end if;
  if v_rank_tier = 'VANGUARD'  then perform nros_grant_achievement(p_operator, 'RANK_VANGUARD');  end if;
  if v_rank_tier = 'ARCHITECT' then perform nros_grant_achievement(p_operator, 'RANK_ARCHITECT'); end if;
  if v_rank_tier = 'WARDEN'    then perform nros_grant_achievement(p_operator, 'RANK_WARDEN');    end if;
  if v_rank_tier = 'SOVEREIGN' then perform nros_grant_achievement(p_operator, 'RANK_SOVEREIGN'); end if;

  -- Missions
  if v_missions_done >=  1 then perform nros_grant_achievement(p_operator, 'MISSION_FIRST_LIGHT');  end if;
  if v_missions_done >= 10 then perform nros_grant_achievement(p_operator, 'MISSION_DECABEAT');     end if;
  if v_missions_done >= 50 then perform nros_grant_achievement(p_operator, 'MISSION_CENTURION');    end if;

  -- Workflows
  if v_workflows_total >= 1 then perform nros_grant_achievement(p_operator, 'OBLISK_FIRST_FORGE'); end if;
  if v_workflows_done  >= 1 then perform nros_grant_achievement(p_operator, 'OBLISK_COMPLETION');  end if;
  if v_workflows_done  >= 5 then perform nros_grant_achievement(p_operator, 'OBLISK_FORGEMASTER'); end if;

  -- Realms
  if v_realms_joined >= 1 then perform nros_grant_achievement(p_operator, 'REALM_FIRST_TOUCH');   end if;
  if v_realms_joined >= 5 then perform nros_grant_achievement(p_operator, 'REALM_FEDERATIONIST'); end if;

  -- Guilds
  if v_guilds_founded >= 1 then perform nros_grant_achievement(p_operator, 'GUILD_FOUNDER'); end if;

  -- Transmissions / deployments
  if v_tx_sent  >=  1 then perform nros_grant_achievement(p_operator, 'TX_FIRST_SIGNAL');    end if;
  if v_tx_sent  >= 50 then perform nros_grant_achievement(p_operator, 'TX_BROADCAST_TOWER'); end if;
  if v_launches >=  1 then perform nros_grant_achievement(p_operator, 'DEPLOY_LAUNCH');      end if;
  if v_launches >=  5 then perform nros_grant_achievement(p_operator, 'DEPLOY_LAUNCH_5');    end if;
  if v_ships    >= 25 then perform nros_grant_achievement(p_operator, 'DEPLOY_SHIPS_25');    end if;
end;
$func$;

-- ---------- TRIGGERS ----------
-- xp_logs: re-evaluate on any xp event (skip ACHIEVEMENT-source xp to avoid loops)
create or replace function _trg_eval_on_xp() returns trigger language plpgsql as $$
begin
  if NEW.source_type = 'ACHIEVEMENT' then return NEW; end if;
  perform nros_evaluate_achievements(NEW.operator_id);
  return NEW;
end $$;
drop trigger if exists trg_eval_on_xp on xp_logs;
create trigger trg_eval_on_xp after insert on xp_logs
  for each row execute function _trg_eval_on_xp();

-- mission_progress: re-evaluate when a mission becomes COMPLETED
create or replace function _trg_eval_on_mission() returns trigger language plpgsql as $$
begin
  if NEW.state = 'COMPLETED' then perform nros_evaluate_achievements(NEW.operator_id); end if;
  return NEW;
end $$;
drop trigger if exists trg_eval_on_mission on mission_progress;
create trigger trg_eval_on_mission after insert or update on mission_progress
  for each row execute function _trg_eval_on_mission();

-- workflows: re-evaluate on insert / status change
create or replace function _trg_eval_on_workflow() returns trigger language plpgsql as $$
begin
  perform nros_evaluate_achievements(NEW.operator_id);
  return NEW;
end $$;
drop trigger if exists trg_eval_on_workflow on workflows;
create trigger trg_eval_on_workflow after insert or update of status on workflows
  for each row execute function _trg_eval_on_workflow();

-- operator_realms: re-evaluate when an operator joins a realm
create or replace function _trg_eval_on_realm_join() returns trigger language plpgsql as $$
begin
  perform nros_evaluate_achievements(NEW.operator_id);
  return NEW;
end $$;
drop trigger if exists trg_eval_on_realm_join on operator_realms;
create trigger trg_eval_on_realm_join after insert on operator_realms
  for each row execute function _trg_eval_on_realm_join();

-- guilds: re-evaluate on guild creation for the founder
create or replace function _trg_eval_on_guild() returns trigger language plpgsql as $$
begin
  perform nros_evaluate_achievements(NEW.founder_id);
  return NEW;
end $$;
drop trigger if exists trg_eval_on_guild on guilds;
create trigger trg_eval_on_guild after insert on guilds
  for each row execute function _trg_eval_on_guild();

-- transmissions: re-evaluate when an operator-attributed transmission lands
-- (skip achievement.unlock to avoid evaluator loops)
create or replace function _trg_eval_on_tx() returns trigger language plpgsql as $$
begin
  if NEW.event_name = 'achievement.unlock' then return NEW; end if;
  if NEW.operator_id is not null then perform nros_evaluate_achievements(NEW.operator_id); end if;
  return NEW;
end $$;
drop trigger if exists trg_eval_on_tx on transmissions;
create trigger trg_eval_on_tx after insert on transmissions
  for each row execute function _trg_eval_on_tx();

-- operator_profiles.rank_id change → fires evaluator (and is also covered by xp_logs)
create or replace function _trg_eval_on_rank() returns trigger language plpgsql as $$
begin
  if NEW.rank_id is distinct from OLD.rank_id then
    perform nros_evaluate_achievements(NEW.id);
  end if;
  return NEW;
end $$;
drop trigger if exists trg_eval_on_rank on operator_profiles;
create trigger trg_eval_on_rank after update of rank_id on operator_profiles
  for each row execute function _trg_eval_on_rank();

-- ---------- SEED ACHIEVEMENTS ----------
-- 24 starter achievements covering the canonical progression loops.
-- Idempotent via on-conflict-do-update so re-running the migration tweaks copy.
insert into achievements (code, name, description, icon, xp_bonus, rarity, era, banner_color, order_index) values
  -- XP totals
  ('XP_FIRST_BLOOD',       'First Light',          'Earned your first 100 XP. The kernel sees you.',          'sparkles',     25,  'COMMON',   'ANCIENT',     '#7c5cff', 10),
  ('XP_KILOWATT',          'Kilowatt',             'Crossed 1,000 XP. The grid hums.',                        'zap',         100,  'UNCOMMON', 'CLASSICAL',   '#7c5cff', 11),
  ('XP_MEGAWATT',          'Megawatt',             'Crossed 10,000 XP. You power realms now.',                'bolt',        500,  'RARE',     'INDUSTRIAL',  '#22d3ee', 12),
  ('XP_GIGAWATT',          'Gigawatt',             'Crossed 50,000 XP. Civilization-scale output.',           'flame',     2500,  'EPIC',     'INFORMATION', '#f59e0b', 13),

  -- Rank ascensions
  ('RANK_OPERATOR',        'Sworn Operator',       'Ascended to OPERATOR rank.',                              'shield',       50,  'COMMON',   'ANCIENT',     '#7c5cff', 20),
  ('RANK_VANGUARD',        'Vanguard',             'Ascended to VANGUARD rank.',                              'crosshair',   200,  'UNCOMMON', 'CLASSICAL',   '#7c5cff', 21),
  ('RANK_ARCHITECT',       'Architect',            'Ascended to ARCHITECT rank.',                             'compass',     500,  'RARE',     'RENAISSANCE', '#22d3ee', 22),
  ('RANK_WARDEN',          'Warden',               'Ascended to WARDEN rank.',                                'crown',      1500,  'EPIC',     'INDUSTRIAL',  '#f59e0b', 23),
  ('RANK_SOVEREIGN',       'Sovereign',            'Ascended to SOVEREIGN. Few will ever stand here.',        'star',       5000,  'MYTHIC',   'FUTURE',      '#ec4899', 24),

  -- Missions
  ('MISSION_FIRST_LIGHT',  'First Mission',        'Completed your first mission.',                            'flag',         50,  'COMMON',   'ANCIENT',     '#7c5cff', 30),
  ('MISSION_DECABEAT',     'Decabeat',             'Completed 10 missions.',                                   'list-checks', 250,  'UNCOMMON', 'CLASSICAL',   '#7c5cff', 31),
  ('MISSION_CENTURION',    'Centurion',            'Completed 50 missions.',                                   'swords',     1000,  'EPIC',     'MEDIEVAL',    '#f59e0b', 32),

  -- OBLISK / Workflows
  ('OBLISK_FIRST_FORGE',   'Apprentice of OBLISK', 'Forged your first workflow.',                              'workflow',     50,  'COMMON',   'ANCIENT',     '#7c5cff', 40),
  ('OBLISK_COMPLETION',    'Workflow Completed',   'Completed your first workflow end-to-end.',                'check-circle',150,  'UNCOMMON', 'CLASSICAL',   '#7c5cff', 41),
  ('OBLISK_FORGEMASTER',   'Forgemaster',          'Completed 5 workflows. OBLISK answers when you call.',     'hammer',      750,  'RARE',     'RENAISSANCE', '#22d3ee', 42),

  -- Realms / Federation
  ('REALM_FIRST_TOUCH',    'First Realm',          'Joined your first realm. Federation acknowledges you.',    'globe',        50,  'COMMON',   'ANCIENT',     '#7c5cff', 50),
  ('REALM_FEDERATIONIST',  'Federationist',        'Joined 5 realms. You walk multiple worlds.',               'network',     500,  'RARE',     'INFORMATION', '#22d3ee', 51),

  -- Guilds
  ('GUILD_FOUNDER',        'Guild Founder',        'Founded a guild. The dynasty begins with you.',            'flag-triangle-right', 300, 'RARE', 'MEDIEVAL',  '#f59e0b', 60),

  -- Transmissions / Deployments
  ('TX_FIRST_SIGNAL',      'First Signal',         'Pushed your first federation transmission.',               'radio',        25,  'COMMON',   'ANCIENT',     '#7c5cff', 70),
  ('TX_BROADCAST_TOWER',   'Broadcast Tower',      'Pushed 50 transmissions to the federation.',               'radio-tower', 400,  'RARE',     'INDUSTRIAL',  '#22d3ee', 71),
  ('DEPLOY_LAUNCH',        'Launch Sequence',      'Shipped a deployment.launch event.',                       'rocket',      100,  'UNCOMMON', 'INDUSTRIAL',  '#7c5cff', 72),
  ('DEPLOY_LAUNCH_5',      'Serial Launcher',      'Shipped 5 deployment.launch events.',                      'rocket',      500,  'EPIC',     'MODERN',      '#f59e0b', 73),
  ('DEPLOY_SHIPS_25',      'Compulsive Shipper',   'Shipped 25 deployment events of any kind.',                'ship',        750,  'EPIC',     'MODERN',      '#f59e0b', 74),

  -- Mythic capstone
  ('CIV_WONDER_BUILDER',   'Wonder Builder',       'You built a federation Wonder. Permanent civilization mark.', 'landmark', 5000, 'MYTHIC',  'FUTURE',      '#ec4899', 99)
on conflict (code) do update set
  name         = excluded.name,
  description  = excluded.description,
  icon         = excluded.icon,
  xp_bonus     = excluded.xp_bonus,
  rarity       = excluded.rarity,
  era          = excluded.era,
  banner_color = excluded.banner_color,
  order_index  = excluded.order_index;

-- Register achievement event in vocabulary
insert into civilization_event_types (event_name, kind, description, emoji) values
  ('achievement.unlock', 'ACHIEVEMENT_UNLOCKED', 'Operator unlocked an achievement', '✦')
on conflict (event_name) do update set description = excluded.description, emoji = excluded.emoji;

-- ---------- VIEW: per-operator achievement progress ----------
create or replace view operator_achievement_progress as
select
  op.id            as operator_id,
  op.callsign      as callsign,
  a.id             as achievement_id,
  a.code           as code,
  a.name           as name,
  a.description    as description,
  a.icon           as icon,
  a.rarity         as rarity,
  a.era            as era,
  a.banner_color   as banner_color,
  a.xp_bonus       as xp_bonus,
  a.order_index    as order_index,
  a.secret         as secret,
  oa.awarded_at    as awarded_at,
  (oa.awarded_at is not null) as unlocked
from operator_profiles op
cross join achievements a
left join operator_achievements oa on oa.operator_id = op.id and oa.achievement_id = a.id;

-- ---------- RLS for achievements (public read) ----------
alter table achievements           enable row level security;
alter table operator_achievements  enable row level security;

drop policy if exists "achievements_readable"           on achievements;
drop policy if exists "operator_achievements_readable" on operator_achievements;

create policy "achievements_readable"           on achievements          for select using (true);
create policy "operator_achievements_readable"  on operator_achievements for select using (true);

notify pgrst, 'reload schema';
