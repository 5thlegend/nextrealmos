# NROS · Architecture V3 — DIVINE-SYNC Civilization OS

> Tag target: **NROS_KERNEL_V3_DIVINE_SYNC**
> Supersedes V2 federation architecture. The federation foundation remains;
> V3 adds the civilization layer — Realm Graph Engine, structured event
> taxonomy, elite governance, agent grid, economy ledger, guilds.

---

## The eight layers

```
                    ┌──────────────────────────────────────────────────┐
                    │   NEXT REALM ORDER  ─  doctrine + philosophy     │
                    │   (governs everything below; never written code) │
                    └──────────────────────────────────────────────────┘
                                          │
        ┌─────────────────────────────────┼──────────────────────────────────┐
        │                                 │                                  │
        ▼                                 ▼                                  ▼
┌──────────────┐               ┌──────────────────┐                ┌────────────────┐
│   GENUBRA    │               │   REALM GRAPH    │                │     OBLISK     │
│  cognition   │◄─reads────────│   ENGINE         │───routes──────►│  execution +   │
│              │               │  governance +    │                │  orchestration │
│  memory      │   transmissions│ orchestration UI │                │                │
│  reasoning   │   ai_requests │                  │                │ workflows      │
│  operator   ─┼───────────────┤  /grid           │────────────────┤ deployments    │
│  graph       │               │                  │                │ realm scaffolds│
└──────────────┘               └────────┬─────────┘                └────────────────┘
                                        │
                                        ▼ federation API
                              ┌──────────────────────┐
                              │       NROS           │  ◄── infrastructure only
                              │  identity / xp /     │      not the primary frontend
                              │  realms / events /   │
                              │  permissions / sync  │
                              └──────────┬───────────┘
                                         │ events flow up
                  ┌──────────────────────┼──────────────────────┐
                  │                      │                      │
                  ▼                      ▼                      ▼
        ┌─────────────────┐   ┌──────────────────┐   ┌────────────────────┐
        │ OPERATOR GRID   │   │  ELITE REALMS    │   │   ARCSEED          │
        │ public surface  │   │  sovereign apps  │   │   worldcraft       │
        │                 │   │                  │   │                    │
        │ • dossier       │   │ • LEGVCY         │   │ • games            │
        │ • signal map    │   │ • DivinWine      │   │ • simulations      │
        │ • feed          │   │ • LASTMILE OS    │   │ • VR future        │
        │ • discovery     │   │ • WeightRoomApp  │   │   (not yet built)  │
        │ • guilds        │   │ • OverNight      │   │                    │
        │                 │   │   Money Apps     │   │ spatially-ready    │
        └─────────────────┘   │ • Money Factory  │   └────────────────────┘
                              │   (armory layer) │
                              └──────────────────┘
```

Each layer has a single responsibility. Mixing layers = monolith risk.

---

## Layer attribution

| Layer | Mandate | Lives at |
|---|---|---|
| **NEXT REALM ORDER** | Doctrine + civilization philosophy. Not code — the canon all systems align to. | `docs/`, project memory, this file |
| **GENUBRA** | Civilization intelligence. Reads operator graph + transmissions + AI logs to reason. | `src/agents/genubra.ts`, `/api/agents/genubra`, GENUBRA panel |
| **OBLISK** | Execution + federation orchestration. Decomposes objectives, scaffolds realms (V4), runs workflows. | `src/agents/oblisk.ts`, `/api/workflows`, `/workflows/*` |
| **REALM GRAPH ENGINE** | Governance + orchestration UI. Visual node-based civilization control. | `src/app/(dashboard)/grid`, `src/components/grid/*` |
| **NROS** | Federation infrastructure. Identity, XP, realms, events, sync, permissions. **Not the primary frontend.** | The whole `NROS_KERNEL` repo. Lives at `nextrealmos.pages.dev`. |
| **OPERATOR GRID** | Public civilization surface. Dossier, signal map, feed, discovery. | External repo `5thlegend/Operator_Grid`, lives at `nextrealm-operators.dankpenta.workers.dev` |
| **MONEY FACTORY** | Deployment armory + economy layer. Restricted-access monetization vault. | A realm in NROS (`/realms/money-factory`), table `money_factory_entries`, plus `economy_events` ledger |
| **ARCSEED** | Worldcraft division. Games, simulations, future VR Nexus. **Architecture is spatially-ready; VR not built yet.** | A realm in NROS (`/realms/arcseed`), no current external deployment |
| **ELITE REALMS** | Sovereign specialized districts. Each realm is its own product. | LEGVCY, DivinWine, LASTMILE OS, WeightRoomApp, OverNight Money Apps. Each has its own repo + deploy. |

