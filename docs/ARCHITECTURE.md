# NROS · Architecture

> Tag: **NROS_KERNEL_V1_GENESIS**

## 1. System architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE PAGES                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                  Next.js 15 (Edge runtime)                         │  │
│  │                                                                    │  │
│  │   ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐ │  │
│  │   │  Marketing /    │   │   Dashboard      │   │   Auth Pages   │ │  │
│  │   │   landing (○)   │   │   (RSC, ƒ)       │   │   (○ static)   │ │  │
│  │   └─────────────────┘   └────────┬─────────┘   └───────┬────────┘ │  │
│  │                                  │                     │          │  │
│  │   ┌─────────────────────────────┴───────────────────┐ │          │  │
│  │   │           Edge API Routes                       │ │          │  │
│  │   │  /api/agents/genubra   (stream)                 │ │          │  │
│  │   │  /api/workflows        (POST → OBLISK)          │ │          │  │
│  │   │  /auth/sign-out        (route handler)          │ │          │  │
│  │   └────────────────────────┬────────────────────────┘ │          │  │
│  │                            │                          │          │  │
│  │   ┌────────────────────────┴──────────────────────────┴────────┐ │  │
│  │   │  Middleware (edge) — session refresh + route gating       │ │  │
│  │   └────────────────────┬──────────────────────────────────────┘ │  │
│  └─────────────────────────┼─────────────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              ▼                              ▼
   ┌────────────────────┐         ┌────────────────────────┐
   │  Supabase          │         │  AI Providers          │
   │  ────────────      │         │  ────────────          │
   │  Postgres + RLS    │         │  Anthropic API         │
   │  Auth (JWT)        │         │  OpenAI API            │
   │  Realtime channels │         │  (router selectable)   │
   └────────────────────┘         └────────────────────────┘
