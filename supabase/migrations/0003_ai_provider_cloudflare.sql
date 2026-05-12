-- =====================================================================
--  V3 — extend ai_provider enum to include Cloudflare Workers AI
--  Used as the default free-tier provider during development/testing.
-- =====================================================================
do $$ begin
  alter type ai_provider add value if not exists 'cloudflare';
exception when duplicate_object then null; end $$;
