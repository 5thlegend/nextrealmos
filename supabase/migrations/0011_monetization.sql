-- =====================================================================
--  V3.6 — Monetization scaffolding
--  Adds:
--   • Realm subscription tiers (LEGVCY-style: Initiate/Adept/Master/Sovereign)
--   • Operator subscription state (which tier of which realm)
--   • Money Factory armory seeded with the first 6 entries
--   • Economy event + Stripe-readable refs (charge_id, subscription_id)
-- =====================================================================

do $$ begin create type subscription_tier_status as enum (
  'DRAFT','ACTIVE','RETIRED'
); exception when duplicate_object then null; end $$;

do $$ begin create type subscription_state as enum (
  'TRIAL','ACTIVE','PAST_DUE','CANCELED','EXPIRED'
); exception when duplicate_object then null; end $$;

-- ---------- REALM SUBSCRIPTION TIERS ----------
-- Each realm can publish a ladder of tiers (LEGVCY's INITIATE/ADEPT/...).
-- We store price + Stripe price_id + benefits json so realm UIs can render
-- without reaching into Stripe APIs.
create table if not exists realm_subscription_tiers (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references realms(id) on delete cascade,
  slug          citext not null,
  name          text not null,
  tagline       text,
  description   text,
  -- Pricing
  price_cents   integer not null default 0,
  currency      text not null default 'USD',
  interval      text not null default 'month',          -- 'month' | 'year' | 'one_time'
  stripe_price_id text,
  -- Benefits + presentation
  benefits      jsonb not null default '[]'::jsonb,     -- string[] for bullet rendering
  rank_min      rank_tier,                              -- optional gating
  banner_color  text not null default '#7c5cff',
  order_index   integer not null default 0,
  status        subscription_tier_status not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  unique (realm_id, slug)
);
create index if not exists idx_tiers_realm  on realm_subscription_tiers(realm_id, order_index);
create index if not exists idx_tiers_status on realm_subscription_tiers(status);

-- ---------- OPERATOR SUBSCRIPTIONS ----------
-- Per-operator state on a tier. One operator can hold multiple subs (one per
-- realm tier). Reflects Stripe subscription state mirrored here.
create table if not exists operator_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid not null references operator_profiles(id) on delete cascade,
  tier_id         uuid not null references realm_subscription_tiers(id) on delete restrict,
  state           subscription_state not null default 'TRIAL',
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (operator_id, tier_id)
);
create index if not exists idx_subs_operator on operator_subscriptions(operator_id);
create index if not exists idx_subs_state    on operator_subscriptions(state);

-- ---------- ECONOMY EVENT REFS ----------
-- Extend economy_events with Stripe references so the ledger is reconcilable.
alter table economy_events add column if not exists stripe_charge_id       text;
alter table economy_events add column if not exists stripe_subscription_id text;
alter table economy_events add column if not exists tier_id                uuid references realm_subscription_tiers(id) on delete set null;

-- ---------- MONEY FACTORY ARMORY (seed first 6 entries) ----------
-- Each entry rank-gates a high-leverage deployable app.
-- These rows reference existing realms by slug.
do $$
declare
  v_realm uuid;
