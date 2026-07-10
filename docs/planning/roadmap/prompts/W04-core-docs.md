# W4 — Core Docs (README / AGENTS / ARCHITECTURE) · Tier: IMPL (Sonnet 4.6 thinking), then REVIEW pass (Opus 4.6)

**Instructions for the User:** FIRST spend five minutes checking whether drafts of these three files already exist somewhere (Cowork session outputs, another machine) — recovering beats regenerating (decision D6). If not found, paste everything below the dashed line into a fresh IMPL session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo at `C:\Users\jmfg9\Documents\Fitness\Fight-Camp\`. Earlier docs claim `README.md`, `AGENTS.md`, and `ARCHITECTURE.md` exist at repo root — they do not. Your job is to create all three, derived ONLY from the live repo (read the actual code; do not trust older planning docs in `docs/planning/`).

### DO NOT TOUCH
- Anything outside the three new files. This is a documentation-only task.

### READ FIRST (minimum)
`app/src/db/index.jsx`, `app/src/hooks/usePlaybook.js`, `app/src/components/` (skim all), `scripts/` (all four files), root `playbook.csv` header row, `app/package.json`, `.agents/skills/*/SKILL.md`, `docs/handoff.md`, `database/fight-log-schema.md`.

### DELIVERABLES
1. **README.md** — what CombatOS is (single-user fitness+combat PWA), stack (React 18 + Vite + vite-plugin-pwa + Dexie), how to run (`cd app && npm install && npm run dev`), how to build/deploy (Cloudflare Pages), the playbook data pipeline (root `playbook.csv` → `scripts/audit_playbook.py` check → `scripts/csv_to_js.py` → `app/src/data/playbook.js`, generated-never-hand-edit), the sync pipeline (Dexie sessions → syncQueue → `scripts/webhook.gs` → Google Sheet FightLog tab).
2. **AGENTS.md** — operating rules for AI agents in this repo. Must include verbatim-strength versions of: never touch %1RM/e1RM logic uninvited; never alter webhook payload shapes/schemas; never import Apex Protocol content; never hand-edit `playbook.js`; never disrupt the developer's n8n stack; diagnostic-before-modification; one surgical change per session; the session-continuity system (`sunshine`/`goodnight` skills, `STATUS.md`/`docs/handoff.md`/`docs/decision_log.md`).
3. **ARCHITECTURE.md** — component map (AppShell/HUD/tabs), data model (Dexie stores: sessions/syncQueue/settings; in-memory workout+timer state), the 6-day × 3-phase day structure (days 2/4 = fight-gym, synthesized by `usePlaybook`), the webhook contract (log + delete actions, payload column layout), known structural debt (empty `app/src/sync/` awaiting the W8 refactor).

### ACCEPTANCE
Every factual claim traceable to a file you actually read this session. Where the repo is ambiguous, say "unverified" in the doc rather than guessing. Commit: `docs: add README, AGENTS, ARCHITECTURE`.

### REVIEW PASS (separate Opus session afterwards)
Check the three docs against the repo for factual errors ONLY (not style). Report findings; fix only confirmed errors.
