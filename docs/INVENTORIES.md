# NROS · Inventories

> Tag: **NROS_KERNEL_V1_GENESIS** · Snapshot: 2026-05-10

## 1. Folder tree (source)

```
NROS_KERNEL/
├── README.md
├── components.json                # ShadCN config
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── wrangler.toml                  # Cloudflare Pages config
├── .env.example
├── .gitignore
├── docs/
│   ├── SYSTEM_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── ROADMAP.md
│   └── INVENTORIES.md             # this file
├── supabase/
│   └── migrations/
│       └── 0001_kernel_init.sql   # 14 tables + view + RLS + seeds
└── src/
    ├── middleware.ts
    ├── agents/                    # GENUBRA + OBLISK + provider router
    │   ├── ai-router.ts
    │   ├── genubra.ts
    │   ├── oblisk.ts
    │   └── providers/
    │       ├── anthropic.ts
    │       └── openai.ts
    ├── app/
    │   ├── layout.tsx             # root layout (fonts, Toaster, dark)
    │   ├── page.tsx               # marketing landing
    │   ├── not-found.tsx
    │   ├── globals.css            # tokens + cybernetic utilities
    │   ├── (auth)/                # public auth routes
    │   │   ├── layout.tsx
    │   │   ├── sign-in/{page,actions}.tsx|ts
    │   │   └── sign-up/{page,actions}.tsx|ts
    │   ├── (dashboard)/           # gated by middleware
    │   │   ├── layout.tsx         # sidebar + topbar + GENUBRA panel
    │   │   ├── dashboard/page.tsx
    │   │   ├── leaderboard/page.tsx
    │   │   ├── missions/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/{page,actions,mission-actions}.tsx|ts
    │   │   ├── operator/page.tsx
    │   │   ├── squads/
    │   │   │   ├── page.tsx
    │   │   │   └── new/{page,actions,new-squad-form}.tsx|ts
    │   │   └── workflows/
    │   │       ├── page.tsx
    │   │       ├── [id]/page.tsx
    │   │       └── new/{page,new-workflow-form}.tsx
    │   ├── api/
    │   │   ├── agents/genubra/route.ts    # edge, streamed
    │   │   └── workflows/route.ts          # edge, OBLISK
    │   ├── auth/sign-out/route.ts
    │   └── operator/onboarding/page.tsx
    ├── components/
    │   ├── ui/                    # ShadCN-style primitives
    │   │   ├── avatar.tsx · badge.tsx · button.tsx · card.tsx
    │   │   ├── input.tsx · label.tsx · progress.tsx
    │   │   ├── scroll-area.tsx · separator.tsx · textarea.tsx
    │   └── nros/                  # NROS-specific
    │       ├── panel.tsx · stat.tsx · rank-bar.tsx
    │       ├── sidebar.tsx · topbar.tsx
    │       ├── genubra-panel.tsx
    │       └── genubra-panel-context.tsx
    ├── database/README.md
    ├── hooks/
    │   └── use-operator.ts        # realtime profile subscription
    ├── lib/
    │   ├── env.ts
    │   ├── utils.ts
    │   └── supabase/
    │       ├── client.ts          # browser
    │       ├── server.ts          # RSC + admin (service role)
    │       └── middleware.ts      # session refresh
    ├── modules/README.md          # placeholder for graduating domains
    ├── services/
    │   ├── leaderboard-service.ts
    │   ├── mission-service.ts
    │   ├── operator-service.ts
    │   ├── squad-service.ts
    │   ├── workflow-service.ts
    │   └── xp-service.ts
    └── types/
        ├── database.ts            # Supabase Database shim (regenerate)
        └── nros.ts                # domain types
```

**Source LOC:** 65 files · ~2,940 LOC.

## 2. Dependency inventory

### Runtime

