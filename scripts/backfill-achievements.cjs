#!/usr/bin/env node
/**
 * Retroactively evaluate achievements for every operator currently in the
 * federation. Idempotent — re-running is safe.
 *
 *   SUPABASE_PAT=... node scripts/backfill-achievements.cjs
 */
const https = require("https");

const ref = process.env.SUPABASE_PROJECT_REF || "pwmmoqoayhjonwhombbz";
const pat = process.env.SUPABASE_PAT || process.argv[2];
if (!pat) { console.error("SUPABASE_PAT required"); process.exit(1); }

function call(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      { hostname: "api.supabase.com", port: 443, path: `/v1/projects/${ref}/database/query`,
        method: "POST",
        headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let chunks = ""; res.on("data", c => chunks += c);
        res.on("end", () => {
          if (res.statusCode < 300) {
            try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
          } else reject(new Error(`${res.statusCode}: ${chunks.slice(0, 400)}`));
        });
      });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

(async () => {
  console.log("▸ Loading operators...");
  const ops = await call(`select id, callsign, xp from operator_profiles order by xp desc;`);
  console.log(`  ${ops.length} operators total`);

  let granted = 0;
  let already = 0;
  for (const op of ops) {
    const before = await call(`select count(*)::int as n from operator_achievements where operator_id = '${op.id}';`);
    const beforeN = before[0]?.n ?? 0;
    await call(`select nros_evaluate_achievements('${op.id}');`);
    const after = await call(`select count(*)::int as n from operator_achievements where operator_id = '${op.id}';`);
    const afterN = after[0]?.n ?? 0;
    const delta = afterN - beforeN;
    granted += delta;
    if (delta === 0) already += 1;
    console.log(`  · ${op.callsign.padEnd(20)} xp=${op.xp.toString().padStart(7)}  achievements ${beforeN}→${afterN}${delta > 0 ? `  (+${delta})` : ""}`);
  }
  console.log(`\n▸ Granted ${granted} new achievements across ${ops.length} operators (${already} already complete).`);
})();