```

## 2. Data flow

```
                             ┌──────────────────────────┐
                             │  Operator (browser)      │
                             └──────────┬───────────────┘
                                        │  HTTPS
                                        ▼
                       ┌─────────────────────────────────┐
                       │     CF Pages middleware         │
                       │   updateSession() → JWT cookie  │
                       └─────────────┬───────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────────┐
              ▼                      ▼                          ▼
   ┌────────────────────┐ ┌────────────────────┐    ┌──────────────────────┐
   │  Server Component  │ │  Server Action     │    │  /api/agents/genubra │
   │  page.tsx          │ │  acceptMission(),  │    │  (streamed)          │
   │                    │ │  completeMission() │    │                      │
   └─────────┬──────────┘ └────────┬───────────┘    └──────────┬───────────┘
             │                     │                            │
             ▼                     ▼                            ▼
   ┌────────────────────┐ ┌────────────────────┐    ┌──────────────────────┐
   │  services/*        │ │  services/*        │    │  agents/genubra.ts   │
   │  (RLS-scoped)      │ │  + xp-service      │    │  → ai-router         │
   └─────────┬──────────┘ └────────┬───────────┘    └──────────┬───────────┘
             │                     │                            │
             ▼                     ▼                            ▼
   ┌────────────────────────────────────────────┐    ┌──────────────────────┐
   │       Supabase (PostgREST + RLS)           │    │  Anthropic / OpenAI  │
   │  reads: anon JWT     writes: service-role  │    │  (text stream)       │
   └────────────────────────────────────────────┘    └──────────┬───────────┘
                              │                                  │
                              │ realtime broadcast               │ logged →
                              ▼                                  ▼
                   ┌────────────────────┐              ┌──────────────────┐
                   │  hooks/use-operator│              │  ai_requests     │
                   │  (live XP/rank)    │              │  (LEGVCY)        │
                   └────────────────────┘              └──────────────────┘
```

## 3. Service relationships

```
                ┌────────────────────────┐
                │  operator-service.ts   │◄─────────┐
                └────────┬───────────────┘          │
                         │ getCurrentOperator()     │
                         ▼                          │
   ┌────────────────────────────────┐               │
   │  All page.tsx + API routes     │               │
   └────────┬───────────────────────┘               │
            │                                       │
            │     ┌──────────────────────────┐      │
            ├────►│  mission-service.ts      ├──────┤
            │     │  (accept/complete)       │      │
            │     └────────┬─────────────────┘      │
            │              │ awardXp()              │
            │              ▼                        │
            │     ┌──────────────────────────┐      │
            │     │  xp-service.ts           │      │
            │     │  (delta + rank promote)  │      │
            │     └────────┬─────────────────┘      │
            │              │ updates                │
            │              ▼                        │
            │     ┌──────────────────────────┐      │
            │     │  operator_profiles       │──────┘
            │     │  + xp_logs (LEGVCY)      │
            │     │  + notifications         │
            │     └──────────────────────────┘
            │
            │     ┌──────────────────────────┐
            ├────►│  workflow-service.ts     │
            │     │  createWorkflowFrom-     │
            │     │  Objective()             │
            │     └────────┬─────────────────┘
            │              │ obliskDecompose()
            │              ▼
            │     ┌──────────────────────────┐
            │     │  agents/oblisk.ts        │
            │     │  (zod-validated JSON)    │
            │     └────────┬─────────────────┘
            │              │ aiComplete()
            │              ▼
            │     ┌──────────────────────────┐
            │     │  agents/ai-router.ts     │
            │     │  (provider + telemetry)  │
            │     └────────┬─────────────────┘
            │              │
            │     ┌────────┴─────────┐
            │     ▼                  ▼
            │ ┌────────┐       ┌──────────┐
            │ │Anthrop.│       │ OpenAI   │
            │ └────────┘       └──────────┘
            │
            │     ┌──────────────────────────┐
            ├────►│  squad-service.ts        │
            │     └──────────────────────────┘
            │
            │     ┌──────────────────────────┐
            └────►│  leaderboard-service.ts  │
                  └──────────────────────────┘
```

## 4. Layer attribution — what becomes what

### NROS core (the operating shell)
The platform itself. Owns identity, navigation, mechanics, persistence APIs.
- `src/app/*` — App Router shell, route groups, layouts
- `src/components/ui/*` and `src/components/nros/*` (except GENUBRA panel)
- `src/services/operator-service.ts`
- `src/services/mission-service.ts`
- `src/services/xp-service.ts`
- `src/services/squad-service.ts`
- `src/services/leaderboard-service.ts`
- `src/lib/supabase/*` and `src/middleware.ts`
- Tables: `operator_profiles`, `ranks`, `missions`, `mission_progress`, `squads`, `squad_members`, `achievements`

### GENUBRA core (the intelligence)
The strategic AI persona and its surface.
- `src/agents/genubra.ts` — persona spec + system prompt
- `src/agents/ai-router.ts` — provider routing, streaming, telemetry
- `src/agents/providers/{anthropic,openai}.ts`
- `src/components/nros/genubra-panel.tsx` + `genubra-panel-context.tsx`
- `src/app/api/agents/genubra/route.ts`

### OBLISK core (the manifestation engine)
The decomposition compiler — objective → executable structure.
- `src/agents/oblisk.ts` — system prompt + zod plan schema + plan flattener
- `src/services/workflow-service.ts` — persistence + XP grant on forge
- `src/app/api/workflows/route.ts`
- `src/app/(dashboard)/workflows/*` — list, new, detail UIs
- Tables: `workflows`, `workflow_steps`

### LEGVCY layer (the immutable record)
Append-only history that survives operator/session lifetime. Powers
analytics, replay, audit, and post-hoc intelligence.
- `xp_logs` — every XP delta with reason + source
- `ai_requests` — every GENUBRA / OBLISK call (provider, model, token-deltas, prompt excerpt)
- `operator_achievements` — unlocks
- `notifications` — operator-visible system events

LEGVCY tables are written by services but never mutated/deleted by user
actions. They are the canonical "what happened" stream.

## 5. Scalability risks

| Risk                                                                | Mitigation                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Edge runtime cold-start on AI calls                                 | Keep system prompts in-bundle (no remote fetch); enable Anthropic prompt caching once token volume justifies it |
| Synchronous OBLISK call blocks user up to 30-60s                    | Move to background job (Cloudflare Queues / Supabase Edge Function) and stream progress to UI via Realtime once volume grows |
| `leaderboard_global` view recomputes on every read                  | Materialize with periodic refresh once user count crosses ~10K         |
| `ai_requests` grows unbounded                                       | Add 90-day retention policy + downsample to daily aggregates           |
| `xp_logs` per-operator scan in profile page                         | Already indexed; add operator-level aggregate view if profile slow     |
| Service-role usage in `xp-service` and signup                       | Keep narrow; never expand without an audit trail in `ai_requests`-style |
| `workflow_steps` parent_id tree depth (currently 2 levels)          | Fine for V1 — add CTE-based materialized hierarchy if depth grows      |
| Realtime channels per operator (`use-operator`)                     | Pool channels by squad/global once concurrent operators > ~1K          |

## 6. Technical debt risks

| Item                                                                  | Severity | Plan                                                                    |
| --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| Hand-written `Database` type doesn't satisfy supabase generic schema  | M        | Generate via `supabase gen types typescript --project-id … > src/types/database.ts` and re-add `<Database>` generic on clients |
| Read-site `as Type` casts compensate for missing generic              | M        | Fixed automatically by above                                            |
| Sign-up uses service-role for profile insert                          | L        | Acceptable; document in DEPLOYMENT.md and audit before opening signups  |
| OBLISK plan parent-id resolution uses O(n²) lookup                    | L        | Plans are small (~25 nodes); revisit if plan size > 200                 |
| No tests                                                              | H        | Add Playwright smoke + Vitest unit tests for `agents/oblisk` JSON parser before opening to public |
| ESLint not configured beyond Next defaults                            | L        | Add stricter rules + Prettier in CI                                     |
| No rate limit on `/api/agents/genubra` or `/api/workflows`            | H        | Add per-operator token-bucket on the edge before public launch          |
| `ai_requests` doesn't capture token counts                            | M        | Wire SDK response usage into telemetry insert                           |
| No cron / scheduled job runner wired up                               | M        | Add Cloudflare Cron Trigger for daily aggregations + leaderboard snapshots |
| GENUBRA + OBLISK have no tool-use (model can't act on operator's behalf) | M    | Add tool-use loop in V2 — let GENUBRA accept missions / forge workflows |

See [ROADMAP.md](./ROADMAP.md) for sequenced fixes.
