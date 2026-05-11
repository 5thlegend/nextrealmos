# NROS · Database (V2 Federation)

> Tag: **NROS_KERNEL_V2_FEDERATION**
> Migrations: `supabase/migrations/0001_kernel_init.sql` + `0002_federation.sql`

## Conceptual model

```
auth.users  ──1:1──►  operator_profiles  ──N:1──►  ranks
                            │
                            ├──N:M──►  squads (via squad_members)
                            │
                            ├──N:M──►  realms (via operator_realms)         [NROS V2]
                            │            │
                            │            └──1:N──►  realm_api_keys           [NROS V2]
                            │            │
                            │            └──1:N──►  transmissions  ─────────►[event feed]
                            │
                            ├──1:N──►  mission_progress  ──N:1──►  missions   (now realm_id-scoped)
                            │
                            ├──1:N──►  xp_logs                                (now realm_id-scoped)  [LEGVCY]
                            │
                            ├──1:N──►  workflows  ──1:N──►  workflow_steps    (OBLISK — own/personal)
                            │
                            ├──N:M──►  achievements (via operator_achievements)                       [LEGVCY]
                            │
                            ├──1:N──►  notifications                          (now realm_id-scoped)  [LEGVCY]
                            │
                            └──1:N──►  ai_requests                            (now realm_id-scoped)  [LEGVCY]
```

## Tables (full V2 set — 17 tables + 4 views)

| #  | Table                  | Purpose                                                  | Layer    | RLS                                                          |
| -- | ---------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| 1  | `ranks`                | Tier ladder (Initiate → Sovereign)                       | LEGVCY   | Public read                                                  |
| 2  | `operator_profiles`    | Universal identity, callsign, XP, rank                   | NROS     | Public read; self-update; self-insert                        |
| 3  | `missions`             | Mission catalog (now realm-scoped via `realm_id`)        | nros-core realm | Read if `status = 'ACTIVE'`                          |
| 4  | `mission_progress`     | Per-operator mission state                               | nros-core realm | Self-only RW                                         |
| 5  | `xp_logs`              | Append-only XP delta ledger (realm-tagged)               | LEGVCY   | Self-read; service-role write                                |
| 6  | `squads`               | Squad metadata (federation-wide)                         | NROS     | Public read; founder update; self-create                     |
| 7  | `squad_members`        | Squad membership                                         | NROS     | Public read; self-join; self-leave                           |
| 8  | `achievements`         | Achievement catalog                                      | LEGVCY   | Public read                                                  |
| 9  | `operator_achievements`| Per-operator unlocks                                     | LEGVCY   | Self-read                                                    |
| 10 | `workflows`            | OBLISK plan headers (now realm-scoped)                   | OBLISK   | Self-only RW                                                 |
| 11 | `workflow_steps`       | Phase/task tree                                          | OBLISK   | Self-only RW (joined to parent workflow)                     |
| 12 | `ai_requests`          | Telemetry on AI calls (realm-tagged)                     | LEGVCY   | Self-read                                                    |
| 13 | `notifications`        | Per-operator system events (realm-tagged)                | LEGVCY   | Self-only RW                                                 |
| 14 | **`realms`**           | **Realm registry**                                       | NROS V2  | ACTIVE-public + owner sees own; owner-write                  |
| 15 | **`realm_api_keys`**   | **Bearer keys (sha256 hashed)**                          | NROS V2  | Owner-only read & revoke                                     |
| 16 | **`operator_realms`**  | **Operator ↔ Realm membership graph + per-realm XP**     | NROS V2  | Self-only RW                                                 |
| 17 | **`transmissions`**    | **Federated event feed**                                 | NROS V2  | Public read; service-role write (federation API)             |

### Views

| View                       | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `leaderboard_global`       | Top operators by universal XP (V1)                              |
| **`realm_activity`**       | Per-realm operator + transmission counts (V2)                   |
| **`operator_realm_summary`** | Per-operator universal XP + realm membership rollup (V2)      |

## Enums (V2 additions in **bold**)

`rank_tier · mission_status · mission_difficulty · mission_progress_state ·
xp_source · squad_role · workflow_status · workflow_step_type ·
workflow_step_status · ai_provider · ai_surface · notification_kind ·
**realm_status** (PENDING/ACTIVE/SUSPENDED/ARCHIVED) ·
**api_key_scope** (READ/WRITE/ADMIN) ·
**transmission_kind** (OPERATOR_JOINED/XP_AWARDED/RANK_CHANGED/
ACHIEVEMENT_UNLOCKED/MISSION_COMPLETED/WORKFLOW_FORGED/REALM_REGISTERED/
SYSTEM/CUSTOM)`

## Realm-scoping pattern

V2 added a **nullable** `realm_id uuid references realms(id)` to:

- `xp_logs`, `ai_requests`, `notifications`, `missions`, `workflows`

NULL = NROS-Core action (V1 behavior). Non-NULL = attributed to a realm.
The seed migration backfills existing missions with the seeded `nros-core`
realm id when one operator exists at migration time.

## API key model

- Full key shown ONCE at issuance: `nros_pk_<43 chars base62>`.
- Stored only as `sha256(full_key)` in `realm_api_keys.key_hash`.
- Plus a 16-char `key_prefix` for human identification in lists.
- Scopes: `READ` (lookup only), `WRITE` (push/award), `ADMIN` (V3-reserved).
- Revoke: set `revoked_at`. Federation auth rejects any key with non-null `revoked_at`.
- Expiry: optional `expires_at`.

## RLS helper (unchanged from V1)

```sql
create or replace function current_operator_id() returns uuid
language sql stable as $$
  select id from operator_profiles where user_id = auth.uid()
$$;
```

## Indexes (V2 additions)

- `realms(status)`, `realms(owner_operator_id)`
- `realm_api_keys(realm_id)`, partial index on active (where `revoked_at is null`)
- `operator_realms(realm_id)`, `operator_realms(operator_id)`
- `transmissions(created_at desc)` — feed
- `transmissions(realm_id, created_at desc)` — per-realm feed
- `transmissions(operator_id, created_at desc)` — per-operator feed
- `transmissions(kind, created_at desc)` — kind filter
- Partial indexes on `xp_logs.realm_id`, `missions.realm_id`, `workflows.realm_id` (where not null)

## Applying

```bash
# In Supabase SQL editor, run each migration in order:
#   supabase/migrations/0001_kernel_init.sql
#   supabase/migrations/0002_federation.sql

# Or via CLI:
supabase link --project-ref <REF>
supabase db push
```

## Known schema debt (V2)

- Hand-written `Database` type still not regenerated. Add new V2 tables when
  doing the regen pass.
- `transmissions` partition strategy not yet applied — start by `created_at`
  monthly when row count > 1M.
- `realm_xp_budgets` table planned for V2.5 to enforce per-realm daily XP
  caps (anti-inflation).
- No FK from `xp_logs.source_id` since it's polymorphic (mission, workflow,
  achievement, custom). V3 may add a typed source_kind enum.
