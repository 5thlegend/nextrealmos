# NROS · Roadmap (V2 Federation)

> Tag: **NROS_KERNEL_V2_FEDERATION**

## What just shipped (V2)

- Five-layer architecture: GENUBRA · NROS · OBLISK · LEGVCY · REALMS
- Realm registry (`realms`) + per-realm API keys (`realm_api_keys`)
- Operator-realm membership graph (`operator_realms`)
- Federated event feed (`transmissions`) with realtime-ready RLS
- `realm_id` columns on `xp_logs`, `ai_requests`, `notifications`, `missions`, `workflows`
- Federation API: `POST/GET /api/federation/realms`, `POST/GET /api/federation/transmissions`,
  `POST /api/federation/xp`, `GET /api/federation/operators/[callsign]`
- Bearer-token auth (`nros_pk_…`, sha256-hashed, scope-tagged)
- `@nros/sdk` package — TypeScript client realms install
- `/realms`, `/realms/new`, `/realms/[slug]`, `/transmissions` UI surfaces
- Sidebar nav: Transmissions + Realms surfaced ahead of Missions
- All 4 docs pivoted + 3 new docs: `FEDERATION_PROTOCOL`, `REALM_SPEC`, `SDK`

## Band A — federation hardening (do before opening to public)

| # | Item                                                                       | Effort | Notes                                                                 |
|---|----------------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | Per-key rate limiting on `/api/federation/*` (Cloudflare KV token bucket)  | M      | Prevent rogue realm from overwhelming the federation                  |
| 2 | `realm_xp_budgets` table + enforcement in `xp.award`                       | M      | Anti-inflation: daily cap per realm                                   |
| 3 | API key revocation UI on `/realms/[slug]` (currently only owner-readable)  | S      | Simple table + Revoke button                                          |
| 4 | Multiple-key issuance UI (named keys for separate environments)            | S      |                                                                       |
| 5 | Admin moderation gate on realm registration (PENDING → ACTIVE by review)   | M      | Add `/admin/realms` for first-party admin operator                    |
| 6 | Per-operator transmissions feed in dashboard (filter by realm membership)  | S      | Today the feed is global                                              |
| 7 | Realtime subscription on `transmissions` for live dashboard updates        | S      | Supabase Realtime is already RLS-aware                                |
| 8 | Token-count capture in `ai_requests` (carry-over from V1)                  | S      |                                                                       |

## Band B — federation feature completion

| # | Item                                                                       | Effort | Notes                                                                 |
|---|----------------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | Per-realm leaderboard view (`leaderboard_realm`)                           | S      | View on `operator_realms.realm_xp DESC`                               |
| 2 | Operator → realm "join" flow (currently only auto-joined via XP grants)    | M      | Add explicit join button on `/realms/[slug]` for active realms        |
| 3 | Realm icons + banners (column exists, no upload UI yet)                    | S      | Supabase Storage                                                      |
| 4 | Realm health dashboard (last_used_at on keys, last transmission)           | S      |                                                                       |
| 5 | Achievement triggers from realm transmissions (e.g. unlock on first push)  | M      | Map kinds → achievement codes                                          |
| 6 | Idempotent XP grants via `source_id` dedup                                 | S      | Add unique constraint `(realm_id, source_id)` on `xp_logs`            |

## Band C — V3 SSO + cross-realm intelligence

| # | Item                                                                       | Effort | Notes                                                                 |
|---|----------------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | NROS issues short-lived JWTs realms can verify (true SSO)                  | L      | Replaces "operator types callsign" pattern with proper auth handoff   |
| 2 | GENUBRA queries enriched with cross-realm transmissions context            | M      | Already has the table; needs prompt-builder update                    |
| 3 | OBLISK can scaffold a realm (objective → starter codebase + auto-register) | L      | The headline V3 vector — OBLISK as realm-manifestation engine         |
| 4 | Federated achievement system (achievements unlocked by N realms)            | M      |                                                                       |
| 5 | Operator settings: which realms can award XP / which see my activity        | M      | Privacy controls                                                       |

## Band D — platform & ecosystem

| # | Item                                                                       | Effort | Notes                                                                 |
|---|----------------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | Public npm publish of `@nros/sdk`                                          | S      | Once API surface stabilizes (target V2.2)                              |
| 2 | Webhook events on rank promotion / realm registration                      | M      |                                                                       |
| 3 | Self-hosted NROS guide (some realms will want their own federation)        | M      |                                                                       |
| 4 | Realm directory at `/realms` becomes public (no-auth) browse               | S      |                                                                       |
| 5 | OAuth-style "Connect with NROS" button realms can embed                    | M      |                                                                       |

## Carry-over from V1

| Item                                                                  | Severity | Status |
| --------------------------------------------------------------------- | -------- | ------ |
| Per-operator rate limiting on `/api/agents/genubra` and `/api/workflows` | H     | Still open |
| Wire `input_tokens` / `output_tokens` capture in `ai-router.ts`       | M        | Still open |
| Playwright smoke tests                                                | H        | Still open |
| Vitest unit tests for `agents/oblisk.ts` JSON parser                  | S        | Still open |
| Regenerate `src/types/database.ts` via `supabase gen types`           | M        | Still open — need to include V2 tables |
| Stricter ESLint + Prettier in CI                                       | L        | Still open |
| Achievement triggers on mission/workflow events                        | M        | Still open |

## Unresolved placeholders (V2)

| System                          | What exists                                            | What's missing                                                       |
|---------------------------------|--------------------------------------------------------|----------------------------------------------------------------------|
| Multiple API keys per realm     | Schema supports it; `issueApiKey` works                | UI to issue/list/revoke from the dashboard                           |
| Realm `icon_url`                | Column exists                                          | Upload UI + display in registry list                                 |
| Realm join flow                 | XP grants auto-create membership rows                  | Explicit "Join realm" UI button + intent flow                        |
| Operator filter on transmissions feed | Service supports `operatorId` arg                | UI tab "All / Mine"                                                  |
| Realm-side missions             | Realms can push `MISSION_COMPLETED`; not store missions| Optional: realm-mission catalog mirroring NROS-core mission system    |
| SSO between realms              | None                                                   | V3 — JWT issuance + verification                                     |
