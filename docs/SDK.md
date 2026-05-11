# `@nros/sdk` — Realm Client Reference

> Tag: **NROS_KERNEL_V2_FEDERATION** · Source: [`packages/sdk`](../packages/sdk)

TypeScript SDK realms install to talk to the NROS federation. Edge-runtime
safe. `fetch`-only. Zero deps.

## Install

```bash
npm install @nros/sdk
```

> While the SDK is published locally inside this repo (V2 ships the source
> as `packages/sdk`), realms can install it directly via npm path or git URL
> until first official npm publish.

## Construct

```ts
import { NrosClient } from "@nros/sdk";

const nros = new NrosClient({
  baseUrl: "https://nextrealmos.pages.dev",  // or your self-hosted NROS
  apiKey:  process.env.NROS_API_KEY!,        // begins with nros_pk_
  fetch:   customFetch,                       // optional — for retries/tracing
});
```

`apiKey` validation throws synchronously if the prefix is missing — better
to fail at boot than surprise on the first request.

## Surfaces

### `nros.transmissions`

```ts
await nros.transmissions.push({
  kind: "MISSION_COMPLETED",
  title: "Sentinel cleared the inbox",
  body: "12 minutes, 47 emails",          // optional
  operator_id: "uuid",                     // optional
  metadata: { mission: "inbox-zero" },     // optional
  occurred_at: "2026-05-10T17:39:00Z",     // optional, defaults to now
});

const { transmissions } = await nros.transmissions.list({
  limit: 25,
  operator_id: "uuid",                     // optional filter
});
```

### `nros.xp`

```ts
const { new_xp, promoted, new_rank } = await nros.xp.award({
  callsign: "SENTINEL.04",                 // OR operator_id
  delta: 150,                               // -10000..10000
  reason: "Cleared inbox in 12 minutes",
  source_id: crypto.randomUUID(),          // optional — V3 dedup
  emit_transmission: true,                 // optional, default true
});

if (promoted) {
  console.log(`${new_rank?.name} unlocked at ${new_xp} XP`);
}
```

### `nros.operators`

```ts
const { operator, realms } = await nros.operators.lookup("SENTINEL.04");
// operator.id / .universal_xp / .rank?.name / .since
// realms[].realm_xp — per-realm scores
```

### `nros.realms`

```ts
const { realms } = await nros.realms.list();
// public discovery — only ACTIVE realms
```

## Errors

```ts
import { NrosError } from "@nros/sdk";

try {
  await nros.xp.award({ callsign: "GHOST", delta: 100, reason: "test" });
} catch (e) {
  if (e instanceof NrosError) {
    console.error(e.status, e.message, e.data);
    // e.status: 400 / 401 / 403 / 404 / 409 / 5xx
  } else throw e;
}
```

| Status | Typical cause | Recommended action |
| ------ | ------------- | ------------------ |
| 400    | Body validation failed | Fix the payload — `e.message` says what's wrong |
| 401    | Bad / revoked key | Rotate; alert ops |
| 403    | Scope insufficient OR realm SUSPENDED | Use a higher-scope key OR contact NROS admin |
| 404    | Operator callsign not found | Surface "create a NROS identity first" to the user |
| 409    | Slug taken (registration only) | Pick another slug |
| 5xx    | NROS-side fault | Retry with exponential backoff; consider degraded mode |

## Retry guidance

The SDK does **not** retry by default — that's a deliberate choice; retries
on user-visible actions can cause double-grants. Wrap the SDK in your own
retry middleware if you need it (or pass a custom `fetch`).

For `xp.award`, V3 will support deduplication via `source_id` so retries
become safe. For V2, ensure your `source_id` is consistent across retries.

## Realtime (V2.5)

Subscribe directly to the `transmissions` table via Supabase Realtime from
inside your realm — no SDK call needed. Use your own anon key against the
NROS Supabase URL with row filter `realm_id = eq.<your-uuid>`.

## Testing

The SDK ships no built-in mock client. Recommended pattern:

```ts
// in your realm's tests
import { NrosClient } from "@nros/sdk";

const fakeFetch = (async (url, init) => {
  // assert + return canned Response
}) as typeof fetch;

const client = new NrosClient({
  baseUrl: "https://nros.test",
  apiKey: "nros_pk_test1234567890123456",
  fetch: fakeFetch,
});
```

## Roadmap

| Version | Adds |
| ------- | ---- |
| 0.2     | Built-in retry helper · `source_id` dedup once V3 lands |
| 0.3     | SSO helpers — issue/verify operator JWTs |
| 0.4     | Streaming GENUBRA queries from realms (with operator consent) |
| 1.0     | Stable contract — first npm publish, semver lockstep with NROS API |
