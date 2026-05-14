-- =====================================================================
--  V3.12 — Subscription intents (Stripe checkout staging)
-- =====================================================================

create table if not exists subscription_intents (
  id              uuid primary key default gen_random_uuid(),
  tier_id         uuid not null references realm_subscription_tiers(id) on delete cascade,
  operator_id     uuid references operator_profiles(id) on delete set null,
  email           text,
  source          text,
  status          text not null default 'CLICKED',
  stripe_session_id text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_intents_tier    on subscription_intents(tier_id);
create index if not exists idx_intents_op      on subscription_intents(operator_id);
create index if not exists idx_intents_status  on subscription_intents(status);
create index if not exists idx_intents_created on subscription_intents(created_at desc);
create index if not exists idx_intents_email   on subscription_intents(email);

alter table subscription_intents enable row level security;
drop policy if exists "intents_self_readable" on subscription_intents;
create policy "intents_self_readable" on subscription_intents for select
  using (operator_id = current_operator_id());

notify pgrst, 'reload schema';
