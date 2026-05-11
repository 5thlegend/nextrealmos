# NROS — Architecture (V2 Federation)

> Tag: **NROS_KERNEL_V2_FEDERATION**

## 1. System architecture — the federation

```
                   ┌──────────────────────────────────────────────────────┐
                   │              GENUBRA (cognition layer)               │
                   │  operator graph · memory · orchestration · routing    │
                   └─────────────────────────┬─────────────────────────────┘
                                             │  reads operator_profiles,
                                             │  transmissions, ai_requests
                                             ▼
┌───────────────┐   federation API   ┌─────────────────────────────────────┐   transmissions   ┌───────────────┐
│   Realm 1     │  ◄───────────────► │              NROS CORE              │ ◄───────────────► │   Realm 2     │
│  (Next.js)    │   /api/federation  │  ─────────────────────────────────  │                   │  (Cloudflare  │
│  uses @nros/sdk│                    │  identity layer (operator_profiles) │                   │   Worker)     │
└───────────────┘                    │  realm registry  (realms, op_realms)│                   └───────────────┘
       ▲                             │  api keys       (realm_api_keys)    │                          ▲
       │                             │  feed           (transmissions)     │                          │
       │                             │  XP/ranks       (xp_logs, ranks)    │                          │
┌───────────────┐                    │  workflows      (workflows, steps)  │                   ┌───────────────┐
│   Realm 3     │  ◄───────────────► │  AI surface     (genubra panel)     │ ◄───────────────► │  Realm N      │
│  (native iOS) │                    │  cybernetic operator dashboard      │                   │  (Discord bot)│
└───────────────┘                    └─────────────────┬───────────────────┘                   └───────────────┘
                                                       │
                                                       ▼
                                       ┌─────────────────────────────────┐
                                       │   Supabase  (Postgres · Auth ·  │
                                       │   Realtime · RLS)               │
                                       └─────────────────────────────────┘
```

**Key inversion vs. V1:**

- V1 NROS hosted *every* operator surface (missions, squads, leaderboards).
- V2 NROS hosts *coordination + identity*. Realms host their own surfaces and
  optionally federate XP/events back. The `/missions` surface in NROS is now
  the surface for the **NROS-Core realm** (the founding realm) — other realms
  bring their own.

## 2. Data flow

### 2A. Operator action inside a realm

```
                Operator (browser / native / chat)
                          │
                          ▼
                ┌─────────────────────┐
                │     Realm app       │ (sovereign — own auth UI, own data)
                │  uses @nros/sdk     │
                └──────────┬──────────┘
                           │  Bearer nros_pk_…
                           │  POST /api/federation/transmissions
                           │  POST /api/federation/xp
                           ▼
                ┌─────────────────────┐
                │  NROS edge function │ ── authenticateRealm() → service-role
                └──────────┬──────────┘
                           │
                ┌──────────┴───────────────┐
                ▼                          ▼
       ┌─────────────────┐        ┌─────────────────┐
       │  transmissions  │        │  xp_logs +      │
       │  (realm_id, …)  │        │  operator_      │
       │                 │        │  profiles       │
       └────────┬────────┘        └────────┬────────┘
                │                          │
                ▼                          ▼
         Realtime channel          Rank check + promotion notification
                │                          │
                └──────────┬───────────────┘
                           ▼
              Operator's NROS dashboard updates live
              (transmissions feed + rank bar)
```

### 2B. Operator interaction inside NROS itself

Same as V1 GENESIS, plus the new `/realms` and `/transmissions` surfaces.
Server components → services → Supabase (RLS-scoped). GENUBRA panel streams
from `/api/agents/genubra` with operator context that now includes
**realm-membership count + recent transmission count**.

### 2C. Realm registration

```
Operator (signed in to NROS) → /realms/new → POST /api/federation/realms
        │
        ├─► realms.insert(...)            (Postgres)
        ├─► realm_api_keys.insert(...)    (sha256(key) stored)
        └─► transmissions.insert(REALM_REGISTERED)

Response includes the FULL key — shown to operator ONCE, never again.
```

## 3. Service relationships (V2)