---

## The 6 critical rules (and where they're enforced)

### 1. **Sovereign realms** — never a monolith
Each realm owns: deploy, DB, UI, business logic. Synchronization via federation APIs only.

*Enforced by:* separate codebases, separate Cloudflare Workers, separate Supabase projects (or separate D1 dbs). NROS only stores the operator graph + universal XP + transmissions feed.

### 2. **NROS = infrastructure, not frontend**
NROS dashboard exists for operators to see their universal state. The *primary* operator-facing experience lives in the realms (Operator Grid, etc.).

*Enforced by:* feature ownership. Realms own UX. NROS owns the contract.

### 3. **Operator Grid = public civilization surface**
Onboarding, social signal network, influence map, deployment feed, guild network, civilization map. *Not* governance.

*Enforced by:* the Realm Graph Engine lives in NROS, never in the Operator Grid.

### 4. **Realm Graph Engine = control layer**
Tactical, node-based, visually programmable. Governs realm attachment, elite leaders, permissions, economy routing, missions, sync, AI agents.

*Enforced by:* `src/app/(dashboard)/grid/page.tsx` reads from `realm_graph_nodes` view. All mutations route through the federation API or service-role admin paths.

### 5. **Money Factory = restricted**
Operator deployment armory. Rank-gated access (`money_factory_entries.unlock_rank_tier`).

*Enforced by:* RLS + the Realm Graph Engine respects the unlock tier. UI shows lock icon for inaccessible entries.

### 6. **ARCSEED = worldcraft, VR future**
Architecture must remain spatially compatible. Don't build VR yet. Don't paint code into corners that rule it out.

*Enforced by:* the realm exists in the registry. No code shipped. When VR comes, it's a sovereign realm like any other.

---

## The federation event system

Every important civilization action emits a structured event. Events flow:
**Realm → NROS federation API → `transmissions` table → real-time fan-out to subscribers.**

### Event naming convention

Dotted namespace, lowercase, snake_case segments:
```
deployment.iteration | deployment.ship | deployment.milestone | deployment.launch
operator.activation  | operator.ascension
realm.attach         | realm.vault
guild.create         | guild.merge
mission.complete     | mission.fail
influence.growth     | economy.transaction
agent.deploy         | agent.fault
achievement.unlock
```

The vocabulary is documented in the `civilization_event_types` table — a self-describing API contract realms can introspect. Realms may emit unknown event names (forward-compatible); registered ones get richer rendering.

### Wire format

```jsonc
POST /api/federation/transmissions
Authorization: Bearer nros_pk_<...>
{
  "kind": "WORKFLOW_FORGED",            // coarse bucket (enum)
  "event_name": "deployment.launch",    // structured name (dotted)
  "title": "SHADOW.SEVEN launched: Dossier v2",
  "callsign": "SHADOW.SEVEN",
  "metadata": { "deployment_id": "...", "url": "https://..." }
}
```

### Why both `kind` and `event_name`?

- `kind` is a stable enum used for indexing, filtering, and coarse routing.
- `event_name` is the rich, evolvable vocabulary realms emit and the UI renders.

This dual approach keeps the index efficient while letting the event taxonomy grow without schema migrations.

---

## The mandatory systems — current status

