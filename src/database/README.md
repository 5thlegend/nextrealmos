# NROS Database

All schema lives in `supabase/migrations/`. This folder is reserved for query
helpers, types, and (later) generated Supabase types.

## Apply the schema

### Option A — Supabase CLI

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

### Option B — Paste & run

Open the Supabase SQL editor and run the contents of
`supabase/migrations/0001_kernel_init.sql` in one shot.

## Regenerate TypeScript types (recommended after schema edits)

```bash
supabase gen types typescript --project-id YOUR_REF > src/types/database.ts
```

The hand-written `database.ts` works for KERNEL V1 — replace it once you have
schema churn.
