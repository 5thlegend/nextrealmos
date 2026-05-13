-- =====================================================================
--  V3.9 — ARCSEED scaffold + OBLISK templates
--  ARCSEED: lightweight game/sim sessions table for the future VR layer.
--           Today it captures any "play session" event (challenge,
--           speedrun, sim) so the realm can show activity even before
--           VR ships. Spatial-ready (no VR yet — V5+).
--  OBLISK: workflow_templates table + 4 seeded productized templates so
--          operators can pick a starting point instead of a blank slate.
-- =====================================================================

-- ---------- ARCSEED SESSIONS ----------
do $$ begin create type arcseed_session_kind as enum (
  'CHALLENGE','SPEEDRUN','SIM','LOBBY','PRACTICE'
); exception when duplicate_object then null; end $$;

do $$ begin create type arcseed_session_status as enum (
  'OPEN','IN_PROGRESS','COMPLETED','ABANDONED'
); exception when duplicate_object then null; end $$;

create table if not exists arcseed_sessions (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references realms(id) on delete cascade,
  host_id       uuid references operator_profiles(id) on delete set null,
  kind          arcseed_session_kind not null default 'CHALLENGE',
  title         text not null,
  description   text,
  status        arcseed_session_status not null default 'OPEN',
  capacity      integer not null default 8,
  spatial_ready boolean not null default false,           -- VR-flavored?
  metadata      jsonb not null default '{}'::jsonb,
  starts_at     timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_arc_realm  on arcseed_sessions(realm_id);
create index if not exists idx_arc_status on arcseed_sessions(status);
create index if not exists idx_arc_starts on arcseed_sessions(starts_at desc nulls last);

create table if not exists arcseed_session_participants (
  session_id    uuid not null references arcseed_sessions(id) on delete cascade,
  operator_id   uuid not null references operator_profiles(id) on delete cascade,
  role          text not null default 'PLAYER',           -- 'HOST' | 'PLAYER' | 'SPECTATOR'
  joined_at     timestamptz not null default now(),
  primary key (session_id, operator_id)
);
create index if not exists idx_arc_part_op on arcseed_session_participants(operator_id);

alter table arcseed_sessions             enable row level security;
alter table arcseed_session_participants enable row level security;

drop policy if exists "arc_sessions_readable"     on arcseed_sessions;
drop policy if exists "arc_sessions_host_create"  on arcseed_sessions;
drop policy if exists "arc_part_self_join"        on arcseed_session_participants;
drop policy if exists "arc_part_readable"         on arcseed_session_participants;

create policy "arc_sessions_readable"     on arcseed_sessions             for select using (true);
create policy "arc_sessions_host_create"  on arcseed_sessions             for insert with check (host_id = current_operator_id());
create policy "arc_part_readable"         on arcseed_session_participants for select using (true);
create policy "arc_part_self_join"        on arcseed_session_participants for insert with check (operator_id = current_operator_id());

-- ---------- OBLISK TEMPLATES ----------
create table if not exists workflow_templates (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  tagline       text not null,
  description   text,
  difficulty    mission_difficulty not null default 'T2',
  estimated_hours numeric(6,2),
  recommended_stack text[] not null default '{}',
  monetization_notes text,
  /** phases stored as nested JSON so we can spawn a workflow + steps in one go */
  phases        jsonb not null default '[]'::jsonb,
  category      text,
  banner_color  text not null default '#7c5cff',
  order_index   integer not null default 0,
  visible       boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_wf_tpl_visible on workflow_templates(visible, order_index);
create index if not exists idx_wf_tpl_cat     on workflow_templates(category);

alter table workflow_templates enable row level security;
drop policy if exists "wf_tpl_readable" on workflow_templates;
create policy "wf_tpl_readable" on workflow_templates for select using (visible = true);

-- ---------- SEED 4 TEMPLATES ----------
insert into workflow_templates (slug, name, tagline, description, difficulty, estimated_hours, recommended_stack, monetization_notes, phases, category, banner_color, order_index) values
  ('micro-saas-7day',
   'Micro-SaaS in 7 days',
   'Ship a single-feature SaaS that one person pays for.',
   'Find a sharp niche, build the smallest viable surface, charge from day one. Friction beats features.',
   'T3', 40,
   ARRAY['Next.js','Cloudflare Pages','Supabase','Stripe','Tailwind'],
   'Charge from launch. Single tier $19-49/mo. Time-to-revenue: 7 days.',
   '[
     {"title":"Pick a niche","detail":"Pick one customer profile + one specific pain. Write the landing tagline first.","estimated_hours":3,"tasks":[
       {"type":"DECISION","title":"Pick the niche","detail":"Choose one tight ICP","estimated_hours":1},
       {"type":"TASK","title":"Draft landing tagline + 3 bullets","detail":"Write copy before code","estimated_hours":2}
     ]},
     {"title":"Build the smallest surface","detail":"Single feature. Auth + Stripe + the thing.","estimated_hours":24,"tasks":[
       {"type":"TASK","title":"Auth + Stripe","detail":"Wire signup + checkout","estimated_hours":6},
       {"type":"TASK","title":"Core feature MVP","detail":"Single screen, single action","estimated_hours":12},
       {"type":"AUTOMATION","title":"NROS hook","detail":"Push deployment.launch on first paying user","estimated_hours":2},
       {"type":"TASK","title":"Polish + empty states","detail":"Make it feel real","estimated_hours":4}
     ]},
     {"title":"Launch + first 3 users","detail":"Pay for the launch. Don''t wait.","estimated_hours":13,"tasks":[
       {"type":"TASK","title":"Direct outreach to 30 ICPs","detail":"DM, not Twitter","estimated_hours":8},
       {"type":"TASK","title":"Onboarding flow","detail":"Demo screencast attached","estimated_hours":3},
       {"type":"DECISION","title":"Continue or kill","detail":"3 paying users by day 7 = continue","estimated_hours":2}
     ]}
   ]'::jsonb,
   'micro-saas',
   '#22d3ee',
   10),

  ('content-engine-30day',
   'Content engine — 30 days',
   'Publish daily. Build a distribution moat in a month.',
   'Pick a single channel, ship one post per day for 30 days. Build the publishing muscle, not the audience-yet.',
   'T2', 30,
   ARRAY['Notion','Buffer','Twitter/X','LinkedIn','Substack'],
   'No direct revenue month 1. Sets up affiliate / sponsorship / digital product month 3+.',
   '[
     {"title":"Pick channel + format","detail":"One channel, one format. No spreading.","estimated_hours":2,"tasks":[
       {"type":"DECISION","title":"Channel + format","detail":"Twitter threads, LinkedIn carousels, Substack notes — pick ONE","estimated_hours":2}
     ]},
     {"title":"Ship daily x 30","detail":"30 posts. Same format. Different angle each day.","estimated_hours":24,"tasks":[
       {"type":"AUTOMATION","title":"Daily reminder + queue","detail":"Reminder at 8am, batch-write Sundays","estimated_hours":2},
       {"type":"TASK","title":"30 posts","detail":"~45 min each","estimated_hours":22}
     ]},
     {"title":"Audit + monetize","detail":"What landed? Pick the next 90-day move.","estimated_hours":4,"tasks":[
       {"type":"TASK","title":"Top-3 post analysis","detail":"What worked, what didn''t","estimated_hours":2},
       {"type":"DECISION","title":"Next 90 days","detail":"Pick paid product OR continue distribution","estimated_hours":2}
     ]}
   ]'::jsonb,
   'distribution',
   '#7c5cff',
   20),

  ('legvcy-tier-launch',
   'Launch a subscription tier',
   'Productize doctrine + start charging recurring.',
   'Use NROS realm subscription tiers + Stripe. From idea to first paying subscriber in 14 days.',
   'T3', 28,
   ARRAY['NROS @nros/sdk','Stripe','Postmark','Notion'],
   '$29-99/mo Initiate tier first. Adept/Master/Sovereign added monthly.',
   '[
     {"title":"Define the tier ladder","detail":"4 tiers minimum. Each ~3x the last.","estimated_hours":4,"tasks":[
       {"type":"DECISION","title":"Pick benefits per tier","detail":"What does each tier UNIQUELY give?","estimated_hours":2},
       {"type":"TASK","title":"Write benefit copy","detail":"Bullet-tight, no fluff","estimated_hours":2}
     ]},
     {"title":"Wire Stripe + NROS","detail":"Use realm_subscription_tiers + operator_subscriptions tables.","estimated_hours":12,"tasks":[
       {"type":"TASK","title":"Create Stripe products + prices","detail":"One per tier","estimated_hours":3},
       {"type":"AUTOMATION","title":"NROS upsert tier rows","detail":"Mirror Stripe price IDs","estimated_hours":3},
       {"type":"TASK","title":"Checkout link from /tiers page","detail":"Wire NROS Stripe handler","estimated_hours":4},
       {"type":"AUTOMATION","title":"Webhook → operator_subscriptions","detail":"checkout.session.completed handler","estimated_hours":2}
     ]},
     {"title":"Sell the first 5","detail":"Direct, not broadcast.","estimated_hours":12,"tasks":[
       {"type":"TASK","title":"Personally invite 30 ICPs","detail":"DM or 1:1 email","estimated_hours":8},
       {"type":"TASK","title":"Welcome sequence","detail":"Day 1 + 7 + 30 emails","estimated_hours":4}
     ]}
   ]'::jsonb,
   'subscription',
   '#f59e0b',
   30),

  ('arcseed-challenge-week',
   'Run a public challenge week',
   'Spin up an ARCSEED challenge. Get operators competing.',
   'A 7-day challenge with daily check-ins. Use ARCSEED sessions + transmissions to drive engagement.',
   'T2', 16,
   ARRAY['NROS @nros/sdk','Discord/X','ARCSEED sessions'],
   'Engagement / retention play, not direct revenue. Builds list + community.',
   '[
     {"title":"Design the challenge","detail":"7 days. Daily measurable task. Public scoreboard.","estimated_hours":3,"tasks":[
       {"type":"DECISION","title":"Pick the metric","detail":"What can every participant measure each day?","estimated_hours":1},
       {"type":"TASK","title":"Write the rules","detail":"One page, no ambiguity","estimated_hours":2}
     ]},
     {"title":"Spin up infrastructure","detail":"ARCSEED session + scoreboard.","estimated_hours":8,"tasks":[
       {"type":"TASK","title":"Create arcseed_session row","detail":"kind=CHALLENGE, capacity=100","estimated_hours":1},
       {"type":"TASK","title":"Daily check-in form","detail":"Submit per-day score","estimated_hours":4},
       {"type":"AUTOMATION","title":"Push transmission per check-in","detail":"event_name=mission.complete","estimated_hours":3}
     ]},
     {"title":"Run the week + close","detail":"Daily reminders + winner announcement.","estimated_hours":5,"tasks":[
       {"type":"AUTOMATION","title":"Daily 8am ping","detail":"Email/DM all participants","estimated_hours":2},
       {"type":"TASK","title":"Winner announcement","detail":"Public, with prize","estimated_hours":3}
     ]}
   ]'::jsonb,
   'engagement',
   '#ec4899',
   40)
on conflict (slug) do update set
  name              = excluded.name,
  tagline           = excluded.tagline,
  description       = excluded.description,
  difficulty        = excluded.difficulty,
  estimated_hours   = excluded.estimated_hours,
  recommended_stack = excluded.recommended_stack,
  monetization_notes= excluded.monetization_notes,
  phases            = excluded.phases,
  category          = excluded.category,
  banner_color      = excluded.banner_color,
  order_index       = excluded.order_index,
  visible           = excluded.visible;

notify pgrst, 'reload schema';