begin
  -- Operator Grid (link-in-bio + signal map)
  select id into v_realm from realms where slug ilike 'nro-operator-core' limit 1;
  if v_realm is not null then
    insert into money_factory_entries (realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes)
    values (v_realm, 'operator-os', 0, 'INITIATE', 'Public dossier + signal map. Free for all operators. The federation showcase.')
    on conflict (realm_id) do update set notes = excluded.notes, category = excluded.category;
  end if;

  -- LEGVCY (subscription doctrine)
  select id into v_realm from realms where slug ilike 'legvcy' limit 1;
  if v_realm is not null then
    insert into money_factory_entries (realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes)
    values (v_realm, 'subscription', 0, 'OPERATOR', 'Tiered subscription doctrine: Initiate $29 · Adept $79 · Master $249 · Sovereign Keys $999. The first elite-leader recurring-revenue ladder.')
    on conflict (realm_id) do update set notes = excluded.notes, category = excluded.category;
  end if;

  -- DivinWine
  select id into v_realm from realms where slug ilike 'divinwine' limit 1;
  if v_realm is not null then
    insert into money_factory_entries (realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes)
    values (v_realm, 'curated-marketplace', 0, 'OPERATOR', 'Sage-curated wine intelligence reserve. Monthly cellar drops + private notes.')
    on conflict (realm_id) do update set notes = excluded.notes, category = excluded.category;
  end if;

  -- LASTMILE OS
  select id into v_realm from realms where slug ilike 'lastmile-os' limit 1;
  if v_realm is not null then
    insert into money_factory_entries (realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes)
    values (v_realm, 'b2b-saas', 0, 'VANGUARD', 'Cannabis last-mile delivery OS. Per-driver SaaS + per-delivery transaction fee.')
    on conflict (realm_id) do update set notes = excluded.notes, category = excluded.category;
  end if;

  -- WeightRoomApp
  select id into v_realm from realms where slug ilike 'weightroom-app' limit 1;
  if v_realm is not null then
    insert into money_factory_entries (realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes)
    values (v_realm, 'school-saas', 0, 'OPERATOR', 'High-school strength SaaS, branded per school. Annual contract + setup fee.')
    on conflict (realm_id) do update set notes = excluded.notes, category = excluded.category;
  end if;

  -- OverNight Money Apps
  select id into v_realm from realms where slug ilike 'overnight-money-apps' limit 1;
  if v_realm is not null then
    insert into money_factory_entries (realm_id, category, monthly_revenue_cents, unlock_rank_tier, notes)
    values (v_realm, 'micro-saas-factory', 0, 'OPERATOR', 'Rapid-ship micro-SaaS armory. Each NR-app shipped under nr-[name].pages.dev. Shared core + NRO export adapter.')
    on conflict (realm_id) do update set notes = excluded.notes, category = excluded.category;
  end if;
end $$;

-- ---------- LEGVCY TIERS (seed THE WAY ladder) ----------
do $$
declare v_realm uuid;
begin
  select id into v_realm from realms where slug ilike 'legvcy' limit 1;
  if v_realm is null then return; end if;

  insert into realm_subscription_tiers (realm_id, slug, name, tagline, description, price_cents, currency, interval, benefits, rank_min, banner_color, order_index, status) values
    (v_realm, 'initiate', 'Initiate Key',
     'The first tier. Doctrine, drops, and the Operator Frequency.',
     'Weekly doctrine drops + access to the Operator Frequency stream. Begin THE WAY.',
     2900, 'USD', 'month',
     '["Weekly doctrine drops","Operator Frequency stream","Initiate badge in NROS"]'::jsonb,
     null, '#7c5cff', 10, 'ACTIVE'),
    (v_realm, 'adept', 'Adept Key',
     'Hands-on. Live drills, intent reviews, the Adept signal channel.',
     'Initiate + bi-weekly live tactical drills + private Adept signal channel + intent reviews.',
     7900, 'USD', 'month',
     '["Everything in Initiate","Bi-weekly live drills","Private Adept signal channel","Intent reviews"]'::jsonb,
     null, '#22d3ee', 20, 'ACTIVE'),
    (v_realm, 'master', 'Master Key',
     'Tighter circle. Direct asks. Quarterly deep dives.',
     'Adept + monthly 1:1s + quarterly deep dives + quarterly war-room session + Master fed flag.',
     24900, 'USD', 'month',
     '["Everything in Adept","Monthly 1:1","Quarterly deep dive","Quarterly war-room","Master fed flag"]'::jsonb,
     null, '#f59e0b', 30, 'ACTIVE'),
    (v_realm, 'sovereign', 'Sovereign Keys',
     'The smallest circle. Full access. Co-architect of THE WAY.',
     'Master + weekly 1:1 + co-architect status + Sovereign Council seat + custom protocol design.',
     99900, 'USD', 'month',
     '["Everything in Master","Weekly 1:1","Sovereign Council seat","Co-architect of THE WAY","Custom protocol design"]'::jsonb,
     null, '#ec4899', 40, 'ACTIVE')
  on conflict (realm_id, slug) do update set
    name        = excluded.name,
    tagline     = excluded.tagline,
    description = excluded.description,
    price_cents = excluded.price_cents,
    benefits    = excluded.benefits,
    banner_color= excluded.banner_color,
    order_index = excluded.order_index,
    status      = excluded.status;
end $$;

-- ---------- RLS ----------
alter table realm_subscription_tiers enable row level security;
alter table operator_subscriptions   enable row level security;

drop policy if exists "tiers_readable"           on realm_subscription_tiers;
drop policy if exists "subs_self_readable"       on operator_subscriptions;

create policy "tiers_readable"     on realm_subscription_tiers for select using (status = 'ACTIVE');
create policy "subs_self_readable" on operator_subscriptions   for select using (operator_id = current_operator_id());

notify pgrst, 'reload schema';
