# NROS · Database

> Tag: **NROS_KERNEL_V1_GENESIS** · Schema: `supabase/migrations/0001_kernel_init.sql`

## Conceptual model

```
auth.users  ──1:1──►  operator_profiles  ──N:1──►  ranks
                            │
                            ├──N:M──►  squads (via squad_members)
                            │
                            ├──1:N──►  mission_progress  ──N:1──►  missions
                            │
                            ├──1:N──►  xp_logs                    [LEGVCY]
                            │
                            ├──1:N──►  workflows  ──1:N──►  workflow_steps (parent_id self-ref)
                            │
                            ├──N:M──►  achievements (via operator_achievements) [LEGVCY]
                            │
                            ├──1:N──►  notifications              [LEGVCY]
                            │
                            └──1:N──►  ai_requests                [LEGVCY]
```

## Tables

| #  | Table                  | Purpose                                                  | Layer  | RLS                                                                                  |
| -- | ---------------------- | -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 1  | `ranks`                | Tier ladder (Initiate → Sovereign)                       | NROS   | Public read                                                                          |
| 2  | `operator_profiles`    | Identity, callsign, XP, rank, squad                      | NROS   | Public read; self-update; self-insert                                                |
| 3  | `missions`             | Active mission catalog                                   | NROS   | Read if `status = 'ACTIVE'`                                                          |
| 4  | `mission_progress`     | Per-operator mission state                               | NROS   | Self-only RW (`current_operator_id()`)                                               |
| 5  | `xp_logs`              | Append-only XP delta ledger                              | LEGVCY | Self-read; service-role write                                                        |
| 6  | `squads`               | Squad metadata                                           | NROS   | Public read; founder update; self-create                                             |
| 7  | `squad_members`        | Squad membership rows                                    | NROS   | Public read; self-join; self-leave                                                   |
| 8  | `achievements`         | Achievement catalog                                      | NROS   | Public read                                                                          |
| 9  | `operator_achievements`| Per-operator unlocks                                     | LEGVCY | Self-read                                                                            |
| 10 | `workflows`            | OBLISK plan headers                                      | OBLISK | Self-only RW                                                                         |
| 11 | `workflow_steps`       | Phase/task tree (`parent_id` self-ref)                   | OBLISK | Self-only RW (joined to parent workflow)                                             |
| 12 | `ai_requests`          | Telemetry on every AI call                               | LEGVCY | Self-read                                                                            |
| 13 | `notifications`        | Per-operator system events                               | LEGVCY | Self-only RW                                                                         |
| 14 | `view: leaderboard_global` | Global XP-ordered ladder                             | NROS   | Inherits `operator_profiles` policy                                                  |

## Enums

`rank_tier` · `mission_status` · `mission_difficulty` · `mission_progress_state` ·
`xp_source` · `squad_role` · `workflow_status` · `workflow_step_type` ·
`workflow_step_status` · `ai_provider` · `ai_surface` · `notification_kind`

## RLS helper

```sql
create or replace function current_operator_id() returns uuid
language sql stable as $$
  select id from operator_profiles where user_id = auth.uid()
$$;
```

Every operator-scoped policy joins through this. Bypass requires service role
(used narrowly: signup profile insert, XP grants, telemetry writes).

## Seed data

- 6 ranks (Initiate · Operator · Vanguard · Architect · Warden · Sovereign)
- 6 starter missions covering onboarding → progression
- 5 achievements (FIRST_LIGHT, FIRST_WORKFLOW, FIRST_GENUBRA, SQUAD_FOUNDER, TOP_100)

## Indexes

- `operator_profiles(xp DESC)` — leaderboard view
- `missions(status)` — active filter
- `mission_progress(operator_id)` — per-op queue
- `xp_logs(operator_id, created_at DESC)` — ledger scroll
- `workflows(operator_id)` — list workflows
- `workflow_steps(workflow_id, order_index)` — render plan in order
- `ai_requests(operator_id, created_at DESC)` — telemetry timeline
- `notifications(operator_id, created_at DESC)` — feed scroll

## Applying / regenerating

```bash
# Option A: CLI
supabase link --project-ref <REF>
supabase db push

# Option B: paste supabase/migrations/0001_kernel_init.sql into the Supabase SQL editor

# Regenerate TS types
supabase gen types typescript --project-id <REF> > src/types/database.ts
```

## Known schema debt

- `Database` TS type is hand-written (not generated). Regenerate after first
  schema edit and re-add `<Database>` generic to supabase clients in
  `src/lib/supabase/{client,server,middleware}.ts`.
- No materialized leaderboard. Acceptable until ~10K operators; then promote
  to `MATERIALIZED VIEW` + scheduled refresh.
- `ai_requests` lacks token-count columns (`input_tokens`, `output_tokens` exist
  but are not populated). Wire SDK usage in `ai-router` once we tune cost dashboards.
