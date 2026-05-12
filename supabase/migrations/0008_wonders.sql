-- =====================================================================
--  V3.3 — DIVINE-SYNC Wonders
--  Wonders = federation-visible, era-anchored marquee builds. Each wonder
--  belongs to ONE realm, has ONE builder operator, and is permanent.
--  Civ 6 inspiration: a Wonder built in your civ is visible to all.
-- =====================================================================

create table if not exists wonders (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  tagline       text not null,
  description   text,
  realm_id      uuid not null references realms(id) on delete cascade,
  builder_id    uuid references operator_profiles(id) on delete set null,
  era           civilization_era not null default 'CLASSICAL',
  banner_color  text not null default '#f59e0b',
  icon          text not null default 'landmark',
  effect        text,                                  -- short doctrine sentence
  visible       boolean not null default true,         -- federation-visible
  built_at      timestamptz not null default now(),
  metadata      jsonb not null default '{}'::jsonb
);

create index if not exists idx_wonders_realm on wonders(realm_id);
create index if not exists idx_wonders_era   on wonders(era);

-- ---------- TRIGGER: when a wonder is built, federate the event ----------
create or replace function _trg_wonder_federate() returns trigger
language plpgsql
security definer
as $func$
begin
  insert into transmissions (realm_id, operator_id, kind, event_name, title, body, metadata)
  values (
    NEW.realm_id,
    NEW.builder_id,
    'CUSTOM'::transmission_kind,
    'wonder.built',
    'Wonder built · ' || NEW.name,
    coalesce(NEW.tagline, NEW.description),
    jsonb_build_object(
      'wonder_slug', NEW.slug,
      'wonder_id',   NEW.id,
      'era',         NEW.era,
      'banner_color', NEW.banner_color,
      'icon',        NEW.icon
    )
  );

  -- Grant the Wonder Builder achievement to the operator who built it
  if NEW.builder_id is not null then
    perform nros_grant_achievement(NEW.builder_id, 'CIV_WONDER_BUILDER');
  end if;
  return NEW;
end
$func$;

drop trigger if exists trg_wonder_federate on wonders;
create trigger trg_wonder_federate after insert on wonders
  for each row execute function _trg_wonder_federate();

-- Register in the event vocabulary
insert into civilization_event_types (event_name, kind, description, emoji) values
  ('wonder.built', 'CUSTOM', 'A federation-visible Wonder was built in a realm', '▣')
on conflict (event_name) do update set description = excluded.description, emoji = excluded.emoji;

-- ---------- VIEW: wonders count per realm (for graph node rendering) ----------
create or replace view realm_wonder_counts as
select realm_id, count(*)::int as wonder_count
  from wonders
 where visible = true
 group by realm_id;

-- ---------- RLS ----------
alter table wonders enable row level security;
drop policy if exists "wonders_readable" on wonders;
create policy "wonders_readable" on wonders for select using (visible = true);

-- ---------- SEED 7 federation-defining Wonders (one per first-class realm if available) ----------
-- These are the marquee "always-on" wonders the federation ships with.
-- If a realm doesn't exist yet they're skipped silently (each insert is a guard'd select).
do $$
declare
  v_realm uuid;
  v_founder uuid;
begin
  select id into v_founder from operator_profiles where callsign = 'FOUNDER' limit 1;

  -- 1. The Kernel Itself
  select id into v_realm from realms where slug = 'nros' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('the-kernel', 'The Kernel', 'Federation infrastructure that breathes.',
            'NROS itself: the universal identity, XP graph, transmissions feed, and governance APIs that bind every realm into one civilization.',
            v_realm, v_founder, 'INFORMATION', '#22d3ee', 'landmark',
            'All realms gain access to federation identity, XP, and transmissions.')
    on conflict (slug) do nothing;
  end if;

  -- 2. The Operator Grid
  select id into v_realm from realms where slug ilike 'nextrealmoperators' or slug = 'operator-grid' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('operator-grid-wonder', 'The Operator Grid', 'Public face of the civilization.',
            'The first realm to render the operator dossier + signal map publicly. Every operator''s presence in the wider world.',
            v_realm, v_founder, 'INFORMATION', '#7c5cff', 'globe',
            'Operators gain a public dossier visible to the open internet.')
    on conflict (slug) do nothing;
  end if;

  -- 3. ARCSEED Worldcraft
  select id into v_realm from realms where slug = 'arcseed' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('arcseed-foundation', 'Arcseed Foundation', 'Worldcraft + simulation seed.',
            'The foundation laid for games, immersive worlds, and the future VR Nexus.',
            v_realm, v_founder, 'FUTURE', '#ec4899', 'star',
            'Federation gains a future-facing simulation surface.')
    on conflict (slug) do nothing;
  end if;

  -- 4. LEGVCY Way
  select id into v_realm from realms where slug = 'legvcy' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('legvcy-way', 'The Way', 'Subscription doctrine for sovereign operators.',
            'LEGVCY''s tiered Initiate/Adept/Master/Sovereign Keys — the first elite realm to publish a recurring revenue ladder.',
            v_realm, v_founder, 'MEDIEVAL', '#f59e0b', 'crown',
            'Elite leaders gain a productized doctrine path.')
    on conflict (slug) do nothing;
  end if;

  -- 5. DivinWine Cellar
  select id into v_realm from realms where slug = 'divinwine' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('divin-cellar', 'The Cellar', 'Sage-curated reserve.',
            'A sovereign elite realm of curated wine intelligence, run by the Sage of the Cellar.',
            v_realm, v_founder, 'RENAISSANCE', '#7c5cff', 'compass',
            'Federation gains a sage-curated elite realm.')
    on conflict (slug) do nothing;
  end if;

  -- 6. OverNight Money Apps factory
  select id into v_realm from realms where slug = 'overnight-money-apps' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('money-factory', 'The Money Factory', 'Rapid-ship micro-SaaS armory.',
            'Each NR-app shipped under nr-[name].pages.dev. Shared core + NRO export adapter for full Operator Grid portability.',
            v_realm, v_founder, 'MODERN', '#22d3ee', 'workflow',
            'Operators gain a rapid-ship micro-SaaS publishing path.')
    on conflict (slug) do nothing;
  end if;

  -- 7. The Realm Graph Engine itself (anchored to NROS)
  select id into v_realm from realms where slug = 'nros' limit 1;
  if v_realm is not null then
    insert into wonders (slug, name, tagline, description, realm_id, builder_id, era, banner_color, icon, effect)
    values ('graph-engine', 'The Graph Engine', 'Living civilization map.',
            'Node-based control surface that renders the entire federation as a graph. Click any realm to inspect.',
            v_realm, v_founder, 'INFORMATION', '#22d3ee', 'network',
            'Founders gain god-view over every realm in the federation.')
    on conflict (slug) do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';
