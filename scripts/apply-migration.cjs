#!/usr/bin/env node
/**
 * Apply a SQL file to the NROS Supabase project via the Management API.
 *
 *   node scripts/apply-migration.cjs <path-to-sql>
 *
 * Reads SUPABASE_PROJECT_REF and SUPABASE_PAT from env. Defaults to the
 * NROS production project ref if env vars are missing.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ref = process.env.SUPABASE_PROJECT_REF || "pwmmoqoayhjonwhombbz";
const pat = process.env.SUPABASE_PAT || process.argv[3];
const sqlPath = process.argv[2];

if (!sqlPath) {
  console.error("usage: apply-migration.cjs <path-to-sql> [pat]");
  process.exit(1);
}
if (!pat) {
  console.error("error: SUPABASE_PAT env (or 2nd arg) required");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlPath), "utf8");
const body = JSON.stringify({ query: sql });

const req = https.request(
  {
    hostname: "api.supabase.com",
    port: 443,
    path: `/v1/projects/${ref}/database/query`,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  },
  (res) => {
    let chunks = "";
    res.on("data", (c) => (chunks += c));
    res.on("end", () => {
      console.log(`status: ${res.statusCode}`);
      console.log(chunks.slice(0, 2000));
      process.exit(res.statusCode && res.statusCode < 300 ? 0 : 1);
    });
  },
);
req.on("error", (e) => {
  console.error("request error:", e.message);
  process.exit(1);
});
req.write(body);
req.end();
