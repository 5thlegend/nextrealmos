# @nros/sdk

Official TypeScript SDK for realms in the **NROS federation**.

A *realm* is any independently deployable operator-facing app (web, native,
bot, CLI). NROS gives every realm:

- **Universal operator identity** — operators have one callsign across the federation
- **Shared XP & rank** — XP awarded by any realm aggregates universally
- **Transmissions feed** — a federated event stream operators see in their NROS dashboard
- **Cross-realm telemetry** — usage signals visible to GENUBRA cognition

## Install

```bash
# inside your realm
npm install @nros/sdk
```

## Bootstrap

1. Sign in to NROS at <https://nextrealmos.pages.dev> as the realm's owner-operator.
2. Go to *Realms → Register* and create your realm. You'll be shown an **API key
   exactly once** (begins with `nros_pk_`). Store it as `NROS_API_KEY` in your
   realm's secrets.

## Use

```ts
import { NrosClient } from "@nros/sdk";

const nros = new NrosClient({
  baseUrl: "https://nextrealmos.pages.dev",
  apiKey:  process.env.NROS_API_KEY!,
});

// Push an event to the federated feed
await nros.transmissions.push({
  kind: "MISSION_COMPLETED",
  title: "Sentinel cleared the inbox",
  operator_id: "abc-...-uuid",            // OR pass callsign in xp.award
  metadata: { mission_id: "inbox-zero" },
});

// Award XP — counts against universal rank + per-realm score
await nros.xp.award({
  callsign: "SENTINEL.04",
  delta: 150,
  reason: "Inbox cleared",
});

// Look up a federated operator
const { operator, realms } = await nros.operators.lookup("SENTINEL.04");
console.log(operator.universal_xp, operator.rank?.name);
```

## Methods

| Surface              | Method                    | Scope    | Returns                           |
| -------------------- | ------------------------- | -------- | --------------------------------- |
| `transmissions.push` | POST event to feed        | WRITE    | `{ transmission }`                |
| `transmissions.list` | Read feed (filtered)      | READ     | `{ transmissions[] }`             |
| `xp.award`           | Grant XP to operator      | WRITE    | `{ new_xp, promoted, new_rank }`  |
| `operators.lookup`   | Federated identity lookup | READ     | `{ operator, realms[] }`          |
| `realms.list`        | Discover other realms     | READ     | `{ realms[] }`                    |

## Errors

Every non-2xx response throws an `NrosError` with `status`, `message`, and the
raw `data` payload from NROS:

```ts
import { NrosError } from "@nros/sdk";
try {
  await nros.xp.award({ callsign: "GHOST", delta: 100, reason: "test" });
} catch (e) {
  if (e instanceof NrosError && e.status === 404) {
    // Operator doesn't exist — they need to sign up at NROS first
  }
}
```

## Edge runtime

The SDK uses `fetch` only. Works in Node ≥18, Cloudflare Workers, Vercel
Edge, Bun, Deno.

## Auth model

Bearer token in `Authorization: Bearer nros_pk_…`. Keys are scope-tagged:

- **READ** — discovery + lookups only
- **WRITE** (default) — push events + award XP
- **ADMIN** — reserved for future federation-management calls

Rotate keys via the NROS dashboard (*Realms → [your realm] → Keys → Revoke*).
The realm receiving 401 with "Token revoked" should fall back to its newest
non-revoked key.
