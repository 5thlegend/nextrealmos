# Deploy Log

## 2026-05-10 — V1 GENESIS landing live

**Live URL:** <https://nextrealmos.pages.dev>
**This deploy:** <https://ad4ae7d2.nextrealmos.pages.dev>
**Project:** Cloudflare Pages · `nextrealmos`
**Account:** `dankpenta@gmail.com` (`869002bb49acbb6b6e30d499b587c929`)
**Commit:** `99745a2` (tag `NROS_KERNEL_V1_GENESIS`)
**Deployed surface:** Static landing only (single `dist-landing/index.html`).

### What's live now

The cybernetic landing page (hero + 4 pillar cards + status panel + footer).
Every link is informational — no auth, no dashboard, no AI panel yet. The
landing honestly states: *"Operator activation comes online once Supabase
wires through."*

### What is NOT live yet

The full SSR Next.js kernel (auth, dashboard, missions, squads, leaderboard,
GENUBRA panel, OBLISK engine). The build pipeline is blocked on Windows by
two compounding issues:

1. **`spawn npx ENOENT`** — `@cloudflare/next-on-pages` spawns `npx` from
   a child process, and Node on Windows doesn't auto-resolve the `.cmd`
   extension when invoked from inside another node process.
2. **`EPERM symlink`** — when run via PowerShell, `vercel build` (which
   `next-on-pages` invokes internally) creates symlinks between deduplicated
   serverless functions. Symlink creation requires Developer Mode or
   admin on Windows.

The kernel **does** build cleanly with plain `next build` (already verified
this session — see commit log). Only the Vercel-output → CF-Pages-output
conversion fails on Windows.

### Path to full SSR deploy (any of these)

| Option                  | Effort | Notes                                                                 |
|-------------------------|--------|-----------------------------------------------------------------------|
| **GitHub → CF Pages CI**| S      | Push the repo to GitHub, connect it in CF dashboard. Linux build runner — none of the Windows issues hit. *Recommended.* |
| **Run from WSL**        | M      | `wsl --install`, then build + deploy from inside Ubuntu               |
| **Run on a Linux VM / cloud shell** | M | `gh codespaces` or any Linux box; build + `wrangler pages deploy`     |
| **Switch adapter**      | M      | Try `@opennextjs/cloudflare` (newer, but Windows still untested)      |
| **Enable Windows Developer Mode** | S | Settings → For developers → Developer Mode On. Then `vercel build` symlinks succeed. |

### To finish the deploy (recommended path)

```bash
# 1. Create a GitHub repo (manually via web, or with gh CLI later)
git -C NROS_KERNEL remote add origin git@github.com:<you>/nros-kernel.git
git -C NROS_KERNEL push -u origin main
git -C NROS_KERNEL push origin NROS_KERNEL_V1_GENESIS

# 2. In Cloudflare dashboard → Pages → nextrealmos → Settings → Builds & deployments
#    Connect to Git → select the GitHub repo
#    Build command:        npx @cloudflare/next-on-pages
#    Build output dir:     .vercel/output/static
#    Root directory:       /
#    Environment variables: see docs/DEPLOYMENT.md §2
#    Functions compatibility flag: nodejs_compat (Settings → Functions)

# 3. Wire Supabase
#    Create project at supabase.com
#    Run supabase/migrations/0001_kernel_init.sql in SQL editor
#    Set the 5 secrets in CF Pages env (anon, service-role, app URL, ANTHROPIC, OPENAI)
#    Trigger redeploy (push any commit, or click "Retry deployment")
```

### Commands used in this deploy

```bash
# Create the project
./node_modules/.bin/wrangler pages project create nextrealmos --production-branch main

# Deploy the landing
./node_modules/.bin/wrangler pages deploy dist-landing \
  --project-name=nextrealmos --branch=main --commit-dirty=true
```

## 2026-05-10 21:09 — V2 federation landing deployed

