# ⚠️ ARCHIVED — superseded by `ARCHITECTURE_V3.md`

> This document describes the **V2 Federation** model (5 layers, with
> `NEXORA OS` and `FATE DESCENT VR` as example realms). It was superseded
> on 2026-05 by **DIVINE-SYNC V3**, which moved the architecture to
> **8 layers** and replaced the example-realm slate with the canonical
> federation set.
>
> **Read [`ARCHITECTURE_V3.md`](./ARCHITECTURE_V3.md) instead.**
>
> Specifically:
> - The 5-layer model (GENUBRA / NROS / OBLISK / LEGVCY / REALMS) was
>   replaced with the 8-layer civilization model
>   (NEXT REALM ORDER · GENUBRA · OBLISK · REALM GRAPH ENGINE · NROS ·
>   OPERATOR GRID · MONEY FACTORY · ARCSEED · ELITE REALMS).
> - LEGVCY is no longer a layer of NROS — it is an Elite Realm
>   (run by an elite leader, sovereign, productized).
> - The example realms (NEXORA OS, FATE DESCENT VR, Commercial Engine)
>   are not registered in the V3 federation. The active V3 set is:
>   NROS · NextRealmOperators (Operator Grid) · OverNight Money Apps ·
>   ARCSEED · LEGVCY · DivinWine · LASTMILE OS · WeightRoomApp · Money
>   Factory + vaulted Boba AI.
>
> This file is kept for historical reference only. Do not cite from it
> when onboarding a new operator or realm-builder.

---

## (historical) Five-layer model

| Layer       | Mandate                                                                                                      | Lives in                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **GENUBRA** | Cognition, memory, orchestration, operator graph                                                             | `src/agents/{genubra,ai-router}.ts`, `src/agents/providers/*`, `/api/agents/genubra`, dashboard right panel           |
| **NROS**    | Federation layer · identity layer · synchronization layer                                                    | `src/services/{operator,realm,federation-auth,transmission}-service.ts`, `/api/federation/*`, dashboard, middleware    |
| **OBLISK**  | Workflow / deployment / manifestation engine                                                                 | `src/agents/oblisk.ts`, `src/services/workflow-service.ts`, `/api/workflows`, `/workflows/*`                          |
| **LEGVCY**  | (V2: layer of NROS) — XP, ranks, achievements, history. (V3: elite realm, productized.)                       | `src/services/xp-service.ts`, tables: `xp_logs`, `ranks`, `achievements`, `operator_achievements`, `notifications`    |
| **REALMS**  | Independently deployable operator worlds. Sovereign. Stack-agnostic. Optionally self-hosted.                  | *External codebases.* They consume **`@nros/sdk`** and call the federation API.                                        |

(See ARCHITECTURE_V3.md for the canonical 8-layer model.)
