---
name: combatos-conventions
description: The standing guardrails and conventions for writing or reviewing code in Combat OS. Read before any code change in this repo — especially as a delegated worker on a W## roadmap item. Covers the untouchable zones (%1RM math, webhook contract, playbook.js, n8n), the data pipeline, the Dexie store map, and the 7-day training structure. Judgment and rules only — structural facts live in README.md and ARCHITECTURE.md.
---

# Combat OS — Conventions (Standing Guardrails)

This repo is built almost entirely by AI agents across disconnected sessions for one
developer. These conventions are what keeps that from drifting. `AGENTS.md` (repo root) is
the canonical rules file — this skill is the working summary plus the judgment behind it.
If a task seems to require breaking a rule here, stop and ask; don't interpret around it.

---

## The untouchable zones

1. **%1RM / e1RM workout math** — never modify unless the task explicitly names it. This is
   training-load logic the developer relies on directly.
2. **The webhook contract** — frozen unless a task explicitly lifts the restriction. That
   means: the JSON envelope `{ action, sessionId, payload }`, the FightLog row layout
   (65 columns + Status at column 66 — see `docs/reference/fight-log-schema.md`), and
   `scripts/webhook.gs` itself (currently v3: `action:'delete'` soft-deletes by writing
   `CANCELLED` to the Status column; blank = active). Extra trap: `webhook.gs` only takes
   effect after a **manual redeploy** in the Apps Script editor — a merged PR is not a
   deployed change, so any functional edit there carries a separate human deployment step.
3. **`app/src/data/playbook.js`** — generated output, never hand-edit. The pipeline is:
   edit `playbook.csv` (root) → `python audit_playbook.py` → `python scripts/csv_to_js.py`.
4. **Apex Protocol content** — a sibling app for a different user. Never import its tabs,
   "Maintenance"/"Regla Cero"/RPE material, or anything Apex-named. Confirm scope if a task
   mentions these terms.
5. **The developer's self-hosted n8n stack** — a fixed, protected dependency. Nothing in
   this repo configures it today; keep it that way unless explicitly instructed.

## Process rules

- **Diagnostic before modification.** Anything beyond a trivially safe edit gets a
  what-will-change / what-won't / risks report first, approved before code. The W##
  prompts in `docs/planning/roadmap/prompts/` model this ("PHASE 1 — DIAGNOSTIC").
- **One surgical change per session/PR.** One roadmap item or one bounded fix — never
  bundle. Branch + PR + CI; merges to `main` are production deploys.
- **Repo beats docs.** Derive facts from source, not from planning docs — parts of
  `ARCHITECTURE.md` and older W## prompts describe superseded states. When a doc and the
  code disagree, the code is right; note the discrepancy rather than silently reconciling.
- Deps via `npm ci`; a lockfile change needs from-scratch regeneration plus a clean
  `npm ci` check (two Windows-vs-Linux CI failures trace to exactly this). Browser globals
  in tests via `vi.stubGlobal`.

## The data pipeline (what syncs, what never does)

```
HUD → logSession() → Dexie `sessions` + `syncQueue` → trySyncQueue()
    → POST (no-cors, fire-and-forget) → Apps Script webhook.gs → FightLog sheet (append-only)
```

- Sync logic lives in `app/src/sync/syncQueue.js` (W8); `db/index.jsx` re-exports it.
- `mode: 'no-cors'` means the app never reads a response — success is inferred from the
  fetch not throwing. Don't design anything that needs a webhook reply.
- **Google Sheets is the append-only workout log and nothing else.** Standing decision: no
  new Sheets tabs or Apps Script endpoints for mutable data, ever — Supabase (D7) is the
  eventual backend for that, and the full-backup JSON (`db/backup.js`) is its migration seed.
- **Checklist and Notes are LOCAL-ONLY.** Nothing from their tables may ever reach
  `syncQueue` or the webhook payload. UI-only state (e.g. the `*BlockOpen` collapse flags)
  must likewise never leak into `logSession`'s payload.

## Dexie store map (`FightersOS`, v3 — `app/src/db/index.jsx`)

| Table | Key/indexes | Notes |
|---|---|---|
| `sessions` | `++id, date, day, phase, hipScore` | local source of truth for the log |
| `syncQueue` | `++id, sessionId, attempts` | pending webhook envelopes |
| `settings` | `key` | flat key/value; `webhookUrl` has a hardcoded default |
| `checklistGroups` / `checklistTasks` / `checklistCompletions` | see file | W21, local-only |
| `noteGroups` / `notes` | `notes: id, groupId, deletedAt, *tags` | W23, local-only |

Schema-bump discipline: every version restates **all** tables verbatim (omitting one drops
it and destroys real data); changes are additive-only; no `.upgrade()` unless data must
transform. Tests must never hardcode schema facts like `verno === 2` — use
capture-before/assert-unchanged or `>=` floors.

Tags convention (app-wide): normalized lowercase-kebab, stored per-record in a `tags` array
with a `*tags` multiEntry index; the tag universe is always **derived** — no tags table.
The checklist's configurable reset time is THE logical-day clock for the whole hub — reuse
it (`utils/checklistDate.js`), never invent a second definition of "today".

## Training structure

3 phases × 7-day strictly sequential cycle (1→…→7→1). Days 2 and 4 are Fight Gym days;
Day 7 is the optional/custom gym day (Session Type defaults to Cardio on entering day 7).
These three days have no playbook rows — `getWorkout()` short-circuits to `isFightGymDay`.
Phase-unlock counts **only** S&C days (excludes 2/4/7), threshold 12, phases 1→2→3 only.
Hip-score routing (`-HA` variants at hipScore ≤ 2) applies to **Mobility slots only** —
strength never varies by hip score.

## State placement judgment

Hubs fully unmount on nav switch (`AppShell.jsx`). Anything that must survive a tab
switch — in-progress workout inputs, running timers, scroll position, collapse state —
lives in `DBProvider` (mounted once at the root), not in a tab component. If you add
mid-workout state to a tab-level `useState`, it will be silently wiped the first time the
user checks another tab; put it in the provider with a `WORKOUT_DEFAULTS` entry and a
`resetActiveWorkout()` line instead.

## Session bookkeeping

Sessions open with `combatos-sunshine` and close with `combatos-goodnight` (both in
`.agents/skills/`). Pending lists and checklists are **signal, not spec** — verify against
the user's stated goal. Open product questions go to
`docs/planning/roadmap/OPEN-DECISIONS.md`; never silently default one.
