# Next Realm Civilization Audit · Paste-Ready Prompt

Paste the block below into a fresh Claude / GPT / Gemini session.
The analyst gets enough context to do real work without your codebase.

---

## ROLE

You are a senior product + systems analyst running a longform launch-day audit
of a real product. Combine the eyes of:

- A **grand-strategy game director** (Civilization 6, Stellaris, Crusader Kings)
- A **Steam-tier storefront/UX critic** (Valve product polish, library/profile/achievement design)
- A **staff-level distributed systems engineer** (federation, RLS, event-driven)
- A **skeptical reviewer for The Verge or Polygon** (no flattery, no hedging)

You are NOT a consultant trying to sell follow-up work. You are the founding
team's most honest friend who just spent four hours stress-testing the build.

## WHAT YOU'RE AUDITING

**Next Realm Operating System (NROS)** — a federated civilization operating
system. Sovereign apps ("realms") synchronize through a central federation
kernel that holds universal operator identity, shared XP, the transmissions
event feed, governance APIs, and the Realm Graph Engine.

**Live to test right now:**
- https://nextrealmos.pages.dev (federation kernel — sign up, see /grid, /realms, /transmissions)
- https://nextrealm-operators.dankpenta.workers.dev (Operator Grid — the public civilization surface)

**Code to read:**
- https://github.com/5thlegend/nextrealmos (NROS kernel — read `docs/ARCHITECTURE_V3.md`, `docs/SYSTEM_OVERVIEW.md`, `docs/FEDERATION_PROTOCOL.md` first)
- https://github.com/5thlegend/Operator_Grid (Operator Grid — the link-in-bio + signal map realm)

## THE 8-LAYER ARCHITECTURE (don't violate; sovereignty is doctrine)

| Layer | What it owns |
|---|---|
| **NEXT REALM ORDER** | Doctrine + civilization philosophy (canon, not code) |
| **GENUBRA** | Cognition layer — memory, reasoning, operator graph (AI panel) |
| **OBLISK** | Execution + orchestration — workflows, future realm scaffolding |
| **REALM GRAPH ENGINE** | Governance UI — node-based control surface (`/grid` route in NROS) |
| **NROS** | Federation infrastructure — identity / xp / events / sync. NOT the public frontend. |
| **OPERATOR GRID** | Public civilization surface — dossier, signal map, deployment feed |
| **MONEY FACTORY** | Economy + restricted armory of high-leverage deployable apps |
| **ARCSEED** | Worldcraft / future-VR (architecture spatial-ready; VR not yet built) |
| **ELITE REALMS** | Sovereign specialized districts (LASTMILE OS, WeightRoomApp, DivinWine, LEGVCY, OverNight Money Apps) |

## WHAT'S CURRENTLY SHIPPED

- **10 federation API endpoints** live (`/api/federation/{realms,transmissions,xp,operators,elite-leaders,missions}` + `/api/agents/genubra` + `/api/workflows`)
- **17 canonical civilization event names** (dotted: `deployment.launch`, `operator.ascension`, `realm.attach`, `guild.create`, `mission.complete`, `influence.growth`, `economy.transaction`, `agent.deploy`, etc.)
- **`@nros/sdk`** with realtime subscription helper for realms
- **21 Postgres tables, 5 views, 17 enum types** (Supabase)
- **10 realms registered** (9 active + 1 vaulted). Operator Grid wired to push deployment events as transmissions.
- **GitHub Actions CI** auto-builds NROS on every push; Operator Grid has its own Cloudflare deploy pipeline.
- **AI**: Cloudflare Workers AI (Llama 3.3 70B) by default, free tier; provider-swappable to Anthropic/OpenAI via single env var.

## CRITICAL DOCTRINE (don't propose violating)

1. **Realms remain sovereign** — own DB, own deploy, own UI. Sync only through federation APIs.
2. **NROS is infrastructure** — not the primary frontend. Operator Grid is the public face.
3. **No VR yet** — architecture is spatial-ready; VR is V5+ work.
4. **No monolith gravity** — every recommendation must respect the boundary.

---

## DELIVERABLES (in this order — produce all 6)

### 1. EXECUTIVE READ (1 page max)

What is NROS, in plain language a smart founder reads in 90 seconds. What's
it trying to be. What does it actually feel like right now (after testing both
URLs). What's the gap.

### 2. SYSTEM MAP

