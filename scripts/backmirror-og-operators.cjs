#!/usr/bin/env node
/**
 * One-shot back-mirror: pull every OG operator and register them in the
 * canonical NROS callsign registry via nros_register_realm_operator().
 *
 * Reads OG (tccpzvmzkimvkjrzgsrs) → upserts into NROS (pwmmoqoayhjonwhombbz).
 *
 *   SUPABASE_PAT=... node scripts/backmirror-og-operators.cjs
 */
const https = require("https");
const crypto = require("crypto");

const PAT = process.env.SUPABASE_PAT;
if (!PAT) { console.error("SUPABASE_PAT required"); process.exit(1); }

const NROS = "pwmmoqoayhjonwhombbz";
const OG   = "tccpzvmzkimvkjrzgsrs";
const OG_REALM_SLUG = "nro-operator-core";

function sql(projectRef, query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request(
      { hostname: "api.supabase.com", port: 443, path: `/v1/projects/${projectRef}/database/query`,
        method: "POST",
        headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let chunks = ""; res.on("data", c => chunks += c);
        res.on("end", () => {
          if (res.statusCode < 300) {
            try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
          } else reject(new Error(`${res.statusCode}: ${chunks.slice(0, 500)}`));
        });
      });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

const sha256 = (s) => crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
const escSql = (s) => String(s).replace(/'/g, "''");

(async () => {
  console.log("▸ Resolving NROS realm UUID for /nro-operator-core ...");
  const realms = await sql(NROS, `select id, slug from realms where slug ilike '${OG_REALM_SLUG}' or slug ilike 'nextrealmoperators' limit 1;`);
  if (realms.length === 0) {
    console.error("Could not find OG's realm in NROS realms registry. Aborting.");
    process.exit(1);
  }
  const ogRealmId = realms[0].id;
  console.log(`  Found: ${realms[0].slug} → ${ogRealmId}`);

  console.log("\n▸ Loading all OG operators + their auth emails ...");
  const ops = await sql(OG, `
    select o.id, o.handle, o.display_name, o.rank, o.xp, o.city, o.state, o.created_at, au.email
      from operators o
      left join auth.users au on au.id = o.id
     order by o.created_at desc;
  `);
  console.log(`  ${ops.length} OG operators total`);

  let created = 0, linked = 0, already = 0, failed = 0;

  for (const o of ops) {
    const email_hash = o.email ? `'${escSql(sha256(o.email))}'` : "null";
    const display = o.display_name ? `'${escSql(o.display_name)}'` : "null";
    const meta = JSON.stringify({
      source_realm: OG_REALM_SLUG,
      city: o.city, state: o.state,
      rank_at_mirror: o.rank, xp_at_mirror: o.xp,
    }).replace(/'/g, "''");

    try {
      // Check pre-state
      const before = await sql(NROS, `select id from operator_external_identities where realm_id='${ogRealmId}' and external_uid='${escSql(o.id)}' limit 1;`);
      const wasMirrored = before.length > 0;

      const result = await sql(NROS, `
        select nros_register_realm_operator(
          '${ogRealmId}'::uuid,
          '${escSql(o.id)}',
          '${escSql(o.handle)}',
          ${email_hash},
          ${display},
          '${meta}'::jsonb
        ) as op_id;
      `);
      const opId = result[0]?.op_id;

      if (wasMirrored) { already++; console.log(`  · ${o.handle.padEnd(20)} → already mirrored (${opId})`); continue; }

      // Was a new row created or did we attach to an existing NROS row?
      const linkedRow = await sql(NROS, `select source_realm_id, claimed_at from operator_profiles where id='${opId}';`);
      const isNewMirror = linkedRow[0]?.source_realm_id === ogRealmId;
      if (isNewMirror) { created++; console.log(`  ✓ ${o.handle.padEnd(20)} → CREATED  (${opId})`); }
      else             { linked++;  console.log(`  ↪ ${o.handle.padEnd(20)} → LINKED to existing NROS op (${opId})`); }
    } catch (e) {
      failed++;
      console.error(`  ✗ ${o.handle.padEnd(20)} → FAILED: ${e.message.slice(0, 200)}`);
    }
  }

  console.log("");
  console.log(`▸ DONE  · ${created} created  · ${linked} linked  · ${already} already-mirrored  · ${failed} failed`);
  console.log("\n▸ NROS canonical operator_profiles now:");
  const after = await sql(NROS, `select callsign, xp, source_realm_id is not null as mirrored, user_id is not null as claimed from operator_profiles order by xp desc nulls last;`);
  for (const r of after) {
    console.log(`  ${r.callsign.padEnd(24)} xp=${String(r.xp ?? 0).padStart(6)}  ${r.mirrored ? "[mirrored]" : "         "} ${r.claimed ? "[claimed]" : "         "}`);
  }
})();