| Package                          | Version    | Purpose                                     |
| -------------------------------- | ---------- | ------------------------------------------- |
| `next`                           | 15.1.3     | App Router framework                        |
| `react` / `react-dom`            | 19.0.0     | UI runtime                                  |
| `typescript`                     | ^5.7.2     | Static types                                |
| `@supabase/ssr`                  | ^0.5.2     | Cookie-based auth for RSC + middleware      |
| `@supabase/supabase-js`          | ^2.47.10   | DB + auth client                            |
| `@anthropic-ai/sdk`              | ^0.32.1    | GENUBRA + OBLISK provider                   |
| `openai`                         | ^4.77.0    | OpenAI provider (router fallback)           |
| `zod`                            | ^3.24.1    | Schema validation (OBLISK plan, form input) |
| `tailwindcss` / `tailwindcss-animate` | ^3.4.17 / ^1.0.7 | Styling                              |
| `@radix-ui/react-*`              | ^1–2       | Accessible UI primitives                    |
| `class-variance-authority`       | ^0.7.1     | Variant API for `Button`/`Badge`            |
| `clsx` + `tailwind-merge`        | ^2         | Class composition                           |
| `framer-motion`                  | ^11.15.0   | GENUBRA panel slide, micro-motion           |
| `lucide-react`                   | ^0.469.0   | Icon set                                    |
| `sonner`                         | ^1.7.1     | Toasts                                      |

### Dev

| Package                  | Version  | Purpose                          |
| ------------------------ | -------- | -------------------------------- |
| `@types/node` / `@types/react` / `@types/react-dom` | latest | TS types                          |
| `eslint` + `eslint-config-next` | ^9 / 15.1.3 | Lint baseline               |
| `autoprefixer` + `postcss` | ^10 / ^8 | Tailwind pipeline               |

### To install for Cloudflare deploy (not yet pinned)

| Package                        | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `@cloudflare/next-on-pages`    | Build adapter                              |
| `wrangler`                     | CF CLI for `pages deploy`                  |

## 3. Environment variable inventory

| Name                              | Public | Required | Used in                               | Notes                                  |
| --------------------------------- | :----: | :------: | ------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | ✓      | ✓        | `lib/supabase/{client,server,middleware}.ts`, `lib/env.ts` |                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | ✓      | ✓        | same                                                    |                                        |
| `NEXT_PUBLIC_APP_URL`             | ✓      | ✓        | `lib/env.ts`, root `metadata`, `auth/sign-out` redirect | Match the deployed origin              |
| `SUPABASE_SERVICE_ROLE_KEY`       |        | ✓        | `lib/supabase/server.ts::createSupabaseAdmin`           | **Secret** — never expose to client    |
| `ANTHROPIC_API_KEY`               |        | ✓*       | `agents/providers/anthropic.ts`                         | *Required if `AI_DEFAULT_PROVIDER=anthropic` (default) |
| `OPENAI_API_KEY`                  |        | ✓*       | `agents/providers/openai.ts`                            | *Required if any call uses `provider: "openai"` |
| `NROS_AI_DEFAULT_PROVIDER`        |        |          | `lib/env.ts`, `agents/ai-router.ts`                     | `anthropic` (default) \| `openai`      |
| `NROS_AI_DEFAULT_MODEL`           |        |          | same                                                    | Default `claude-opus-4-7`              |

## 4. API route inventory

| Method | Path                    | Runtime | Auth   | Body / Params                  | Returns                    | Layer   |
| ------ | ----------------------- | ------- | ------ | ------------------------------ | -------------------------- | ------- |
| POST   | `/api/agents/genubra`   | edge    | yes    | `{ question: string }`         | `text/plain` (streamed)    | GENUBRA |
| POST   | `/api/workflows`        | edge    | yes    | `{ objective: string (≥10c) }` | `{ workflowId }` JSON      | OBLISK  |
| POST   | `/auth/sign-out`        | edge    | yes    | —                              | 302 → `/`                  | NROS    |

Server-action endpoints (form-action, not REST):

| Action                        | File                                                                       | Layer  |
| ----------------------------- | -------------------------------------------------------------------------- | ------ |
| `signInAction`                | `app/(auth)/sign-in/actions.ts`                                            | NROS   |
| `signUpAction`                | `app/(auth)/sign-up/actions.ts`                                            | NROS   |
| `acceptMissionAction`         | `app/(dashboard)/missions/[id]/actions.ts`                                 | NROS   |
| `completeMissionAction`       | `app/(dashboard)/missions/[id]/actions.ts`                                 | NROS   |
| `createSquadAction`           | `app/(dashboard)/squads/new/actions.ts`                                    | NROS   |

## 5. Page route inventory

