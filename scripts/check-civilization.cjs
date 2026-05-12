#!/usr/bin/env node
/**
 * Quick health check: counts achievements + wonders seeded in NROS Supabase.
 *
 *   SUPABASE_PAT=... node scripts/check-civilization.cjs
 */
const https = require("https");

const ref = process.env.SUPABASE_PROJECT_REF || "pwmmoqoayhjonwhombbz";
const pat = process.env.SUPABASE_PAT || process.argv[2];
if (!pat) { console.error("SUPABASE_PAT required"); process.exit(1); }

const sql = `
select 'achievements' as kind, count(*)::int as n from achievements
union all select 'wonders', count(*)::int from wonders
union all select 'civilization_event_types', count(*)::int from civilization_event_types
union all select 'realms_active', count(*)::int from realms where status='ACTIVE'
union all select 'realms_with_wonders', count(distinct realm_id)::int from wonders;
`;

const body = JSON.stringify({ query: sql });
const req = https.request(
  { hostname: "api.supabase.com", port: 443, path: `/v1/projects/${ref}/database/query`,
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
  (res) => {
    let chunks = ""; res.on("data", c => chunks += c);
    res.on("end", () => {
      console.log(`status: ${res.statusCode}`);
      try { console.log(JSON.stringify(JSON.parse(chunks), null, 2)); } catch { console.log(chunks); }
      process.exit(res.statusCode < 300 ? 0 : 1);
    });
  });
req.on("error", e => { console.error(e.message); process.exit(1); });
req.write(body); req.end();
