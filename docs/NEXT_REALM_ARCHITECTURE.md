# Next Realm — Modular Ecosystem Architecture

> **Status:** canonical · supersedes any prior layer doc
> **Last reorg:** see git log for `feat(reorg): explicit modular layer structure`

---

## DOCTRINE — what Next Realm IS

**Next Realm is cinematic operator infrastructure for the next civilization.**

Not an agency. Not a wrapper. Not a creator brand.

The system is one ecosystem with five modular layers, each owning a
distinct mandate, all federated through the orchestration core.

**NextRealmOS is NOT a public storefront.**
It is the **internal command center + orchestration layer** that binds
every Next Realm product, realm, deployment, and operator into one
coherent civilization.

The public storefront lives in the **public layer** routes (`/`,
`/aura`, `/forge`, `/build`, `/ecosystem`, `/civilization`, public
realm + operator dossiers) — those routes share the NROS deploy today
but are conceptually separate from the orchestration layer below.

---

## THE FIVE LAYERS

### 1 · ORCHESTRATION
> NextRealmOS internal command core. Where the operator runs the system.

| Owns | Does NOT own |
|---|---|
| Real-time federation pulse, transmission feed, live signal grid | Public marketing copy |
| Operator's command surface (`/dashboard`) | Outside-world acquisition |
| Cross-realm event router (`pushTransmission`) | Subscription checkout flow (that lives in MONEY) |
| Identity reconciliation (mirror RPC, callsign uniqueness) | Realm-internal product UX |

**Routes (auth-gated):**
- `/dashboard` — Command. Today's briefing, mission queue, recent achievements, federation pulse.
- `/transmissions` — Federated event feed with filters.

**Services:**
- `transmission-service.ts`
- `analytics-service.ts` (federation pulse)
- Federation auth + rate limiter

---

### 2 · FEDERATION
> Sovereign realms, identity, the civilization graph.

| Owns | Does NOT own |
|---|---|
| Realm registry (active + vaulted) | The internals of any single realm |
| Realm Graph Engine UI (governance surface) | Stripe checkout (MONEY) |
| Operator identity + cross-realm presence | AI cognition (INTELLIGENCE) |
| Wonders (permanent marquee builds) | Mission generation (INTELLIGENCE) |
| Squads / guilds | |

**Routes:**
- `/grid` — Realm Graph Engine. React-Flow node graph reading `realm_graph_nodes` view.
- `/realms` — Auth: realm membership index.
- `/wonders` — Auth: federation marquee.
- `/squads` — Auth: operator collectives.
- `/operator` — Auth: own profile.

**Public mirrors (storefront):**
- `/civilization` — public galaxy view + pulse.
- `/realms/[slug]` — public realm dossier.
- `/realms/[slug]/admin` — owner-only governance.
- `/operator/[callsign]` — Steam-style public dossier.

**Services:**
- `realm-service.ts`, `civilization-service.ts`, `wonder-service.ts`,
  `squad-service.ts`, `operator-service.ts`

---

### 3 · INTELLIGENCE
> GENUBRA cognition + OBLISK execution. The brain + the workshop.

| Owns | Does NOT own |
|---|---|
| Mission generation (GENUBRA architect) | Mission XP rewards (those credit MONEY) |
| Daily briefing | Operator dossier (FEDERATION) |
| Workflow decomposition (OBLISK) | Realm registration (FEDERATION) |
| Aura Scanner (the AI scoring surface) | The federation feed (ORCHESTRATION) |

**Routes:**
- `/missions` — Auth: mission queue + accept/complete UI.
- `/missions/new` — Auth: GENUBRA mission architect (3-5 calibrated drafts → publish).
- `/workflows` — Auth: OBLISK workflow library.
- `/workflows/new` — Auth: workflow forge.

**Public surfaces in this layer:**
- `/aura` — public Aura Scanner landing.
- `/aura/scan/[token]` — public scan result.

**Services:**
- `agents/genubra.ts`, `agents/oblisk.ts`, `agents/mission-generator.ts`,
  `agents/aura-scanner.ts`
- `aura-service.ts`, `mission-service.ts`, `workflow-service.ts`
- `ai-router.ts` + provider adapters

---

### 4 · MONEY
> Armory, cashflow, marquee — every dollar that touches the federation.

| Owns | Does NOT own |
|---|---|
| Money Factory armory (rank-gated app catalog) | Mission XP (that lives in INTELLIGENCE) |
| Realm subscription tiers + pricing | Realm dossiers (FEDERATION) |
| Stripe checkout sessions + webhook reconciliation | Operator profile (FEDERATION) |
| Subscription intents (lead capture) | |
| Achievements + leaderboard (the operator score) | |

**Routes:**
- `/armory` — Auth: rank-gated Money Factory armory.
- `/achievements` — Auth: trophy hall + tech tree.
- `/leaderboard` — Auth: global ladder.
- `/realms/[slug]/tiers` — public tier ladder for any realm (intent-capturing).