| Path                          | Render | Layer  | Notes                                    |
| ----------------------------- | :----: | ------ | ---------------------------------------- |
| `/`                           | Static | NROS   | Marketing landing                        |
| `/sign-in`                    | Static | NROS   | Suspense-wrapped client form             |
| `/sign-up`                    | Static | NROS   | Client form                              |
| `/operator/onboarding`        | Dynamic| NROS   | Provisions profile then redirects        |
| `/dashboard`                  | Dynamic| NROS   | Command surface                          |
| `/missions`                   | Dynamic| NROS   | List                                     |
| `/missions/[id]`              | Dynamic| NROS   | Detail + accept/complete actions         |
| `/operator`                   | Dynamic| NROS   | Profile + XP ledger                      |
| `/squads`                     | Dynamic| NROS   | List                                     |
| `/squads/new`                 | Dynamic| NROS   | Create form                              |
| `/leaderboard`                | Dynamic| NROS   | Top 100                                  |
| `/workflows`                  | Dynamic| OBLISK | List                                     |
| `/workflows/new`              | Dynamic| OBLISK | Forge form                               |
| `/workflows/[id]`             | Dynamic| OBLISK | Plan render (phases + tasks)             |
| `/_not-found`                 | Static | NROS   | 404                                      |

## 6. Feature matrix

| Feature                          | Status | Where                                  |
| -------------------------------- | :----: | -------------------------------------- |
| Email + password auth            | ✅     | Supabase Auth                          |
| Operator identity (callsign)     | ✅     | `operator_profiles` + signup action    |
| Onboarding fallback              | ✅     | `/operator/onboarding`                 |
| Sidebar / topbar / GENUBRA slot  | ✅     | `(dashboard)/layout.tsx`               |
| Mission list + detail            | ✅     | `(dashboard)/missions/*`               |
| Mission accept / complete        | ✅     | server actions                          |
| XP grant + rank promotion        | ✅     | `services/xp-service.ts`               |
| Notification on rank promotion   | ✅     | `xp-service` writes `notifications`    |
| Notifications UI                 | ⏳     | Table populated; no dropdown yet       |
| Squad list + create              | ✅     | `(dashboard)/squads/*`                 |
| Squad join / leave UI            | ⏳     | Service exists; no buttons             |
| Squad detail page                | ⏳     | Service exists; no `/squads/[id]`      |
| Leaderboard (global, top 100)    | ✅     | `leaderboard_global` view              |
| Squad leaderboard                | ⏳     | Not built                              |
| Operator profile + XP ledger     | ✅     | `(dashboard)/operator/page.tsx`        |
| Achievements UI                  | ⏳     | Table seeded; no UI / no triggers      |
| GENUBRA streaming chat           | ✅     | right panel + `/api/agents/genubra`    |
| Operator-context briefing        | ✅     | `agents/genubra.ts::operatorBriefing`  |
| AI provider router               | ✅     | `agents/ai-router.ts`                  |
| AI request telemetry             | ✅     | `ai_requests` populated (sans tokens)  |
| OBLISK objective decomposition   | ✅     | `agents/oblisk.ts` + zod schema        |
| Workflow persistence (tree)      | ✅     | `workflow_steps` parent_id self-ref    |
| Workflow status mutation UI      | ⏳     | Service exists; no UI                  |
| Realtime operator subscription   | ✅     | `hooks/use-operator.ts`                |
| Realtime UI consumption          | ⏳     | Hook unused                            |
| Cybernetic theme + tokens        | ✅     | `globals.css` + Tailwind extends       |
| Mobile responsive                | ✅     | Sidebar collapses, fluid grids         |
| 404 page                         | ✅     |                                        |
| Edge runtime AI routes           | ✅     | for Cloudflare Pages                   |
| Rate limiting                    | ❌     | Pre-launch must-have                   |
| Tests                            | ❌     | Pre-launch must-have                   |

✅ shipped · ⏳ partial / placeholder · ❌ missing

## 7. Known technical debt (snapshot)

See [ROADMAP.md](./ROADMAP.md#known-technical-debt-rolling-list).

## 8. Unresolved placeholder systems

See [ROADMAP.md](./ROADMAP.md#unresolved-placeholder-systems).

## 9. Deployment checklist

See [DEPLOYMENT.md](./DEPLOYMENT.md#6-deployment-checklist).