```
       ┌─────────────────────────┐
       │  operator-service       │
       └──────────┬──────────────┘
                  │
   ┌──────────────┼──────────────────────────────────────────────┐
   ▼              ▼                                              ▼
┌─────────┐  ┌──────────┐         ┌────────────────┐    ┌────────────────┐
│ mission │  │  squad   │         │  realm-service │    │ federation-    │
│ service │  │ service  │         │                │    │ auth (bearer)  │
└────┬────┘  └────┬─────┘         └────────┬───────┘    └────────┬───────┘
     │            │                        │                     │
     │            │                        ▼                     ▼
     │            │             ┌────────────────────┐  ┌────────────────┐
     │            │             │ transmission-      │  │  Federation    │
     │            │             │ service            │  │  API routes    │
     │            │             │ (push/list)        │  │  /api/fed/*    │
     │            │             └────────┬───────────┘  └────────┬───────┘
     │            │                      │                       │
     ▼            ▼                      ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        xp-service.awardXp(realmId?)                    │
│  • upserts operator_profiles.xp                                        │
│  • mirrors delta into operator_realms.realm_xp (if realm-attributed)   │
│  • appends xp_logs (now realm-scoped)                                  │
│  • emits notification on rank promotion                                │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                       ┌────────────────────┐
                       │  Supabase (RLS)    │
                       └────────────────────┘
                                  ▲
                                  │
                       ┌──────────┴─────────┐
                       │  GENUBRA reads     │
                       │  operator + recent │
                       │  transmissions for │
                       │  context briefing  │
                       └────────────────────┘
```

## 4. Layer attribution (V2)

### GENUBRA core
- `src/agents/genubra.ts`, `src/agents/ai-router.ts`, `src/agents/providers/*`
- `src/components/nros/genubra-panel*.tsx`
- `/api/agents/genubra`
- Reads (read-only) from: `operator_profiles`, `transmissions`, `ai_requests`, `xp_logs`

### NROS core (federation/identity/sync)
- `src/services/operator-service.ts`
- `src/services/realm-service.ts`
- `src/services/federation-auth.ts`
- `src/services/transmission-service.ts`
- `src/services/squad-service.ts`, `leaderboard-service.ts` (federation-wide squads & ladder)
- `src/lib/supabase/*`, `src/middleware.ts`
- `src/app/api/federation/*` — the wire contract
- `src/app/(dashboard)/{realms,transmissions,squads,leaderboard,operator}/*`
- Tables: `operator_profiles`, `realms`, `realm_api_keys`, `operator_realms`, `transmissions`, `squads`, `squad_members`

### OBLISK core (manifestation)
- `src/agents/oblisk.ts`, `src/services/workflow-service.ts`
- `/api/workflows`, `/workflows/*`
- Tables: `workflows`, `workflow_steps`
- *V3 vector:* OBLISK will additionally manifest **realms themselves** —
  scaffold a new realm from an objective, deploy it, register it.

### LEGVCY layer (progression + history)
- `src/services/xp-service.ts`
- Tables: `xp_logs`, `ranks`, `achievements`, `operator_achievements`, `notifications`
- The append-only memory NROS uses to compute rank, fuel GENUBRA context,
  and feed the operator's own ledger view.

### REALMS (external)
- Live in their own repos.
- Speak the federation protocol via `@nros/sdk` or raw HTTP.
- The `nros-core` realm (seeded by migration 0002) is NROS's own first-party
  surface (missions, squads, leaderboard, operator profile).

## 5. Scalability risks (V2)

| Risk                                                                    | Mitigation                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Transmissions table grows unbounded                                     | Partition by `created_at` quarterly + 90-day hot retention; cold to object store |
| API-key compromise from a single realm                                  | Per-key `last_used_at` + scope tagging; revoke endpoint; alert on >N failures    |
| Realm impersonation via callsign collision                              | Callsigns are unique on `operator_profiles` (citext); SDK lookup is exact-match  |
| Cross-realm XP inflation (rogue realm awards 1M XP)                     | Add per-realm daily XP budget (table: `realm_xp_budgets`); deny on overage        |
| Realtime fan-out cost on transmissions                                  | Subscribe per-operator (filter by their realm membership), not global             |
| GENUBRA context bloat as realm count grows                              | Truncate operator_briefing to top-N realms by recent activity                    |
| Federation API burst from a single realm                                | Per-key token-bucket rate limit (Cloudflare KV)                                  |

## 6. Technical debt (V2)

| Item                                                                | Severity | Notes                                                                         |
| ------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| Realm registration auto-approves (no admin moderation)              | M        | Add admin-review gate before opening federation to public                     |
| API keys are bearer-only (no signing / replay protection)           | M        | Add HMAC-signed request bodies for high-value calls (xp.award) in V3          |
| No SSO between realms yet — each realm has its own auth UI today    | H        | V3: NROS issues short-lived JWTs realms can verify against the operator graph |
| Hand-written `Database` type still not regenerated                  | M        | V1 carry-over                                                                 |
| No rate limiting on federation endpoints                             | H        | Pre-public must-have                                                          |
| No tests                                                             | H        | Add Playwright + Vitest before public                                         |
| Per-realm leaderboard view not yet materialized                     | L        | Easy add when usage warrants                                                  |
| OBLISK can't yet scaffold a realm (just workflows)                  | L        | V3 vector — OBLISK as realm-manifestation engine                              |

See [ROADMAP.md](./ROADMAP.md) for sequenced work.
