# NROS Federation Protocol — V2

> Tag: **NROS_KERNEL_V2_FEDERATION**

The contract every realm speaks to participate in the NROS federation. HTTP +
JSON, edge-runtime safe.

## Principles

1. **Sovereignty.** Realms own their auth, data, deploy, runtime. NROS holds
   identity + progression + the unified feed only.
2. **Bearer auth.** Server-to-server via `Authorization: Bearer nros_pk_…`.
3. **Stateless.** Every call is independent. No sessions.
4. **Idempotent where possible.** XP grants accept a `source_id`; resubmit
   with the same id ⇒ same outcome (V3: dedup enforcement).
5. **Append-only event log.** Transmissions are immutable history, not state.

## Base URL

```
https://nextrealmos.pages.dev
```

(Override via the SDK `baseUrl` if NROS is self-hosted on a custom domain.)

## Authentication

| Endpoint pattern        | Auth                                              |
| ----------------------- | ------------------------------------------------- |
| `/api/federation/realms` (POST) | Operator session (cookie) — only realm owners can register their realm |
| `/api/federation/realms` (GET)  | Public — discovery |
| `/api/federation/transmissions` (POST) | Bearer realm key, scope ≥ WRITE |
| `/api/federation/transmissions` (GET)  | Public — federated feed |
| `/api/federation/xp` (POST)            | Bearer realm key, scope ≥ WRITE |
| `/api/federation/operators/[callsign]` (GET) | Bearer realm key, scope ≥ READ |

API keys are `nros_pk_<43-char-base62>` and are **stored only as sha256 hashes**
on NROS. Lose the key, rotate it. Compromise it, revoke it.

## Endpoints

### `POST /api/federation/realms` — register a realm

Auth: NROS operator session (the realm owner).

```jsonc
// request
{
  "slug": "lastmile-os",                   // ^[a-z0-9][a-z0-9-]*[a-z0-9]$, 2–48
  "name": "LastMile OS",                   // 2–64
  "description": "Cannabis delivery SaaS", // optional, ≤280
  "base_url": "https://lastmile.example"   // optional, must be valid URL
}

// 201
{
  "realm": { "id": "uuid", "slug": "...", "name": "...", "status": "ACTIVE", ... },
  "api_key": {
    "id": "uuid",
    "value": "nros_pk_…",                  // SHOWN ONCE
    "scope": "WRITE"
  }
}
```

Errors: `400` invalid slug; `409` slug taken; `401` not signed in.

### `GET /api/federation/realms` — discover realms

Auth: none.

```jsonc
// 200
{ "realms": [{ "id": "...", "slug": "lastmile-os", "name": "...", "status": "ACTIVE", ... }] }
```

Returns only `ACTIVE` realms.

### `POST /api/federation/transmissions` — push an event

Auth: Bearer realm key (WRITE).

```jsonc
// request
{
  "kind": "MISSION_COMPLETED",            // see TransmissionKind enum
  "title": "Sentinel cleared the inbox",  // 2–140
  "body": "12 minutes, 47 emails",        // optional, ≤2000
  "operator_id": "uuid",                  // optional — link to operator
  "metadata": { "any": "json" },          // optional realm-defined payload
  "occurred_at": "2026-05-10T17:39:00Z"   // optional, defaults to now
}

// 201
{ "transmission": { "id": "...", "created_at": "..." } }
```

`TransmissionKind` ∈ `OPERATOR_JOINED · XP_AWARDED · RANK_CHANGED ·
ACHIEVEMENT_UNLOCKED · MISSION_COMPLETED · WORKFLOW_FORGED · REALM_REGISTERED ·
SYSTEM · CUSTOM`. Use `CUSTOM` for anything not in the enum.

### `GET /api/federation/transmissions` — read the feed

Auth: none.

Query: `limit` (≤200, default 50), `realm_id`, `operator_id`.

```jsonc
// 200
{ "transmissions": [{ "id":"...", "kind":"...", "title":"...", "realms":{...}, ... }] }
```

### `POST /api/federation/xp` — award XP

Auth: Bearer realm key (WRITE).

```jsonc
// request — supply EITHER operator_id OR callsign
{
  "callsign": "SENTINEL.04",
  "delta": 150,                            // -10000 ≤ delta ≤ 10000
  "reason": "Cleared inbox in 12 minutes", // 2–280
  "source_id": "uuid",                     // optional — for idempotency in V3
  "emit_transmission": true                // default true; set false to suppress feed event
}

// 200
{
  "operator_id": "uuid",
  "new_xp": 4280,
  "promoted": true,
  "new_rank": { "tier": "VANGUARD", "name": "Vanguard", "min_xp": 2500 } // null if not promoted
}
```

The grant:
- Mutates `operator_profiles.xp` (universal).
- Mirrors delta into `operator_realms.realm_xp` for your realm.
- Appends `xp_logs` row tagged with `realm_id`.
- Promotes rank automatically if the new total crosses a threshold; emits
  notification.

### `GET /api/federation/operators/[callsign]` — federated identity lookup

Auth: Bearer realm key (READ).

```jsonc
// 200
{
  "operator": {
    "id": "uuid",
    "callsign": "SENTINEL.04",
    "universal_xp": 4280,
    "rank": { "tier": "VANGUARD", "name": "Vanguard", "min_xp": 2500 },
    "avatar_url": null,
    "since": "2026-04-12T01:18:33Z"
  },
  "realms": [
    { "realm_xp": 850, "joined_at": "...", "last_active_at": "...", "realms": { "slug":"lastmile-os","name":"LastMile OS" } }
  ],
  "requested_by": { "realm": "your-slug" }
}
```

`404` if the callsign isn't registered.

## Errors

All error responses are JSON: `{ "error": "human-readable message" }`. HTTP
status carries the meaning:

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| 400    | Body validation failed                           |
| 401    | Missing / invalid / expired bearer; or no session |
| 403    | Scope insufficient for this operation; or realm not ACTIVE |
| 404    | Operator not found                               |
| 409    | Slug already taken                                |
| 5xx    | NROS-side fault                                  |

## Versioning

V2 endpoints live under `/api/federation/*`. When breaking changes ship,
NROS will introduce `/api/federation/v3/*` and run both for at least one
deprecation cycle.

## Realtime (V2.5)

Subscribe to the `transmissions` table via Supabase Realtime to receive
events as they land. Realm-side: filter by `realm_id` you care about.
NROS-side: the dashboard already subscribes to all events for the signed-in
operator's realm memberships.

## Rate limits

V2 is unlimited (developer preview). V3 will introduce per-key budgets
enforced at the edge via Cloudflare KV. Plan for ~10 req/sec sustained per
realm, with bursts allowed.