**Live URL:** <https://nextrealmos.pages.dev>
**This deploy:** <https://07fc7365.nextrealmos.pages.dev>
**Verified:** HTTP 200 · 12,351 bytes
**Commit:** `c42c03f` (tag `NROS_KERNEL_V2_FEDERATION`)

### What's live
Updated landing reflecting the V2 federation pivot: five-layer model
(GENUBRA · NROS · OBLISK · LEGVCY · REALMS), what-the-federation-provides
panel, `@nros/sdk` integration snippet, V2 stat block.

### What is still NOT live
The full SSR federation app (`/realms`, `/realms/new`, `/realms/[slug]`,
`/transmissions`, `/dashboard`, the federation API, the GENUBRA panel).
Same Windows blocker as V1: `vercel build` reaches the function-symlink
phase and either fails with `EPERM` or hangs indefinitely (this attempt
hung for 24 min with zero output, then was force-killed).

The path to full SSR deploy is unchanged from V1 GENESIS:
1. **(Recommended)** Push to GitHub → connect Cloudflare Pages → build runs on Linux
2. Enable Windows Developer Mode (Settings → For developers → Developer Mode → On) → re-run `vercel build`
3. Build from WSL (`wsl --install`) → deploy from there

---

## 2026-05-11 12:09 — **SSR APP LIVE** at nextrealmos.pages.dev

**Live URL:** <https://nextrealmos.pages.dev>
**This deploy:** <https://e9192e91.nextrealmos.pages.dev>
**Commit:** `003ac0f` on `main`
**Verified routes:**
- `GET /` → HTTP 200 · 20.6 KB (Next.js SSR landing with full font loading)
- `GET /sign-in` → HTTP 200 · 12.6 KB (Suspense-wrapped form rendered)
- `GET /dashboard` → HTTP 307 (middleware redirect to /sign-in; auth gating works)
- `GET /transmissions` → HTTP 307 (auth gating)
- `GET /api/federation/realms` → HTTP 200 · `{"realms":[]}` (federation API live)

### How it shipped

Bypassed the Cloudflare Pages dashboard git connection entirely. Pipeline:

1. **GitHub Actions** (`.github/workflows/build.yml`) on every push to `main`:
   - `ubuntu-latest` runner with Node 22
   - `npm install --legacy-peer-deps`
   - `npx @cloudflare/next-on-pages@1` builds `.vercel/output/static`
   - Stashes built output to `/tmp/built` before destroying tree
   - Force-pushes contents to `built-output` branch
   - Publishes build log to `build-log` branch (every run, even on failure)
2. **Local** `deploy-from-built.sh` script:
   - `git fetch origin built-output`
   - `git worktree add /tmp/nros-built built-output`
   - `wrangler pages deploy /tmp/nros-built --project-name=nextrealmos --branch=main`
   - Cleans up worktree
3. **Cloudflare API** (via wrangler OAuth token):
   - `PATCH /accounts/{id}/pages/projects/nextrealmos` to set `nodejs_compat`
     compatibility flag on production + preview
   - Same call sets 6 env vars (3 plain, 3 secrets) — all stub values for V2

### Build evolution (each push triggered a new build)

| sha | Status | Fix |
|---|---|---|
| 6f58572 | failure | Initial workflow scaffold |
| 147d371 | failure | Added build-log branch capture |
| 5545abd | success (build) / failure (publish) | Added edge runtime to `/auth/sign-out` |
| 003ac0f | **success** | Stashed `/tmp/built` before destroying tree |

### What's deployed but stubbed

Auth, dashboard, missions, squads, leaderboard, workflows, GENUBRA panel,
OBLISK engine, federation API — all rendering. Backend calls go to stub
URLs and return graceful empty responses.

### Pending — real backend wiring

To activate full functionality:

1. **Supabase project** — create at supabase.com, run
   `supabase/migrations/0001_kernel_init.sql` + `0002_federation.sql`
2. **API keys** — Anthropic + OpenAI from their consoles
3. **Update Pages env vars** — replace stub values via API or dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
4. Trigger redeploy (push any commit OR call wrangler deploy again)
