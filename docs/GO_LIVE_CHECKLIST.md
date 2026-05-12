# Go-Live Checklist — Activate Real Backend

> The SSR shell is already deployed at **<https://nextrealmos.pages.dev>**.
> This checklist takes the app from "shell live with stubs" → "fully functional with real auth + AI".
> Estimated time: **5 minutes** of clicks + 1 minute of redeploy.

## What you have now

- ✅ Live URL responding: `https://nextrealmos.pages.dev`
- ✅ All 18 routes serving correctly (smoke tested)
- ✅ Auth gate working (protected pages redirect to /sign-in)
- ✅ Federation API live (`/api/federation/realms` returns `{"realms":[]}`)
- ✅ GitHub Actions auto-builds on every push to `main`
- ⚠️ All backend calls hit stub URLs — no auth, no DB, no AI yet

## Step 1 — Create Supabase project (~2 min)

1. Go to <https://supabase.com> → **New project**
2. Name: `nros-kernel` · Region: closest to you · Set a strong DB password
3. Wait for provisioning (~90 sec)
4. **SQL Editor** → New query → paste the contents of:
   - `supabase/migrations/0001_kernel_init.sql` → **Run**
   - `supabase/migrations/0002_federation.sql` → **Run**
5. **Settings → API** → copy these three values:
   - Project URL  →  `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key   →  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key  →  `SUPABASE_SERVICE_ROLE_KEY`
6. **Authentication → URL Configuration** → add to redirect allowlist:
   ```
   https://nextrealmos.pages.dev/**
   https://*.nextrealmos.pages.dev/**
   ```

## Step 2 — Get AI keys (~1 min each)

- **Anthropic** — <https://console.anthropic.com/settings/keys> → Create Key → starts with `sk-ant-...` → save as `ANTHROPIC_API_KEY`
- **OpenAI** (optional, only if you set `NROS_AI_DEFAULT_PROVIDER=openai`) — <https://platform.openai.com/api-keys> → Create new secret key → save as `OPENAI_API_KEY`

## Step 3 — Push the values to me, OR set them yourself

### Option A — fastest (paste them in chat)

Send me a message like:
```
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```
I'll PATCH them into the Cloudflare Pages project via the CF API and redeploy. Live in ~30 sec.

### Option B — set them yourself in Cloudflare dashboard

<https://dash.cloudflare.com> → Workers & Pages → `nextrealmos` →
**Settings → Variables and Secrets → Production**

Replace these 5 stub values:

| Name | Value | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase | Plaintext |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase | Plaintext |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase | Encrypted |
| `ANTHROPIC_API_KEY` | from Anthropic | Encrypted |
| `OPENAI_API_KEY` | from OpenAI | Encrypted |

`NEXT_PUBLIC_APP_URL` already set to `https://nextrealmos.pages.dev` — leave alone.

Then redeploy: double-click `deploy.cmd` in the project root, OR run `bash deploy-from-built.sh`.

## Step 4 — Verify end-to-end

1. https://nextrealmos.pages.dev/sign-up → create operator with a callsign
2. Should redirect to `/dashboard` after activation
3. Click brain icon (top-right) → GENUBRA panel opens → ask anything → tokens stream in
4. `/workflows/new` → enter an objective → OBLISK decomposes into phases + tasks
5. `/missions` → accept the seeded "First Signal" mission → mark complete → +250 XP awarded
6. `/leaderboard` → your callsign appears

If any step fails, screenshot it to me and I fix in the next push.

---

## Future deployments (no checklist needed)

```bash
# Make code changes
git add . && git commit -m "..." && git push origin main

# Wait ~3-4 min for GH Actions to build (https://github.com/5thlegend/nextrealmos/actions)

# Deploy the new build:
bash deploy-from-built.sh
# OR double-click deploy.cmd
```

That's the whole loop now. The CF Pages project, env vars, and compatibility flag are all set permanently.

---

## Reference

- **Live URL:** https://nextrealmos.pages.dev
- **Repo:** https://github.com/5thlegend/nextrealmos
- **CF account ID:** `869002bb49acbb6b6e30d499b587c929`
- **CF Pages project:** `nextrealmos`
- **CF compat flag set:** `nodejs_compat` (production + preview)
- **Schema migrations:** `supabase/migrations/0001_kernel_init.sql` + `0002_federation.sql`
- **Build log branch (always-current):** `git fetch origin build-log && git show build-log:build.log`
- **Built artifacts branch:** `built-output` (force-pushed by GH Actions on every successful build)
