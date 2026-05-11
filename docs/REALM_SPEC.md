# Realm Specification — V2

> Tag: **NROS_KERNEL_V2_FEDERATION**

A **realm** is any independently deployable operator-facing app or system
that participates in the NROS federation. This spec defines what a realm
is, what it must do, what it should do, and what it may do.

## Definition

A realm is anything that:

1. Has at least one human-or-agent **operator** as its primary user,
2. Speaks the [Federation Protocol](./FEDERATION_PROTOCOL.md) (directly or
   via `@nros/sdk`), AND
3. Is **registered** in NROS via `/api/federation/realms`.

Form factors NROS already supports:

- Web app (Next.js, SvelteKit, Astro, plain HTML)
- Cloudflare Worker / serverless function
- Native mobile (iOS, Android)
- Native desktop (Tauri, Electron)
- Discord / Slack / Telegram bot
- CLI tool
- Background daemon / cron job
- Embedded / IoT firmware (yes — anything with HTTPS-capable runtime)

## Sovereignty contract

A realm **owns and operates**:

- ✅ Its own auth UI (sign-in, sign-up, password reset)
- ✅ Its own data store (Postgres / D1 / SQLite / MongoDB / nothing)
- ✅ Its own deploy target, billing, runtime, scaling
- ✅ Its own UI/UX language (not bound to NROS's cybernetic theme)

A realm **does not** own:

- ❌ The operator's universal callsign (lives in NROS)
- ❌ The operator's universal XP / rank (lives in NROS)
- ❌ The transmissions feed itself (NROS hosts it; realm pushes into it)

## Identity model

Operators have **one callsign across the federation**. When a new operator
appears in your realm, two flows are valid:

### Flow A — operator already exists in NROS

Realm asks operator for their callsign → realm verifies via
`GET /api/federation/operators/[callsign]` → realm stores `operator_id` in
its own database to link its records to the federated identity.

### Flow B — operator does not yet exist (new to the federation)

Realm sends operator to NROS to activate identity:
`https://nextrealmos.pages.dev/sign-up?return_to=<your-realm-url>` (V3 — not
yet implemented; for V2, point them at NROS sign-up and capture the
callsign on return).

After Flow B, realm continues with Flow A.

## MUST

A realm MUST:

1. Authenticate to NROS using a bearer API key (one per realm minimum).
2. Hash and protect the API key like any production secret. **Never** ship
   a key in client-side code.
3. Honor revocation — on a `401 Token revoked` response, fall back to a
   newer key or surface an admin alert.
4. Push at least one transmission per significant operator action so the
   federated feed reflects realm activity.
5. Store the operator's NROS `operator_id` (uuid) as the canonical link, not
   the callsign string (callsigns are unique but mutable in V3).

## SHOULD

A realm SHOULD:

1. Award XP for meaningful operator achievements via `POST /api/federation/xp`.
2. Use scope-tagged keys: `READ` for analytics dashboards, `WRITE` for
   action endpoints, `ADMIN` (V3) for federation-management operations.
3. Set `source_id` on XP grants to a stable per-action identifier (your
   internal id) — V3 will use it for dedup.
4. Provide a `base_url` so operators can navigate from NROS to your realm.
5. Provide an `icon_url` (V2.5 — column already exists) so the realm shows a
   recognizable mark in the registry.

## MAY

A realm MAY:

1. Offer SSO via NROS once V3 SSO ships (currently each realm has its own
   auth UI).
2. Embed the NROS GENUBRA panel via iframe with operator-scoped auth (V3).
3. Subscribe to the `transmissions` table via Supabase Realtime to react to
   events from other realms.
4. Run entirely self-hosted with its own NROS instance (federation is
   protocol-based, not hosted-coupled).

## Realm lifecycle

```
PENDING ──(owner registration approved)──▶ ACTIVE ──(owner archives)──▶ ARCHIVED
                                              │
                                              └──(NROS admin suspends)──▶ SUSPENDED ──(unsuspend)──▶ ACTIVE
```

In V2, registration is **auto-approved** for all owner-operators (no
moderation queue). V3 will add an admin-review gate before opening
federation to public realm authors.

## Example: minimal realm integration

```ts
// somewhere in your realm's server
import { NrosClient } from "@nros/sdk";

const nros = new NrosClient({
  baseUrl: "https://nextrealmos.pages.dev",
  apiKey: process.env.NROS_API_KEY!,
});

// when an operator does the thing in your realm:
async function onMissionCompleted(operatorCallsign: string, missionTitle: string) {
  await nros.xp.award({
    callsign: operatorCallsign,
    delta: 200,
    reason: missionTitle,
    source_id: crypto.randomUUID(),  // dedup hint for V3
  });
  await nros.transmissions.push({
    kind: "MISSION_COMPLETED",
    title: `${operatorCallsign} completed: ${missionTitle}`,
  });
}
```

That's it. Your realm is now federated. Operators see the activity in their
NROS dashboard. XP feeds rank progression. GENUBRA can reference the
transmission when reasoning about the operator.
