# NROS · KERNEL V1 — System Overview

> Tag: **NROS_KERNEL_V1_GENESIS** · First-stability checkpoint.

NROS (Next Realm Operating System) is an operator coordination platform that
unifies missions, ranks, AI strategy, and workflow execution into one tactical
surface. **GENUBRA** is the intelligence layer; **OBLISK** is the workflow
manifestation engine; **NROS** is the operating shell that hosts both. A
fourth conceptual layer — **LEGVCY** — captures durable artifacts (XP ledger,
notifications, AI request log) that survive long after the originating session.

## Layered model

| Layer       | Responsibility                                                                                       | Lives in                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **NROS**    | Shell, auth, navigation, mission/squad/leaderboard mechanics, real-time UX                           | `src/app/*`, `src/components/*`, `src/services/{operator,mission,squad,leaderboard,xp}-service.ts` |
| **GENUBRA** | Strategic intelligence — goal analysis, mission generation, monetization, progression strategy       | `src/agents/genubra.ts`, `src/agents/ai-router.ts`, `/api/agents/genubra`, `components/nros/genubra-panel.tsx` |
| **OBLISK**  | Workflow decomposition — objective → phases → tasks/automations/decisions, with stack + monetization | `src/agents/oblisk.ts`, `src/services/workflow-service.ts`, `/api/workflows`, `app/(dashboard)/workflows/*` |
| **LEGVCY**  | Append-only history — XP ledger, AI request telemetry, achievements, notifications                   | `xp_logs`, `ai_requests`, `notifications`, `operator_achievements` tables                          |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full diagrams and the
core-attribution map.

## Stack at a glance

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | Next.js 15 (App Router · RSC), React 19, TypeScript, Tailwind, ShadCN, Framer Motion |
| Backend  | Supabase (Postgres · Auth · Realtime · RLS), Edge runtime API routes    |
| AI       | Anthropic SDK + OpenAI SDK behind `agents/ai-router.ts`                 |
| Hosting  | Cloudflare Pages (`nextrealmos.pages.dev`) via `@cloudflare/next-on-pages` |

## Current state (V1 GENESIS)

Stable, runnable, deployable. 18 routes, 14 tables, edge-runtime AI APIs,
RLS-enforced data access, JSON-schema'd OBLISK output. See:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — diagrams, layer attribution, scalability notes
- [DATABASE.md](./DATABASE.md) — schema, RLS policies, migrations
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Cloudflare Pages + Supabase setup
- [ROADMAP.md](./ROADMAP.md) — known debt, placeholders, post-V1 priorities
- [INVENTORIES.md](./INVENTORIES.md) — folder tree, deps, env, route map, feature matrix