| # | System | Status | Location |
|---|---|---|---|
| 1 | Universal Operator Identity | ✅ Live | `operator_profiles`, callsign as universal ID |
| 2 | Federation SDK | ✅ Live | `packages/sdk/` (NROS) + `src/lib/nros.ts` (Operator Grid) |
| 3 | Realm Registry | ✅ Live | `realms` table + `/realms` UI + `realm_graph_nodes` view |
| 4 | Event Stream | ✅ Live | `transmissions` table + `/transmissions` feed + `event_name` taxonomy |
| 5 | XP + Rank System | ✅ Live | `xp_logs`, `ranks`, `xp-service.ts`, federation `/api/federation/xp` |
| 6 | Mission Engine | ⚠ Partial | `missions` table seeded; per-realm mission gen pending |
| 7 | Economy Layer | ⚠ Schema only | `economy_events` + `money_factory_entries` tables; UI pending |
| 8 | Elite Leader Governance | ⚠ Schema only | `elite_leaders` table; assignment UI pending |
| 9 | Guild System | ⚠ Schema only | `guilds` + `guild_members` tables; UI pending |
| 10 | Operator Influence Tracking | ⚠ Schema only | `operator_profiles.influence_score / followers_count`; signal pipeline pending |
| 11 | Civilization Analytics | ✅ Partial | `civilization_overview` view + Realm Graph Engine stats |
| 12 | Realtime Synchronization | ⚠ Pending | Supabase Realtime channel on `transmissions` available; client subscription not wired |
| 13 | Agent-Compatible Architecture | ⚠ Schema only | `agents` table; AI binding `env.AI` proven; agent runtime pending |
| 14 | Realm Federation APIs | ✅ Live | `/api/federation/realms`, `/transmissions`, `/xp`, `/operators/[callsign]` |
| 15 | Global Transmission Feed | ✅ Live | `/transmissions` route + public GET endpoint |

**~7 of 15 fully live, 8 with schema in place pending UI/runtime.** The architecture skeleton is complete — the remaining work is filling in surfaces.

---

## Database — V3 canonical schema

**21 tables · 5 views · 17 enum types · seeded with 7 realms + 1 vaulted + 17 event names.**

### Tables grouped by layer

| Layer | Tables |
|---|---|
| **NROS infrastructure** | `operator_profiles`, `ranks`, `realms`, `realm_api_keys`, `operator_realms`, `transmissions`, `civilization_event_types` |
| **LEGVCY (progression history)** | `xp_logs`, `ai_requests`, `notifications`, `achievements`, `operator_achievements` |
| **NROS-Core realm content** | `missions`, `mission_progress`, `squads`, `squad_members` |
| **OBLISK** | `workflows`, `workflow_steps` |
| **Civilization governance (V3)** | `elite_leaders`, `agents`, `economy_events`, `money_factory_entries`, `guilds`, `guild_members` |

### Views

| View | Purpose |
|---|---|
| `leaderboard_global` | Top operators by universal XP |
| `realm_activity` | Per-realm operator + transmission counts |
| `operator_realm_summary` | Per-operator XP + realm membership rollup |
| `civilization_overview` | Top-line civ stats (realms, ops, vault, agents, revenue, 24h tx) |
| `realm_graph_nodes` | Aggregated realm view powering the Realm Graph Engine |

---

## Realm registry — current state

| Slug | Name | Status | Type | URL |
|---|---|---|---|---|
| `nros-core` | NROS Core | ACTIVE | Core | https://nextrealmos.pages.dev |
| `nro-operator-core` | NRO · Operator Core | ACTIVE | Public surface | https://nextrealm-operators.dankpenta.workers.dev |
| `arcseed` | ARCSEED | ACTIVE | Worldcraft | (no deploy yet) |
| `overnight-money-apps` | OverNight Money Apps | ACTIVE | Micro-SaaS factory | (per-app subdomains: `nr-*.pages.dev`) |
| `money-factory` | Money Factory | ACTIVE | Economy / armory | (UI in NROS Realm Graph Engine) |
| `legvcy` | LEGVCY Realm | ACTIVE | Elite — progression | (deploy pending) |
| `divinwine` | DivinWine Realm | ACTIVE | Elite — hospitality intelligence | (deploy pending) |
| `lastmile-os` | LASTMILE OS | ACTIVE | Elite — cannabis delivery | (deploy pending) |
| `weightroom-app` | WeightRoomApp | ACTIVE | Elite — HS strength SaaS | (deploy pending) |
| `boba-ai` | Boba AI | ARCHIVED · vaulted | Vault | preserved for civilization memory |

---

## How a realm joins the federation

Concrete recipe — same one Operator Grid just used:

