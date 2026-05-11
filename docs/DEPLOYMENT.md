# NROS · Deployment

> Tag: **NROS_KERNEL_V1_GENESIS** · Target: **Cloudflare Pages** (`nextrealmos.pages.dev`)

## 1. One-time setup

### Supabase

1. Create a new project at <https://supabase.com>.
2. Open the SQL editor and paste/run `supabase/migrations/0001_kernel_init.sql`.
3. (Optional) Disable email confirmations for faster onboarding during V1:
   *Auth → Providers → Email → Enable email confirmations: off*.
4. Note these from *Settings → API*:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret)

### Cloudflare Pages

1. `npm install` locally first time.
2. `npm install -D @cloudflare/next-on-pages wrangler` (run once; not yet pinned in package.json).
3. Cloudflare dashboard → **Pages** → *Connect to Git* (or use direct upload via wrangler).
4. Build settings:
   - **Build command:** `npx @cloudflare/next-on-pages`
   - **Build output directory:** `.vercel/output/static`
   - **Compatibility flags:** `nodejs_compat` (Settings → Functions)
5. Project name: `nextrealmos` → URL becomes `https://nextrealmos.pages.dev`.

### AI Providers

- Anthropic: <https://console.anthropic.com> → create API key → `ANTHROPIC_API_KEY`
- OpenAI: <https://platform.openai.com/api-keys> → `OPENAI_API_KEY`

## 2. Environment variables

Set in Cloudflare Pages → *Settings → Environment variables*. Mark secrets as
**encrypted**.

| Variable                          | Scope    | Type      | Example / notes                          |
| --------------------------------- | -------- | --------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Pub+Prod | plain     | `https://xxx.supabase.co`                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Pub+Prod | plain     | `eyJ…`                                   |
| `NEXT_PUBLIC_APP_URL`             | Pub+Prod | plain     | `https://nextrealmos.pages.dev`          |
| `SUPABASE_SERVICE_ROLE_KEY`       | Prod     | **secret**| `eyJ…`                                   |
| `ANTHROPIC_API_KEY`               | Prod     | **secret**| `sk-ant-…`                               |
| `OPENAI_API_KEY`                  | Prod     | **secret**| `sk-…`                                   |
| `NROS_AI_DEFAULT_PROVIDER`        | Prod     | plain     | `anthropic` (or `openai`)                |
| `NROS_AI_DEFAULT_MODEL`           | Prod     | plain     | `claude-opus-4-7` (or `gpt-4o-mini`)     |

For preview deploys, mirror the public vars; secrets can stay prod-only.

## 3. Build & deploy (CLI route)

```bash
# build (produces .vercel/output/static)
npm run pages:build

# preview locally (uses wrangler)
npm run pages:dev   # wrangler pages dev .vercel/output/static --compatibility-flag=nodejs_compat

# deploy
wrangler login
npm run pages:deploy
```

## 4. Build & deploy (Git-connected route)

After connecting the repo in step 1, every push to `main` triggers a build.
Pull-request branches get preview URLs.

## 5. First-run smoke test

Hit `https://nextrealmos.pages.dev` and verify:

1. Landing renders, scanlines visible
2. *Activate Operator* → new account created, callsign claimed, redirected to dashboard
3. Dashboard shows rank bar (Initiate / 0 XP)
4. *Missions* → list renders with seeded starter missions
5. Open a mission → *Accept* → *Mark complete* → toast shows XP awarded
6. Open GENUBRA panel (Brain icon, top right) → ask a question → tokens stream in
7. *Workflows → Forge new* → enter an objective → roadmap renders with phases + tasks

If GENUBRA streams 0 bytes: check `ANTHROPIC_API_KEY` is set as a Pages secret
**and** the function deployed with `nodejs_compat`.

## 6. Deployment checklist

- [ ] Supabase project created
- [ ] `0001_kernel_init.sql` applied
- [ ] All env vars set in Cloudflare Pages
- [ ] `nodejs_compat` flag enabled (Settings → Functions)
- [ ] First deploy successful
- [ ] Smoke test (above) passes on the deployed URL
- [ ] Custom domain (optional) attached + Supabase auth redirect URLs updated to match
- [ ] Supabase Auth → URL Configuration → add `https://nextrealmos.pages.dev/**` to redirect allowlist
- [ ] (Recommended before public) Add per-operator rate limits on `/api/agents/genubra` and `/api/workflows`
- [ ] (Recommended before public) Wire `input_tokens`/`output_tokens` capture in `ai-router.ts`
- [ ] (Recommended before public) Add Playwright smoke covering signup → dashboard → mission complete → workflow forge

## 7. Rollback

The state tagged **NROS_KERNEL_V1_GENESIS** is the canonical rollback point.

```bash
git checkout NROS_KERNEL_V1_GENESIS
npm run pages:build && npm run pages:deploy
```

Supabase: keep migrations idempotent (the 0001 file uses `if not exists`/
`do $$ ... duplicate_object then null`). If you rollback, the schema is
forward-compatible — no destructive down-migration needed for V1.
