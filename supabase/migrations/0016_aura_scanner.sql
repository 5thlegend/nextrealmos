-- =====================================================================
--  V3.11 — AURA SCANNER (Day 3-5 of FOUNDATION blueprint)
--  Viral acquisition engine. Public users paste a URL, GENUBRA scores
--  the aura across 5 axes, returns one specific top-fix, generates a
--  shareable token-link. Each scan = a lead.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists aura_scans (
  id              uuid primary key default gen_random_uuid(),
  url             text not null,
  url_normalized  text not null,             -- lowercased + trailing slash stripped, for dedupe
  handle          text,                       -- optional social handle if input was @x
  email           text,                       -- lead capture
  ip_hash         text,                       -- sha256(ip + day) — abuse limit, no raw IPs

  -- Computed scoring
  aura_score      integer,                    -- 0-100 overall
  axis_scores     jsonb not null default '{}'::jsonb,  -- { aesthetics, conversion, positioning, signal, depth }
  strengths       jsonb not null default '[]'::jsonb,  -- string[]
  weaknesses      jsonb not null default '[]'::jsonb,  -- string[]
  top_fix         text,                       -- the single highest-leverage fix
  vibe            text,                       -- one-line summary
  raw_excerpt     text,                       -- short page text excerpt for context

  -- Sharing
  share_token     text not null unique default substring(md5(random()::text || clock_timestamp()::text), 1, 14),

  -- State
  status          text not null default 'PENDING',     -- PENDING | COMPLETE | FAILED
  error           text,
  model           text,                                  -- which AI provider/model produced the scan
  duration_ms     integer,

  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_aura_email     on aura_scans(email)         where email is not null;
create index if not exists idx_aura_token     on aura_scans(share_token);
create index if not exists idx_aura_created   on aura_scans(created_at desc);
create index if not exists idx_aura_url_norm  on aura_scans(url_normalized);
create index if not exists idx_aura_score     on aura_scans(aura_score desc) where aura_score is not null;
create index if not exists idx_aura_status    on aura_scans(status);

-- ---------- RLS ----------
-- Result pages are PUBLIC (anyone with the share_token sees the score).
-- New scans are inserted via service role; no anon insert policy required.
alter table aura_scans enable row level security;

drop policy if exists "aura_token_readable" on aura_scans;
create policy "aura_token_readable" on aura_scans for select using (true);

-- ---------- Recent-scans view for the public Aura landing ----------
-- Strips email + ip_hash; surfaces share_token + score for "recently
-- scanned" social proof on the landing page.
create or replace view aura_recent_scans as
select
  share_token,
  url,
  aura_score,
  vibe,
  axis_scores,
  created_at
from aura_scans
where status = 'COMPLETE' and aura_score is not null
order by created_at desc
limit 20;

notify pgrst, 'reload schema';
