-- =====================================================================
--  V3.8 — Subscription intent capture
--  Pre-Stripe demand record. When an operator hits a tier checkout we
--  log the intent so the realm owner has a list of waiting subscribers
--  the moment Stripe wiring lands.
-- =====================================================================

create table if not exists subscription_intents (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references operator_profiles(id) on delete cascade,
  tier_id       uuid not null references realm_subscription_tiers(id) on delete cascade,
  source        text,                                         -- where intent came from (page url)
  created_at    timestamptz not null default now(),
  fulfilled_at  timestamptz,                                  -- set when Stripe sub created
  unique (operator_id, tier_id)
);
create index if not exists idx_intents_tier on subscription_intents(tier_id, created_at desc);
create index if not exists idx_intents_op   on subscription_intents(operator_id);

alter table subscription_intents enable row level security;
drop policy if exists "intents_self_readable" on subscription_intents;
drop policy if exists "intents_self_insert"   on subscription_intents;
create policy "intents_self_readable" on subscription_intents for select using (operator_id = current_operator_id());
create policy "intents_self_insert"   on subscription_intents for insert with check (operator_id = current_operator_id());

notify pgrst, 'reload schema';