```ts
// 1. Realm owner registers via NROS UI or admin SQL.
// 2. NROS issues a one-time API key (nros_pk_...).
// 3. In the realm's codebase, drop in a tiny client:

import { pushTransmission, awardXp } from "@/lib/nros";

// 4. At every meaningful event, fire-and-forget:
await pushTransmission({
  kind: "WORKFLOW_FORGED",
  event_name: "deployment.launch",
  title: `${operator.callsign} launched ${name}`,
  callsign: operator.callsign,
  metadata: { /* realm-specific */ },
});

await awardXp({
  callsign: operator.callsign,
  delta: 100,
  reason: "Launched feature",
});
```

That's it. The realm:
- Keeps its own auth, DB, UI, deploy
- Gains universal identity for its operators
- Contributes to the federated transmissions feed
- Operator XP aggregates universally across all realms

---

## How the Realm Graph Engine works

`/grid` route in NROS. React Flow node-based UI. Reads from `realm_graph_nodes` view.

- **Nodes**: realms (custom `RealmNode` with stats + status + revenue badge)
- **Edges**: NROS-core in center, all other realms ring around it (animated when active, dashed when vaulted)
- **Side panel**: click any realm → detail view (operators, elite leaders, agents, base URL, monthly revenue)
- **Legend + minimap + controls**: standard React Flow affordances
- **Stats panel**: live `civilization_overview` (realms, operators, agents running, vault, 24h tx)

V3 ships read-only governance. V4 will add:
- Drag-and-drop realm attachment / detachment
- Inline elite leader appointment
- Agent grid sub-view (deploy AI workers from the graph)
- Economy routing inspector
- Permission editing
- Mission generator
- Real-time updates via Supabase Realtime channel on `transmissions`

---

## Spatial readiness for ARCSEED / VR

The graph engine uses 2D (x, y) positioning today via React Flow. The data model is forward-compatible with 3D:

- Each realm has a `metadata jsonb` field — `{ "position": { "x":..., "y":..., "z":... } }` is valid right now
- Operator Grid already has `lat`, `lng` for geographic placement
- Future ARCSEED realms can store world coordinates + spatial telemetry without schema changes

When VR Nexus comes, the Realm Graph Engine becomes a 3D world; nothing else needs to change.

---

## Operating the system

| Action | How |
|---|---|
| **Push code to NROS** | `git push origin main` → GH Actions builds → `bash deploy-from-built.sh` |
| **Push code to Operator Grid** | `git push origin main` (in `C:\dev\NextRealmOperators`) → its GH Actions deploys |
| **Apply a schema migration** | Add `supabase/migrations/000N_*.sql`, then I run via Supabase Management API (PAT) |
| **Add a new realm** | Register via `/realms/new` (UI) or insert into `realms` table |
| **Issue a realm API key** | `POST /api/federation/realms` returns one at registration; subsequent keys via `realm_api_keys` insert |
| **Switch AI provider** | Change `NROS_AI_DEFAULT_PROVIDER` env var (cloudflare/anthropic/openai) — no redeploy of code |
| **Vault a realm** | `update realms set status='ARCHIVED', vaulted_at=now(), vault_reason='...' where slug='...'` |

---

## What's NOT built yet (the V4 backlog)

These are explicitly deferred, all have schema in place:
- Elite leader appointment UI (table exists)
- Guild creation flow (table exists)
- Agent runtime + deploy UI (table + AI binding exist)
- Money Factory rank-gating UI (table + enum exist)
- Influence score recompute pipeline (columns exist)
- Real-time transmission subscription on graph nodes (table is realtime-ready)
- OBLISK realm-scaffolding (V4: "objective → new realm bootstrapped")
- Cross-realm SSO (V4: NROS issues short-lived JWTs)
- Per-realm rate limits + budget caps
- ARCSEED VR Nexus (decided to defer; spatial-ready)

---

## Boundaries — what NROS will never become

By doctrine, NROS will never:
- Host a realm's primary user-facing UX (that's the realm's job)
- Become a "shopify for realms" / multitenant CMS (each realm is sovereign code)
- Mandate a tech stack on realms (any HTTPS-capable runtime works)
- Read realm-internal data (only events realms voluntarily push)
- Unilaterally vault a realm (governance decision, not infrastructure decision)

These are guardrails against the "monolithization gravity" that pulls infrastructure layers toward becoming products.

---

## The doctrine, restated

> **Build a federated civilization operating system, not a SaaS app.
> Sovereign realms. Universal identity. Structured event flow.
> Elite governance. Visual control surface. Infinite expansion.
> Spatial readiness for the worlds yet to come.**
