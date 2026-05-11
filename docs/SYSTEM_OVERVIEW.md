# NROS — System Overview (V2 Federation)

> Tag: **NROS_KERNEL_V2_FEDERATION** · Supersedes V1 GENESIS.

NROS is **not a single product**. It is the **coordination layer** that
connects sovereign operator-facing apps ("realms") into one federated
ecosystem with shared identity, shared progression, and a unified event
fabric.

## Five-layer model

| Layer       | Mandate                                                                                                      | Lives in                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **GENUBRA** | Cognition, memory, orchestration, operator graph                                                             | `src/agents/{genubra,ai-router}.ts`, `src/agents/providers/*`, `/api/agents/genubra`, dashboard right panel           |
| **NROS**    | Federation layer · identity layer · synchronization layer                                                    | `src/services/{operator,realm,federation-auth,transmission}-service.ts`, `/api/federation/*`, dashboard, middleware    |
| **OBLISK**  | Workflow / deployment / manifestation engine                                                                 | `src/agents/oblisk.ts`, `src/services/workflow-service.ts`, `/api/workflows`, `/workflows/*`                          |
| **LEGVCY**  | Operator training & progression — XP, ranks, achievements, history                                           | `src/services/xp-service.ts`, tables: `xp_logs`, `ranks`, `achievements`, `operator_achievements`, `notifications`    |
| **REALMS**  | Independently deployable operator worlds. Sovereign. Stack-agnostic. Optionally self-hosted.                  | *External codebases.* They consume **`@nros/sdk`** (`packages/sdk`) and call the federation API.                       |

## What lives in this repo vs. lives elsewhere

```
THIS REPO (NROS_KERNEL)                     EXTERNAL (Realms — separate codebases)
──────────────────────────────────────      ─────────────────────────────────────
GENUBRA cognition                           ▷ NEXORA OS (nightlife)
NROS coordination + identity + feed         ▷ FATE DESCENT VR (WebXR roguelike)
OBLISK workflow engine                      ▷ LASTMILE OS (cannabis delivery)
LEGVCY XP/rank/achievement primitives       ▷ WeightRoomApp (HS strength)
@nros/sdk (the contract)                    ▷ Commercial Engine (Seedance ad lib)
@nros dashboard (operator's home)           ▷ … any future realm
```

Every realm:

- Owns its own auth, data, deploy, billing, runtime — **sovereign**.
- Uses **one operator identity** across the federation (callsign).
- Pushes **transmissions** to NROS for the unified feed.
- Awards **XP** that aggregates into universal rank progression.
- Optionally appears in NROS's realm registry for discovery.

## What the federation provides

| Capability                     | Surface                                         | Layer          |
| ------------------------------ | ----------------------------------------------- | -------------- |
| Multi-realm federation         | `realms` registry + transmissions feed          | NROS           |
| Universal operator identity    | `operator_profiles` + callsign as primary key   | NROS           |
| Shared auth (V2 → SSO V3)      | Supabase Auth · realm-issued API keys           | NROS           |
| Shared XP / rank               | `xp_logs.realm_id` + `operator_realms.realm_xp` | LEGVCY × NROS  |
| Event synchronization          | `transmissions` table + Realtime                | NROS           |
| Transmissions feed             | `/transmissions` UI + `/api/federation/...`     | NROS           |
| Realm registration             | `/realms/new` UI + `POST /api/federation/realms`| NROS           |
| Operator discovery             | `GET /api/federation/operators/[callsign]`      | NROS           |
| API key issuance               | `realm_api_keys` (sha256-hashed, scope-tagged)  | NROS           |
| Cross-realm telemetry          | `ai_requests.realm_id` + transmissions          | LEGVCY × GENUBRA |

## Read next

- [ARCHITECTURE.md](./ARCHITECTURE.md) — diagrams + service relationships
- [FEDERATION_PROTOCOL.md](./FEDERATION_PROTOCOL.md) — the wire contract realms must speak
- [REALM_SPEC.md](./REALM_SPEC.md) — what makes a thing a realm
- [SDK.md](./SDK.md) — `@nros/sdk` reference
- [DATABASE.md](./DATABASE.md) — schema + RLS
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Cloudflare Pages + Supabase
- [ROADMAP.md](./ROADMAP.md) — V2 priorities
- [INVENTORIES.md](./INVENTORIES.md) — folder + deps + env + routes
