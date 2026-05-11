# NROS · Roadmap

> Tag: **NROS_KERNEL_V1_GENESIS**

This is the post-V1 sequencing. Items are grouped by intent — pick from the
top of each band. Move items into the *In flight* section as you start them.

## In flight

_(none — V1 GENESIS just shipped)_

## Band A — production hardening (do before opening to public)

| # | Item                                                                | Effort | Notes                                                                 |
|---|---------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | Per-operator rate limiting on `/api/agents/genubra` and `/api/workflows` | M  | Use Cloudflare Workers KV or D1 for token-bucket counters             |
| 2 | Wire `input_tokens` / `output_tokens` capture in `ai-router.ts`     | S      | Anthropic + OpenAI both expose usage on response; insert post-stream  |
| 3 | Playwright smoke: signup → mission complete → workflow forge        | M      | Run against preview deploy in CI                                      |
| 4 | Vitest unit tests for `agents/oblisk.ts` JSON parser + zod schema   | S      | Catches model regressions on output format                            |
| 5 | Regenerate `src/types/database.ts` via `supabase gen types`         | S      | Re-add `<Database>` generic on supabase clients; remove `as` casts    |
| 6 | Auth redirect URL allowlist in Supabase                             | S      | One-line config; required for OAuth/magic-link flows later            |
| 7 | Stricter ESLint + Prettier in CI                                    | S      |                                                                       |
| 8 | Error boundary on dashboard layout                                  | S      | Catch RSC throws and present a tactical "signal lost" surface         |

## Band B — feature completion (placeholder → real)

| # | Item                                                                | Effort | Notes                                                                 |
|---|---------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | Achievement triggers on mission/workflow events                     | M      | Table + UI exist; need the unlock logic in `xp-service` and a UI page |
| 2 | Squad XP aggregation + squad leaderboard                            | M      | View `leaderboard_squads` joining `squad_members` and `operator_profiles` |
| 3 | OBLISK step-status mutation (kanban: PENDING → IN_PROGRESS → COMPLETED) | M  | Drag/drop on `workflow_steps`, server action behind RLS               |
| 4 | Notifications dropdown (header bell) reading from `notifications`   | S      | Realtime channel for unread count                                     |
| 5 | Operator avatar upload to Supabase Storage                          | S      |                                                                       |
| 6 | Mission creation by operators (squad-scoped)                        | M      | Currently only seeded missions exist                                  |
| 7 | Squad join flow (currently you only see the list; no join button)   | S      | Add `joinSquad` action button on `/squads`                            |
| 8 | Workflow archive + reactivate                                       | S      | Status enum already supports it                                       |

## Band C — intelligence expansion

| # | Item                                                                | Effort | Notes                                                                 |
|---|---------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | GENUBRA tool-use: model can `accept_mission`, `forge_workflow`      | L      | Tool-use loop in `agents/genubra.ts` + server-side dispatch table     |
| 2 | OBLISK iterative refinement (operator can ask "expand phase 2")     | M      | Pass plan back as context; persist diff                               |
| 3 | Anthropic prompt caching on GENUBRA system prompt + operator context| S      | Big cost win — system prompt is stable, briefing changes slowly       |
| 4 | Provider failover (Anthropic → OpenAI on 5xx)                       | S      | Add try/catch in `ai-router` with one-shot fallback                   |
| 5 | Daily LEGVCY aggregation (Cloudflare Cron Trigger)                  | M      | Roll `xp_logs` and `ai_requests` into daily/weekly buckets            |

## Band D — platform expansion

| # | Item                                                                | Effort | Notes                                                                 |
|---|---------------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| 1 | Lift each domain into `src/modules/<domain>/`                       | M      | Trigger: any service file > 5 sub-files. See `src/modules/README.md`  |
| 2 | Public operator profile pages (`/op/[callsign]`)                    | S      | Read-only; show rank, public mission count, squad                     |
| 3 | API tokens for external automations                                 | M      | Personal tokens issued by operator, stored hashed                     |
| 4 | Webhook events on rank promotion / workflow completion              | M      |                                                                       |
| 5 | Mobile PWA shell                                                    | S      | Manifest + service worker; current UI already responsive              |

## Known technical debt (rolling list)

| Item                                                                  | Severity |
| --------------------------------------------------------------------- | -------- |
| Hand-written `Database` type → no strict client typing                | M        |
| Read-site `as Type` casts                                             | M        |
| No tests                                                              | H        |
| No rate limiting                                                      | H        |
| Token counts not captured in telemetry                                | M        |
| Sign-up profile insert via service-role                               | L        |
| OBLISK plan parent-id resolution is O(n²) (small N today)             | L        |
| ESLint not strict                                                     | L        |
| No cron jobs scheduled                                                | M        |
| GENUBRA / OBLISK have no tool-use                                     | M        |

## Unresolved placeholder systems

| System                          | What exists today                                          | What's missing                                                  |
|---------------------------------|------------------------------------------------------------|-----------------------------------------------------------------|
| Achievements                    | Table, seeded rows, RLS                                    | UI page, unlock triggers, notification on award                 |
| Notifications                   | Table, RLS, written by `xp-service` on rank promotion      | UI dropdown, realtime unread count, mark-read action            |
| Squad join                      | `joinSquad` service exists                                 | UI button on `/squads/[id]` (and a `/squads/[id]` page)         |
| Squad detail page               | Service `getSquadWithMembers` exists                       | `/squads/[id]/page.tsx`                                          |
| Workflow step status updates    | Service `updateStepStatus` exists                          | UI affordance on workflow detail                                |
| Mission creation by operators   | Service `acceptMission` exists; `missions` is read-mostly  | Operator-authored mission creation UI + RLS write policy        |
| Modules folder                  | `src/modules/README.md` placeholder                        | First domain to graduate (likely workflows/OBLISK)              |
| `hooks/use-operator`            | Realtime subscription wired                                | Not yet consumed by any component (topbar still server-rendered)|
