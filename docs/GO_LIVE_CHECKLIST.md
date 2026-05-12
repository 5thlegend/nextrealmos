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
- ✅ **AI works on free tier** — Cloudflare Workers AI (`env.AI` binding, no key needed, 10K neurons/day free)
- ⚠️ Auth + DB still stubbed — needs free Supabase (next step is one click)

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

## Step 2 — AI: pick free or paid

### Free (default) — Cloudflare Workers AI
**Already configured.** No API key needed. Uses the `env.AI` binding on the Pages
project; default model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Free tier
covers 10,000 neurons/day (≈ thousands of GENUBRA queries) with zero billing.

You only do something here if you want to upgrade to paid.

### Paid (production) — Anthropic Claude
When you're ready to ship, get an Anthropic key and flip one env var:

1. <https://console.anthropic.com/settings/keys> → Create Key → starts with `sk-ant-...`
2. Update CF Pages env vars:
   - `ANTHROPIC_API_KEY` = your key (encrypted)
   - `NROS_AI_DEFAULT_PROVIDER` = `anthropic`
   - `NROS_AI_DEFAULT_MODEL` = `claude-opus-4-7` (or whichever Claude model)
3. Redeploy: `bash deploy-from-built.sh` (or double-click `deploy.cmd`)

### Paid alt — OpenAI
Same pattern: `OPENAI_API_KEY` + `NROS_AI_DEFAULT_PROVIDER=openai` + `NROS_AI_DEFAULT_MODEL=gpt-4o-mini` (or your choice).

## Step 3 — Push the values to me, OR set them yourself

### Option A — fastest (paste them in chat)

Send me a message like:
```
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```
(AI keys only when you upgrade off the free Cloudflare AI tier — see Step 2.)

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
