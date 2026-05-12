-- =====================================================================
--  V3.5 — Daily streak system
--  Civ-style daily progression: each consecutive day an operator
--  performs ANY activity (xp event), the streak ticks. Streak bonus
--  XP grants at 3/7/14/30/100-day thresholds.
-- =====================================================================

alter table operator_profiles add column if not exists current_streak_days integer not null default 0;
alter table operator_profiles add column if not exists longest_streak_days integer not null default 0;
alter table operator_profiles add column if not exists last_streak_date    date;

create index if not exists idx_op_streak on operator_profiles(current_streak_days desc);

-- Streak-bump function. Call with operator_id; updates streak based on
-- last_streak_date. Returns the new streak length.
create or replace function nros_bump_streak(p_operator uuid)
returns integer
language plpgsql
security definer
as $func$
declare
  v_last  date;
  v_today date := (now() at time zone 'utc')::date;
  v_cur   integer;
  v_lng   integer;
  v_new   integer;
begin
  if p_operator is null then return 0; end if;

  select last_streak_date, current_streak_days, longest_streak_days
    into v_last, v_cur, v_lng
    from operator_profiles where id = p_operator;
  if not found then return 0; end if;

  if v_last is null then
    v_new := 1;
  elsif v_last = v_today then
    return v_cur;       -- already counted today
  elsif v_last = v_today - 1 then
    v_new := v_cur + 1; -- consecutive day
  else
    v_new := 1;         -- streak broken, restart
  end if;

  update operator_profiles
     set current_streak_days = v_new,
         longest_streak_days = greatest(v_lng, v_new),
         last_streak_date    = v_today
   where id = p_operator;

  -- Threshold bonuses (idempotent — guarded by streak length match)
  if v_new = 3 then
    update operator_profiles set xp = xp + 50  where id = p_operator;
    insert into xp_logs (operator_id, delta, reason, source_type) values (p_operator, 50,  'Streak · 3 days',  'SYSTEM');
  elsif v_new = 7 then
    update operator_profiles set xp = xp + 150 where id = p_operator;
    insert into xp_logs (operator_id, delta, reason, source_type) values (p_operator, 150, 'Streak · 7 days',  'SYSTEM');
  elsif v_new = 14 then
    update operator_profiles set xp = xp + 400 where id = p_operator;
    insert into xp_logs (operator_id, delta, reason, source_type) values (p_operator, 400, 'Streak · 14 days', 'SYSTEM');
  elsif v_new = 30 then
    update operator_profiles set xp = xp + 1200 where id = p_operator;
    insert into xp_logs (operator_id, delta, reason, source_type) values (p_operator, 1200, 'Streak · 30 days', 'SYSTEM');
  elsif v_new = 100 then
    update operator_profiles set xp = xp + 5000 where id = p_operator;
    insert into xp_logs (operator_id, delta, reason, source_type) values (p_operator, 5000, 'Streak · 100 days', 'SYSTEM');
  end if;

  return v_new;
end
$func$;

-- Trigger on xp_logs — any earned XP bumps the streak (skip SYSTEM
-- inserts from streak bonuses themselves to avoid loops).
create or replace function _trg_bump_streak_on_xp() returns trigger
language plpgsql as $$
begin
  if NEW.reason like 'Streak · %' then return NEW; end if;
  perform nros_bump_streak(NEW.operator_id);
  return NEW;
end $$;

drop trigger if exists trg_bump_streak_on_xp on xp_logs;
create trigger trg_bump_streak_on_xp after insert on xp_logs
  for each row execute function _trg_bump_streak_on_xp();

-- Streak achievements
insert into achievements (code, name, description, icon, xp_bonus, rarity, era, banner_color, order_index) values
  ('STREAK_3',   'Three Days', 'Maintained a 3-day activity streak.',  'flame', 50,  'COMMON',   'ANCIENT',   '#7c5cff', 80),
  ('STREAK_7',   'One Week',   'Maintained a 7-day activity streak.',  'flame', 150, 'UNCOMMON', 'CLASSICAL', '#7c5cff', 81),
  ('STREAK_14',  'Two Weeks',  'Maintained a 14-day activity streak.', 'flame', 400, 'RARE',     'MEDIEVAL',  '#22d3ee', 82),
  ('STREAK_30',  'Sworn Habit','Maintained a 30-day activity streak.', 'flame', 1000,'EPIC',     'INDUSTRIAL','#f59e0b', 83),
  ('STREAK_100', 'Centurion',  'Maintained a 100-day activity streak.','flame', 4000,'MYTHIC',   'FUTURE',    '#ec4899', 84)
on conflict (code) do update set
  name = excluded.name, description = excluded.description,
  icon = excluded.icon, xp_bonus = excluded.xp_bonus,
  rarity = excluded.rarity, era = excluded.era, banner_color = excluded.banner_color, order_index = excluded.order_index;

-- Extend the evaluator to include streak achievements
create or replace function nros_evaluate_achievements(p_operator uuid)
returns void
language plpgsql
security definer
as $func$
declare
  v_xp                integer;
  v_rank_tier         text;
  v_streak            integer;
  v_longest_streak    integer;
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

  select op.xp, r.tier::text, op.current_streak_days, op.longest_streak_days
    into v_xp, v_rank_tier, v_streak, v_longest_streak
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

  -- XP totals
  if v_xp >=    100 then perform nros_grant_achievement(p_operator, 'XP_FIRST_BLOOD');    end if;
  if v_xp >=  1_000 then perform nros_grant_achievement(p_operator, 'XP_KILOWATT');       end if;
  if v_xp >= 10_000 then perform nros_grant_achievement(p_operator, 'XP_MEGAWATT');       end if;
  if v_xp >= 50_000 then perform nros_grant_achievement(p_operator, 'XP_GIGAWATT');       end if;

  -- Ranks
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

  -- Streak achievements (use longest_streak so a broken streak still earns the marker)
  if v_longest_streak >=   3 then perform nros_grant_achievement(p_operator, 'STREAK_3');   end if;
  if v_longest_streak >=   7 then perform nros_grant_achievement(p_operator, 'STREAK_7');   end if;
  if v_longest_streak >=  14 then perform nros_grant_achievement(p_operator, 'STREAK_14');  end if;
  if v_longest_streak >=  30 then perform nros_grant_achievement(p_operator, 'STREAK_30');  end if;
  if v_longest_streak >= 100 then perform nros_grant_achievement(p_operator, 'STREAK_100'); end if;
end
$func$;

notify pgrst, 'reload schema';