**Services:**
- `monetization-service.ts`, `achievement-service.ts`, `leaderboard-service.ts`
- `stripe-service.ts` (Edge REST client)
- `xp-service.ts`

**API:**
- `POST /api/subscription/intent` — lead capture + Stripe checkout (when configured)
- `POST /api/stripe/webhook` — checkout.session.completed reconciliation

---

### 5 · PUBLIC LAYER (storefront)
> Where the outside world meets the ecosystem. Conversion-led, cinematic, premium.

This layer is **a presentation skin over the four orchestration layers**, not its own data layer. Every public surface reads from FEDERATION + INTELLIGENCE + MONEY.

| Surface | What it does | Closes to |
|---|---|---|
| `/` | Internal Command landing (Cormorant + magma) | Enlist · Aura · Forge · Ecosystem |
| `/aura` | Viral acquisition engine | scan → result → audit/forge mailto |
| `/forge` | Public service gateway | Audit ($497) · Upgrade ($2.5K) · Forge ($9.9K/mo) |
| `/build` | Building-in-public timeline | Aura · Forge · Ecosystem |
| `/ecosystem` | Complete civilization map | Enlist · Aura · Forge |
| `/civilization` | Public galaxy view | Sign in · Enlist |
| `/realms/[slug]` | Public realm dossier | Subscribe · Open realm · Talk |
| `/operator/[callsign]` | Steam-style profile | Federation cross-link |

Visual contract: `.nr-skin` wrapper + Cormorant Garamond display +
magma `#FF5A36` accent + gold `#D6A756` premium + near-black `#0A0A0B`
canvas. Defined in `globals.css`.

---

## ECOSYSTEM SUBDOMAIN MAP (target state)

The blueprint's subdomain layout. NROS today serves multiple of these
under one deploy; future moves can split as traffic warrants.

| Subdomain | Layer | Status today |
|---|---|---|
| `os.nextrealmforge.com`         | ORCHESTRATION  | served from `nextrealmos.pages.dev/dashboard` |
| `forge.nextrealmforge.com`      | PUBLIC GATEWAY | served from `nextrealmos.pages.dev/forge` |
| `aura.nextrealmforge.com`       | INTELLIGENCE   | served from `nextrealmos.pages.dev/aura` |
| `operators.nextrealmforge.com`  | FEDERATION     | `nextrealm-operators.dankpenta.workers.dev` |
| `apps.nextrealmforge.com`       | MONEY          | `nr-money-factory.pages.dev` |

The federation API (`/api/federation/*`) is the contract every
subdomain consumes — same identity, same XP, same transmissions feed.

---

## REORGANIZATION RULES

When adding a new feature, ask:

1. **Which layer does it live in?** If unclear, it's probably the wrong feature.
2. **Does it federate?** If yes → emit a transmission with a dotted `event_name`.
3. **Does it cost money?** If yes → it lives in MONEY, captures intents, runs through `subscription_intents` first.
4. **Is it a public surface?** If yes → use `.nr-skin` + Cormorant + magma. Internal surfaces stay in the cyan/violet command-center palette.
5. **Does it duplicate identity?** If yes → use the canonical NROS callsign registry (`nros_register_realm_operator` RPC). Realms keep their own auth; NROS dedupes globally by `email_hash` → `callsign`.

When refactoring, ask:

1. **Is this code in the right layer?** Move it if not.
2. **Does this surface match the layer's visual contract?** Reskin if not.
3. **Does this break the federation API contract?** If yes → version it under `/api/v1/...`.

---

## WHAT TO BUILD NEXT (post-foundation)

Per the 14-day blueprint:

- **Day 11-14 MONEY:** activate Stripe (drop secret keys + price IDs → cashflow circuit closes).
- **Day 15+ INTELLIGENCE:** add OBLISK realm-scaffolding (one prompt → new realm registered + initial schema + base_url stubbed).
- **Day 15+ FEDERATION:** ship `operators.nextrealmforge.com` migration (move OG public dossiers under the canonical subdomain).
- **Day 15+ ORCHESTRATION:** auto-emit "build log" transmissions on every git push (CI hook into transmissions API).

---

## ANTI-PATTERNS

- ❌ Adding a public marketing route inside `(dashboard)/` — mixes the layers.
- ❌ Creating a new auth source for a realm app — every realm consumes the canonical NROS callsign registry.
- ❌ Adding cinematic Cormorant + magma to the dashboard — internal surfaces stay in the command-center palette.
- ❌ Skipping the federation transmission on a meaningful event — the feed is the civilization's pulse.
- ❌ Hardcoding pricing inline — every tier lives in `realm_subscription_tiers`.

---

*If something violates the doctrine and ships anyway, document it here and refactor on the next pass. The doctrine is enforced by code organization, not policy.*
