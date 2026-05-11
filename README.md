# NROS · KERNEL V1

**Next Realm Operating System** — operator coordination platform, mission system,
AI-assisted workflow engine, gamified builder ecosystem, and sovereign operational
dashboard. Powered by **GENUBRA** (intelligence layer) and **OBLISK** (workflow
manifestation engine).

> Production-grade kernel. Modular. Mobile-first. API-first. Deployable to Vercel.

---

## Stack

| Layer        | Tech                                                             |
| ------------ | ---------------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router · RSC), React 19, TypeScript              |
| Styling      | Tailwind CSS, ShadCN-style primitives, Framer Motion             |
| Backend      | Supabase (Postgres · Auth · Realtime · RLS)                      |
| AI           | Anthropic SDK + OpenAI SDK behind a provider-agnostic router     |
| Hosting      | Vercel                                                           |

---

## Quickstart

```bash
# 1. Install
npm install

# 2. Wire env
cp .env.example .env.local
# fill in Supabase URL + anon + service role keys, plus Anthropic / OpenAI keys

# 3. Apply schema
#    Option A: Supabase CLI
supabase link --project-ref YOUR_REF
supabase db push
#    Option B: paste supabase/migrations/0001_kernel_init.sql into SQL editor

# 4. Run
npm run dev   # http://localhost:3000
```

First run — sign up, choose a callsign, accept the onboarding mission, open the
GENUBRA panel (Brain icon, top-right), and forge your first OBLISK workflow.

---

## Architecture

```
src/
  app/
    (auth)/         sign-in, sign-up — public
    (dashboard)/    dashboard, missions, workflows, squads, leaderboard, operator
    api/
      agents/genubra/  POST  → streamed strategic intelligence
      workflows/       POST  → OBLISK decomposition
    auth/sign-out/route.ts
    operator/onboarding/page.tsx
  components/
    ui/             ShadCN-style primitives (button, card, input, etc.)
    nros/           NROS-specific: panel, stat, rank-bar, sidebar, topbar, GENUBRA panel
  modules/          (reserved for domain modules once any service grows past 5 files)
  lib/
    supabase/       client.ts · server.ts · middleware.ts
    env.ts · utils.ts
  services/         operator · xp · mission · squad · leaderboard · workflow
  agents/
    providers/      anthropic.ts · openai.ts
    ai-router.ts    surface-aware provider routing + telemetry + streaming
    genubra.ts      strategic intelligence persona
    oblisk.ts       JSON-schema'd workflow decomposition (zod validated)
  database/         README + space for generated types
  types/            nros.ts (domain) · database.ts (Supabase Database type)
  hooks/            use-operator (realtime profile)
  middleware.ts     Supabase session refresh + protected-route gating
supabase/migrations/0001_kernel_init.sql   14 tables + view + RLS + seeds
```

### The 14 tables

`operator_profiles · ranks · missions · mission_progress · xp_logs · squads ·
squad_members · achievements · operator_achievements · workflows · workflow_steps ·
ai_requests · notifications` + view `leaderboard_global`.

All operator-owned tables enforce row-level security via `current_operator_id()`,
which resolves the operator profile from the JWT's `auth.uid()`.

### XP & rank progression

Awarded by `services/xp-service.ts::awardXp` (service-role). Re-evaluates the
operator's rank against the seeded `ranks` ladder
(`Initiate · Operator · Vanguard · Architect · Warden · Sovereign`) and writes a
notification on promotion. Mission completion + workflow forging both call it.

### GENUBRA

Right-side panel (`components/nros/genubra-panel.tsx`) — toggled from the topbar.
Streams from `POST /api/agents/genubra` with operator context (callsign, rank, XP,
recent missions, active workflows) injected on the server. Persona spec lives in
`agents/genubra.ts` — direct, surgical, no chatbot voice.

### OBLISK

`POST /api/workflows` accepts an objective, calls `agents/oblisk.ts::obliskDecompose`
which forces strict JSON output (zod-validated), then persists a `workflow` plus a
parent/child tree of `workflow_steps` (PHASE → TASK | AUTOMATION | DECISION). Awards
+100 XP per forge.

### Provider routing

`agents/ai-router.ts` resolves provider + model from the call (or falls back to
`NROS_AI_DEFAULT_PROVIDER` / `NROS_AI_DEFAULT_MODEL`), logs to `ai_requests`, and
returns either a string (`aiComplete`) or a streamed `Response` (`streamToResponse`).
Switch a single surface to OpenAI by passing `provider: "openai"` — no other code
changes required.

---

## Deploy to Vercel

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_APP_URL          # https://your-domain.vercel.app
vercel deploy --prod
```

The `/api/workflows` route declares `maxDuration = 60` for OBLISK calls; bump on
the Vercel project if you upgrade to deeper plans / longer reasoning.

---

## Scaling considerations

- **RLS first.** All policies route through `current_operator_id()`. No business
  rule should bypass RLS by hand-rolling SQL in a server action — call into
  `services/*` and let RLS enforce. Service-role usage is intentionally narrow:
  XP grants, system writes, telemetry inserts.
- **AI cost control.** `ai_requests` logs every call (surface, provider, model,
  excerpt). Add a daily aggregate view + per-operator budget cap before opening
  the funnel.
- **Realtime XP / rank.** `hooks/use-operator.ts` already subscribes to
  `operator_profiles` changes. Wire the topbar to it once you want live updates
  during missions.
- **Modularize on growth.** When any service reaches ~5 files, lift it into
  `src/modules/<domain>/` (see `src/modules/README.md`). Keep imports through
  `@/services/*` and `@/agents/*` — nothing imports from inside `app/(dashboard)/*`.
- **Edge functions / cron.** Promotions, achievement scans, and leaderboard
  snapshots are good first jobs for Supabase Edge Functions.

---

## What's next (post-V1)

1. Wire achievements to mission/workflow events (the table + UI exist; needs the
   trigger logic).
2. Squad XP aggregation + squad leaderboard.
3. OBLISK step-status mutation (drag/drop kanban over `workflow_steps`).
4. GENUBRA tool-use (let it create missions / kick off workflows on the
   operator's behalf).
5. Real notifications dropdown reading from `notifications` table.

> You are not building a demo. You are building the kernel of a sovereign
> operator ecosystem.
