#!/usr/bin/env node
/**
 * Cleanup pass after the first OG back-mirror.
 *
 * Problems found:
 *  1) Existing NROS-native operators have email_hash = null (column added
 *     in 0015 after they signed up), so the email-dedupe path missed them.
 *  2) GENERAL_DANK (NROS-native) and generaldank (OG mirror) are both in
 *     operator_profiles. Should be one row.
 *  3) The RPC's callsign check needs an explicit citext cast so text→citext
 *     comparison is case-insensitive (PG implicit cast goes the other way).
 *
 * This script:
 *  • Backfills email_hash from auth.users.email for all claimed profiles.
 *  • Merges the generaldank → GENERAL_DANK duplicate (move external_id +
 *    operator_realms link, delete the dup row).
 *  • Replaces nros_register_realm_operator with a citext-correct version.
 */
const https = require("https");
const crypto = require("crypto");

const PAT = process.env.SUPABASE_PAT;
if (!PAT) { console.error("SUPABASE_PAT required"); process.exit(1); }

const NROS = "pwmmoqoayhjonwhombbz";

function sql(q) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: q });
    const req = https.request(
      { hostname: "api.supabase.com", port: 443, path: `/v1/projects/${NROS}/database/query`,
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

(async () => {
  // 1) Backfill email_hash on every NROS-native (claimed) profile.
  console.log("▸ Backfilling email_hash on claimed profiles...");
  const claimed = await sql(`
    select op.id, op.callsign, au.email
      from operator_profiles op
      join auth.users au on au.id = op.user_id
     where op.email_hash is null;
  `);
  for (const r of claimed) {
    if (!r.email) continue;
    const h = sha256(r.email);
    await sql(`update operator_profiles set email_hash = '${h}' where id = '${r.id}';`);
    console.log(`  ✓ ${r.callsign.padEnd(20)} ← ${r.email.slice(0, 3)}…@…`);
  }

  // 2) Replace the RPC with a citext-correct callsign comparison.
  console.log("\n▸ Patching nros_register_realm_operator (citext-correct)...");
  await sql(`
    create or replace function nros_register_realm_operator(
      p_realm_id      uuid,
      p_external_uid  text,
      p_callsign      text,
      p_email_hash    text default null,
      p_display_name  text default null,
      p_metadata      jsonb default '{}'::jsonb
    ) returns uuid
    language plpgsql
    security definer
    as $func$
    declare
      v_op_id uuid;
    begin
      if p_realm_id is null or p_external_uid is null or coalesce(p_callsign, '') = '' then
        raise exception 'nros_register_realm_operator: realm_id + external_uid + callsign required';
      end if;

      -- 1) Already linked?
      select operator_id into v_op_id
        from operator_external_identities
       where realm_id = p_realm_id and external_uid = p_external_uid
       limit 1;
      if v_op_id is not null then
        return v_op_id;
      end if;

      -- 2) Match by email_hash
      if p_email_hash is not null then
        select id into v_op_id from operator_profiles where email_hash = p_email_hash limit 1;
      end if;

      -- 3) Match by callsign with explicit citext cast (case-insensitive)
      if v_op_id is null then
        select id into v_op_id from operator_profiles where callsign = p_callsign::citext limit 1;
      end if;

      -- 4) Create new mirrored operator
      if v_op_id is null then
        insert into operator_profiles (callsign, source_realm_id, email_hash, display_name, xp)
        values (p_callsign, p_realm_id, p_email_hash, p_display_name, 0)
        returning id into v_op_id;
      else
        update operator_profiles set
          email_hash = coalesce(email_hash, p_email_hash),
          display_name = coalesce(display_name, p_display_name)
        where id = v_op_id;
      end if;

      insert into operator_external_identities (operator_id, realm_id, external_uid, email_hash, display_name, metadata)
      values (v_op_id, p_realm_id, p_external_uid, p_email_hash, p_display_name, coalesce(p_metadata, '{}'::jsonb))
      on conflict (realm_id, external_uid) do nothing;

      insert into operator_realms (operator_id, realm_id, joined_at)
      values (v_op_id, p_realm_id, now())
      on conflict (operator_id, realm_id) do nothing;

      return v_op_id;
    end
    $func$;
  `);
  console.log("  ✓ RPC updated");

  // 3) Merge generaldank → GENERAL_DANK
  console.log("\n▸ Merging generaldank → GENERAL_DANK...");
  const merge = await sql(`
    select
      (select id from operator_profiles where callsign = 'GENERAL_DANK' and user_id is not null limit 1) as keep_id,
      (select id from operator_profiles where callsign = 'generaldank' and user_id is null limit 1) as drop_id;
  `);
  const keep_id = merge[0]?.keep_id;
  const drop_id = merge[0]?.drop_id;

  if (keep_id && drop_id && keep_id !== drop_id) {
    // Move external identities
    await sql(`update operator_external_identities set operator_id = '${keep_id}' where operator_id = '${drop_id}';`);
    // Move realm memberships (skip duplicates)
    await sql(`
      insert into operator_realms (operator_id, realm_id, joined_at, realm_xp, realm_metadata, last_active_at)
      select '${keep_id}', realm_id, joined_at, realm_xp, realm_metadata, last_active_at
        from operator_realms where operator_id = '${drop_id}'
      on conflict (operator_id, realm_id) do update set
        realm_xp = greatest(operator_realms.realm_xp, excluded.realm_xp);
      delete from operator_realms where operator_id = '${drop_id}';
    `);
    // Move xp_logs (preserve history)
    await sql(`update xp_logs set operator_id = '${keep_id}' where operator_id = '${drop_id}';`);
    // Move transmissions
    await sql(`update transmissions set operator_id = '${keep_id}' where operator_id = '${drop_id}';`);
    // Move achievements
    await sql(`
      insert into operator_achievements (operator_id, achievement_id, awarded_at)
      select '${keep_id}', achievement_id, awarded_at from operator_achievements where operator_id = '${drop_id}'
      on conflict do nothing;
      delete from operator_achievements where operator_id = '${drop_id}';
    `);
    // Roll up XP onto the kept profile
    await sql(`
      update operator_profiles
         set xp = xp + (select coalesce(xp, 0) from operator_profiles where id = '${drop_id}'),
             email_hash = coalesce(email_hash, (select email_hash from operator_profiles where id = '${drop_id}')),
             display_name = coalesce(display_name, (select display_name from operator_profiles where id = '${drop_id}'))
       where id = '${keep_id}';
    `);
    // Delete duplicate
    await sql(`delete from operator_profiles where id = '${drop_id}';`);
    console.log(`  ✓ merged (${drop_id} → ${keep_id})`);
  } else {
    console.log(`  · nothing to merge (keep_id=${keep_id} drop_id=${drop_id})`);
  }

  // 4) Re-evaluate achievements for everyone (mirrored ops should now earn first-light marks)
  console.log("\n▸ Re-evaluating achievements for all operators...");
  await sql(`do $$ declare op record; begin for op in select id from operator_profiles loop perform nros_evaluate_achievements(op.id); end loop; end $$;`);

  // 5) Final state
  console.log("\n▸ Final canonical operator_profiles:");
  const after = await sql(`
    select op.callsign, op.xp,
           op.source_realm_id is not null as mirrored,
           op.user_id is not null as claimed,
           coalesce((select count(*)::int from operator_external_identities where operator_id = op.id), 0) as ext_links,
           op.email_hash is not null as has_email_hash
      from operator_profiles op
     order by xp desc nulls last;
  `);
  for (const r of after) {
    console.log(
      `  ${r.callsign.padEnd(24)} xp=${String(r.xp ?? 0).padStart(6)}  ` +
      `${r.mirrored ? "[mirrored]" : "         "} ${r.claimed ? "[claimed]" : "         "} ` +
      `${r.has_email_hash ? "[email]" : "       "} ext=${r.ext_links}`,
    );
  }
})();
