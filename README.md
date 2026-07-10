# Combat OS

Combat OS (internal app name: **Fighter's OS**) is a single-user fitness and combat-training
progressive web app (PWA). It runs a structured strength-and-conditioning + fight-gym program,
tracks daily sessions, and syncs a copy of every logged session to a Google Sheet for
longer-term record-keeping.

It is fully client-side: no application backend, no user accounts. All workout state lives in
the browser (IndexedDB via Dexie). The only outbound network call is a fire-and-forget POST to
a Google Apps Script webhook, used purely as a remote log — the app itself never reads from it.

The app is designed to be installed as an Android home-screen PWA (see `app/vite.config.js`'s
`vite-plugin-pwa` manifest: `display: 'standalone'`, custom icons, offline caching via Workbox).

## Stack

- **React 18** (`react`, `react-dom` ^18.3.1)
- **Vite 5** as the build tool and dev server (`app/vite.config.js`)
- **vite-plugin-pwa** for the service worker, manifest, and offline asset caching
- **Dexie.js** (`dexie` ^4.0.8) as the IndexedDB wrapper — the only persistence layer
- No CSS framework, no state-management library, no router — five tabs are switched by
  conditional rendering in `AppShell.jsx`, not URL-based routing (see `ARCHITECTURE.md`)

Confirmed from `app/package.json`: dependencies are just `dexie`, `react`, `react-dom`;
dev dependencies are `@vitejs/plugin-react`, `sharp`, `vite`, `vite-plugin-pwa`, plus React
type packages.

## Running locally

```bash
cd app
npm install
npm run dev
```

`npm run dev` starts the Vite dev server. `npm run preview` serves a production build locally.

## Building

```bash
cd app
npm run build
```

This runs `vite build`, producing static output that gets deployed. CI
(`.github/workflows/build-check.yml`) runs `npm ci` + `npm run build` inside `app/` on every
push and pull request targeting `main` — a build failure on a PR means something regressed.

Per project convention (see `docs/planning/roadmap/ROADMAP.md`), deploys happen via Cloudflare
Pages from `main`. (The Cloudflare Pages configuration itself is not part of this repo's tracked
files, so treat the deploy trigger/config as **unverified** from code alone — this is stated
project process, not something read directly in a config file this session.)

## Data pipeline: the Playbook

The root-level `playbook.csv` is the single source of truth for the workout program. Its header
row (confirmed by reading the file):

```
Key,Phase,Day,Block,Slot,Variant,Exercise,Sets,Target_Reps,Load_Note,PAP_Exercise,PAP_Sets,PAP_Reps,Combo_Focus,Cue
```

Workflow when the program changes:

1. Edit `playbook.csv` at the repo root.
2. Run `python audit_playbook.py` (repo root) — a read-only sanity check. It reports total row
   count, which Phase-Day combos exist vs. are missing, HIGH_ALERT (HA) variant coverage per
   Phase-Day, and STRENGTH slot counts per Phase-Day. It does not modify anything.
3. Run `python scripts/csv_to_js.py` — reads `playbook.csv` and generates
   `app/src/data/playbook.js` as a plain ES module (`export default PLAYBOOK`), stripping
   whitespace from every field and keeping only rows that have a `Key`.

**`app/src/data/playbook.js` is generated. Never hand-edit it** — the file itself carries the
comment "Auto-generated from playbook.csv — do not edit directly." Any change must start at
`playbook.csv` and flow through the script.

The app consumes the generated data through `app/src/hooks/usePlaybook.js`, which builds an
in-memory `Key → row` index and looks up rows by the composite key
`P{phase}-D{day}-{block}-{slot}[-{variant}]` (see `ARCHITECTURE.md` for the hip-routing and
fight-gym-day details).

## Sync pipeline: session logging to Google Sheets

Logged sessions are the local source of truth (Dexie `sessions` table). Every log or delete
action is additionally queued and pushed to a Google Sheet as a secondary/remote record:

1. `logSession()` (in `app/src/db/index.jsx`) writes the session to Dexie `sessions`, then
   enqueues a `{ action: 'log', sessionId, payload }` envelope onto the Dexie `syncQueue` table.
2. `trySyncQueue()` (same file) drains the queue: for each queued item it POSTs the envelope
   (mode `no-cors`, JSON body) to the configured `webhookUrl` setting. Successfully sent items
   are removed from the queue; failures increment an `attempts` counter (capped at
   `MAX_ATTEMPTS = 5`, after which an item is skipped but left in the queue).
3. Sync is retried automatically on `window` `online` and `focus` events, and immediately after
   a log/delete action, guarded by an in-module `_syncInFlight` lock so only one sync run
   executes at a time.
4. `scripts/webhook.gs` is the Google Apps Script deployed as the actual webhook endpoint (`doPost`).
   It is **manually deployed** through the Apps Script editor (Deploy → New Deployment → Web
   App) — deploying is not part of any build/CI step in this repo. On `action: 'log'` it appends
   one row to the `FightLog` tab of a specific Google Sheet (spreadsheet ID hardcoded in the
   script). On `action: 'delete'` it currently **hard-deletes** the matching row
   (`log.deleteRow`) by searching the last 100 rows for a matching `sessionId` string — see
   `ARCHITECTURE.md` for why this is flagged as pending a soft-delete rework (roadmap item W17).

The default webhook URL is hardcoded in `app/src/db/index.jsx` (`DEFAULTS.webhookUrl`) and
stored as the `webhookUrl` row in the Dexie `settings` table; there is no UI in `Settings.jsx`
to change it (unverified whether changing it is possible anywhere in the current UI — grep
found no settings field for it).

## Repo map

```
app/                     React + Vite PWA source (the actual product)
  src/components/        UI components (AppShell, HUD, tabs, blocks — see ARCHITECTURE.md)
  src/db/                Dexie DB setup + DBProvider (React context) + sync logic
  src/hooks/              usePlaybook, useHistory, useRoundsTimer
  src/data/               Generated playbook.js + ignition.js (quote data)
  src/sync/               Does not currently exist in this repo (see ARCHITECTURE.md — expected
                          location for sync logic once roadmap item W8 lands)
  vite.config.js          Vite + vite-plugin-pwa configuration
  package.json            Scripts and dependencies (see Stack above)
scripts/                 csv_to_js.py (playbook generator), webhook.gs (Apps Script source)
audit_playbook.py         Playbook sanity-check script (repo root, not scripts/)
playbook.csv              Source-of-truth program data (repo root)
docs/
  planning/               Roadmap (ROADMAP.md), open decisions, per-item worker prompts,
                          priming docs, and the older CHECKLIST.md
  reference/              Reference material, incl. fight-log-schema.md (Sheet column layout)
  handoff.md, decision_log.md   Session-continuity files (see AGENTS.md)
archive/                 Retired systems kept for reference (legacy spreadsheet-based system,
                          a completed feature-backport kit) — not live code
.agents/skills/          Project-scoped Claude Code skills, incl. combatos-sunshine and
                          combatos-goodnight (session open/close rituals)
dev_files/                Local scratch space, gitignored — not part of the tracked repo
STATUS.md                 Human-facing 30-second orientation, kept current by the goodnight skill
```

## Workflow

- Feature branches + pull requests into `main` (adopted explicitly as project process — see
  `docs/planning/roadmap/OPEN-DECISIONS.md`, D-addendum "Process ruling").
- CI (`build-check.yml`) runs `npm run build` on every push/PR to `main`; a red build blocks
  merge in practice even though there is no branch-protection file checked into this repo to
  enforce it (unverified whether branch protection is configured on GitHub itself).
- The active roadmap in `docs/planning/roadmap/ROADMAP.md` sequences work as one item (`W##`)
  per PR/session, each with a matching prompt file under `docs/planning/roadmap/prompts/`.
  Diagnostic-before-modification is the standing convention for anything non-trivial.