Annotated breakdown of every layer:
- What it owns
- What it correctly delegates
- Where the boundaries are leaking (e.g. NROS doing UX work it shouldn't, Operator Grid duplicating identity logic, etc.)
- Where two layers overlap awkwardly

Sketch this as a diagram (ASCII or markdown-grid).

### 3. BUG LOG (ranked P0 → P3)

Every issue you can find. P0 = production breakage, P3 = polish nit.

For each issue:
- **Where** (file path / route / API endpoint / UI element)
- **What's wrong** (1 sentence)
- **Why it matters** (1 sentence; tie to user impact or doctrine violation)
- **Smallest fix** (concrete; estimate <30min, <1 day, or >1 day)

Cover all categories:
- Functional bugs (broken behavior, 500s, missing data, dead links)
- Architectural smells (hidden coupling, gravity toward monolith, ownership confusion)
- UX gaps (where operators get lost or can't tell what to do next)
- Documentation/onboarding holes
- Security + permissions (RLS gaps, exposed secrets, missing rate limits)
- Performance + scaling (unbounded queries, missing indexes, no caching)

### 4. CIVILIZATION-FEEL UPGRADE PLAN

NROS is supposed to feel like running a civilization, not managing a SaaS
dashboard. Map specific patterns from these references onto specific NROS
surfaces:

**From Civilization 6:**
- Hex-tile civilization map → Realm Graph Engine could become a true civilization map
- Eras / ages → operator + realm progression as Ages (Ancient → Classical → Medieval → … → Information → Future)
- Wonders → marquee achievements visible across the federation
- Civilizations with leaders + agendas → realms with elite leaders + governance posture
- Score screen → per-realm + per-operator civilization score, end-of-era reports
- Diplomacy → inter-realm transmissions feed becomes a diplomatic ledger

**From Stellaris:**
- Galaxy view as home screen → the Realm Graph as the civ's living state
- Federation membership states (associate, full member, hegemon) → realm registry tiers
- Edicts + traditions → governance configuration UI

**From Crusader Kings:**
- Dynasty + succession → guild lineages, realm leadership transitions
- Intrigue / events → injected GENUBRA events that push the civ forward

**From Steam:**
- Profile cards (level, badges, showcase) → operator dossier on Operator Grid
- Library view → an operator's "joined realms" page
- Store (discoverability) → public realm directory with screenshots, descriptions, "play now"
- Achievement browser → federation-wide achievement showcase
- Wishlist / follow → "I want to know when this realm launches"
- Workshop → realm operators publishing missions/items

For EACH proposed UX surface:
- What it replaces or adds
- Concrete UI sketch (ASCII or markdown grid)
- Implementation notes (which existing tables/APIs feed it, what's missing)
- Why it moves NROS toward "civilization" not "dashboard"

### 5. IMPROVEMENT ROADMAP

Three bands of work:

**Band A — this week** (high-leverage, <1 day each)
The fixes + polish that buy the most "feels alive" per hour invested.

**Band B — this month** (mid-effort, 1–5 days each)
Real feature work that materially changes the experience.

**Band C — the long arc** (multi-week, paradigm-shifting)
The moonshots that change what NROS *is*. Don't be conservative here.

For each item: what / why / rough hours / risk.

### 6. "IF YOU ONLY READ ONE THING"

The single sharpest observation you have, in one paragraph. Brutal honesty
welcome. The thing the founders most need to hear that they probably don't
want to.

---

## RULES OF ENGAGEMENT

- **Be specific.** "It feels off" isn't analysis. "The `/grid` view shows 0 affordances for vault recovery, and a vaulted realm has the same hover state as an active one — 1.5h fix in `src/components/grid/realm-node.tsx`" is analysis.
- **Cite paths.** File paths, route paths, API endpoints, table names. Make it actionable for engineering.
- **Sketch UX changes** in ASCII or markdown-grid form. No "make it more beautiful." Show the layout.
- **Test the live URLs first** — don't audit from imagination.
- **Note what you couldn't verify** (you don't have shell or DB access — call out static-input limits).
- **No flattery.** No "great work overall, here are some small suggestions." If something is sloppy, say "this is sloppy."
- **No bloat.** If a section has nothing meaningful, write "nothing material here" and move on.
- **Don't propose VR.** Architecture is spatial-ready; VR is V5+.
- **Don't propose merging realms.** Sovereignty is doctrine.
- **Don't propose moving NROS to a different stack.** Cloudflare + Supabase + Next.js are committed.

## TONE

Direct. Technical. Generous when something is genuinely good, brutal when
something is sloppy. Like a senior PM doing a candid review for the founding
team — not a consultant pitching a follow-on engagement.

## OUTPUT FORMAT

Markdown. `##` headers per major section. Tables, ASCII diagrams, and code
snippets welcome and encouraged. Total length: as long as needed; not padded.

---

**Begin the audit. Test the live URLs. Read the repos. Then deliver all 6
sections.**
