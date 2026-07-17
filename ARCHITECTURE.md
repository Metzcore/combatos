# ARCHITECTURE.md — Combat OS

This describes the structure of the app as it exists in the repo today, based on reading the
actual source (last full pass: 2026-07-17, post-W17). Where something is ambiguous or not
directly confirmed in code, it's marked **unverified** rather than assumed.

## Component map

Entry point: `app/src/main.jsx` mounts `<DBProvider><App /></DBProvider>`. `DBProvider`
(from `app/src/db/index.jsx`) sits at the true root and is never unmounted — this matters
for state survival (see "In-memory state" below).

```
App.jsx
├── DailyIgnition             (fixed full-screen splash overlay, conditionally rendered)
└── AppShell.jsx              (owns activeHub + per-hub top-tab state; renders exactly one hub)
    ├── TrainHub.jsx           (hub: "train")
    │   ├── HUD.jsx             (top tab: "Workout")
    │   └── PlaybookViewer.jsx  (top tab: "Playbook")
    ├── Timer.jsx              (hub: "timer")
    │   ├── BasicTimer.jsx      (top tab: "Basic")
    │   └── RoundsTimer.jsx     (top tab: "Custom Rounds")
    ├── Calendar.jsx           (hub: "log")
    │   └── WeeklyStats.jsx     (top tab: "Stats"; "Log" is the session list)
    ├── ChecklistHub.jsx       (hub: "checklist")
    │   ├── Checklist.jsx       (top tab: "Checklist")
    │   └── Notes.jsx           (top tab: "Notes")
    ├── Settings.jsx           (hub: "settings"; no top tabs)
    └── BottomNav.jsx          (always rendered; 5-slot hub switcher)
```

### Two-layer navigation (W20)

Navigation is **hub + top-tab** (the layered-nav paradigm ruled in W19 §6 — paradigm
adopted, styling deliberately CombatOS's own tactical amber):

- **Layer 1**: `BottomNav` switches between 5 hubs, in slot order
  `train → timer → log → checklist → settings`.
- **Layer 2**: `TopTabs.jsx` (shared presentational bar) switches tabs inside a hub.

All nav state logic is pure and unit-tested in `app/src/utils/navState.js` (`HUBS`,
`HUB_TOP_TABS`, `initialTopTabs()`, `setHubTab()`); `AppShell` owns the actual `useState`.
Layer-2 selection deliberately lives in `AppShell`, **above** the hubs: hubs fully unmount
on hub switch (`{activeHub === 'x' && <X />}`), so Train→Timer→Train returns to the top tab
you were on. Both layers reset on full page reload by design.

Because hubs (and their tab contents) fully unmount on every switch, state that must
survive a switch — the in-progress workout, running timers, scroll position, collapse
state — is deliberately NOT held inside the hub/tab components. See "In-memory state".

### Train hub

`HUD.jsx` is the controller for the workout-logging screen. It reads workout structure from
`usePlaybook()` and renders (in order): a Day/Phase/Hip-Score selector row, an optional
`PhaseUnlockBanner`, a "next up" indicator, a hip-score status banner, then either:

- `FightGymDay.jsx` — when `usePlaybook` reports `isFightGymDay: true` (days 2, 4, 7), or
- the full S&C block sequence: `MobilityBlock` → `StrengthBlock` (renders `ExerciseCard` +
  `SetRow`; consults `useHistory.js` per set) → `BagBlock` → `CoreBlock` → `CooldownBlock`
  → `CompletenessBar`.

All block components are presentational — data + change handlers come in as props; none
holds workout state of its own.

**Collapsible blocks (W10/W10.1):** all five S&C blocks collapse. Mobility, Strength, and
Cooldown default **open** (the day's core work); Bag and Core default **collapsed**, with a
transition-guarded auto-expand. The daily-focus label stays outside the collapse. The
open/closed flags (`mobBlockOpen` … `coreBlockOpen`) are UI-only state in `DBProvider` —
they survive hub switches like `hudScrollY`, reset per session via `resetActiveWorkout()`,
and are never read by `logSession`/completeness, so they cannot reach the webhook payload.

**Supersets** get gym-standard A1/A2 badges with a shared left-edge accent bar.

`useHistory.js` returns, per exercise key + set number, the most recent logged `kg`/`reps`
and a suggested load derived from `calculateE1RM`/`calculateTargetWeight` in
`app/src/utils/math.js` (the untouchable %1RM/e1RM math), with a module-level cache.

### Timer hub

`Timer.jsx` is a thin switcher (mode selection owned by `AppShell` since W20) between
`BasicTimer.jsx` (stopwatch + preset-duration countdown) and `RoundsTimer.jsx`
(configurable prep/work/rest/interim-bell interval timer with named saved setups, max 10).
Both read their running state from `useDB()` — the intervals live in `DBProvider`, which is
what lets a timer keep running while the user is on another hub. Bell audio, vibration, and
a screen WakeLock are also managed in the provider.

### Log hub

`Calendar.jsx` loads all Dexie `sessions` (sorted newest-first by `id`) and renders either
the session-list view ("Log") or `WeeklyStats.jsx` ("Stats", W9): uniform per-week cards —
session-count badges, S&C/Fight split, average completeness (S&C-only) progress bar,
hip-score dot trail, day-1–7 coverage chips. Aggregation is pure and unit-tested in
`app/src/utils/weeklyStats.js` over `app/src/utils/dateMath.js` (UTC calendar math, ISO
Monday-start weeks — never local-time `new Date(string)` parsing).

### Checklist hub (W21–W23)

`ChecklistHub.jsx` hosts two screens behind the shared top-tab bar:

- **`Checklist.jsx`** (W21, polished W22) — daily habit tracker: groups → tasks → dated
  completions with derived streaks; pinned `QuickAddBar`; a toolbar with the "RESETS IN"
  countdown and Share/Import; configurable daily reset time; JSON export and paste-text
  import. All modal-ish flows use `BottomSheet.jsx` — no browser `prompt()`/`confirm()`
  anywhere.
- **`Notes.jsx`** (W23) — groups → plain-text notes with tags + pin, tappable inline
  `- [ ]` checklists in view mode, an on-demand daily note, substring search combinable
  with a tag-chip filter, and quick capture. The editor (`NoteEditor.jsx`) is a full
  in-tab screen (not a sheet), plain text only, debounced autosave with
  `visibilitychange`/unmount flush; empty notes are never created.

Both are **LOCAL-ONLY** — zero webhook/Sheets involvement — and get their data via
`hooks/useChecklist.js` / `hooks/useNotes.js` over `db/checklist.js` / `db/notes.js`,
deliberately outside `DBProvider`.

**The logical-day clock:** the checklist's configurable reset time (settings key
`checklistResetTime`, helpers in `app/src/utils/checklistDate.js` — `logicalDateStr()`,
`msUntilNextReset()`, default `00:00`) is THE definition of "today" for the whole hub;
Notes' daily note reuses it. Workout `sessions.date` stays plain calendar date — two
distinct day-axes.

**Tags convention (app-wide):** normalized lowercase-kebab, stored per-record in a `tags`
array with a `*tags` multiEntry index; the tag universe is always derived — no tags table.

### Settings hub

`Settings.jsx`: phase selector, app name/subtitle, Daily Ignition toggle, "Export full
backup" (W23.5 — see Durability), a persistent-storage status line, last-backup hint, and
"Delete Last Session" (see Webhook contract). No UI exists for `webhookUrl` — it comes from
a hardcoded default (below).

## Data model

### Dexie database: `FightersOS` (schema v3)

Defined in `app/src/db/index.jsx`. Three additive versions, each restating **all** tables
verbatim (Dexie requires the full schema per version; omitting a table would drop it and
destroy real data). No `.upgrade()` callbacks — all changes so far are purely additive.

```js
db.version(3).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key',
    checklistGroups: 'id, order',                                  // v2 (W21)
    checklistTasks: 'id, groupId, [groupId+order], deletedAt',     // v2 (W21)
    checklistCompletions: '[taskId+date], taskId',                 // v2 (W21)
    noteGroups: 'id, order',                                       // v3 (W23)
    notes: 'id, groupId, deletedAt, *tags'                         // v3 (W23)
})
```

- **`sessions`** — one row per logged workout; the local source of truth for the Log hub
  and the phase-unlock counter. Fields built by `HUD.jsx handleLog` include: `date`
  (`YYYY-MM-DD`), `day`, `phase`, `hipScore`, `sessionType`, `strength`, `core`,
  `altSessionDetails`, `sessionDuration`, `mobDone`, `clrDone`, `bagRounds`, `bagCourse`,
  `bagModules`, `bagWorkouts`, `notes`, `completeness`, and a generated `sessionId` (UUID
  via `crypto.randomUUID()`, with a fallback string generator).
- **`syncQueue`** — one row per pending outbound webhook call: `{ id, sessionId, attempts,
  payload }`, where `payload` is the full envelope (`{ action: 'log', sessionId, payload }`
  or `{ action: 'delete', sessionId }`).
- **`settings`** — flat key/value rows. Known keys from `DEFAULTS` and call sites:
  `currentPhase`, `webhookUrl`, `appName`, `appSubtitle`, `dailyIgnitionEnabled`,
  `bookmarkedIgnitions`, `savedRoundsTimers`, `checklistResetTime` (W22),
  `lastFullBackupAt` (W23.5).
- Checklist/notes tables (W21/W23) — local-only; nothing from them may ever reach
  `syncQueue` or the webhook payload.

**`webhookUrl` has a hardcoded default** in `DEFAULTS.webhookUrl` (`app/src/db/index.jsx`)
pointing at the live Apps Script deployment. No Settings UI exists to change it; overriding
it requires writing to the Dexie `settings` table directly.

**Test discipline:** tests never hardcode current-schema facts (`verno === 3`) — they use
capture-before/assert-unchanged or `>=` floors (a decision earned when the v3 bump broke
three such tests).

### In-memory state (NOT persisted to Dexie)

`DBProvider` holds two categories of plain-React state that are never written to Dexie:

1. **Active workout state**: `day`, `hipScore`, `hudScrollY`, `mobChecked`, `strSets`,
   `coreSets`, `clrChecked`, `bagRounds`, `bagCourse`, `bagModules`, `bagWorkouts`,
   `notes`, `gymSessionType`, `altRows`, `altDuration`, plus the five UI-only collapse
   flags (`mobBlockOpen`, `strBlockOpen`, `clrBlockOpen`, `bagBlockOpen`, `coreBlockOpen`).
2. **Timer state**: `swTime`/`swRunning` (stopwatch), `cdTime`/`cdRunning` (countdown),
   `alertState`, and the entire `useRoundsTimer` state.

**Why this matters:** `AppShell` unmounts a hub's whole component tree on hub switch. If
this state lived in `HUD.jsx` or `Timer.jsx` local `useState`, switching hubs would wipe
typed-in set data and kill running timer intervals. Because `DBProvider` is mounted once at
the root and never unmounted, its state — and its `setInterval` timers, scoped to provider
effects — survives any navigation. The rule when adding features: anything that must
survive a hub/tab switch goes in `DBProvider` with a `WORKOUT_DEFAULTS` entry and a
`resetActiveWorkout()` line.

`resetActiveWorkout()` clears active-workout state (called after a successful
`logSession()` and from the HUD's manual reset) but intentionally does **not** reset
`day` — Day and Phase are kept.

## Day structure: 3 phases × 7-day cycle

The program is 3 phases, each cycling strictly sequentially through 7 days (1→…→7→1;
extended from 6 by decision D2 / W16). `getDailyFocus(day)` in `usePlaybook.js` names the
S&C-focused days:

| Day | Focus |
|-----|-------|
| 1 | Lower Body Heavy & Vertical Power |
| 3 | Upper Body Push & Rotational Power |
| 5 | Lower Body Hinge & Horizontal Power |
| 6 | Upper Body Pull & Posterior Chain |

**Days 2 and 4 are Fight Gym days; Day 7 is the optional/custom gym day.** `playbook.csv`
has no rows for these slots. `getWorkout(phase, day, hipScore)` detects
`d === 2 || d === 4 || d === 7` and short-circuits to `{ isFightGymDay: true, ... }` before
any Playbook lookups; `HUD.jsx` then renders `FightGymDay.jsx` (three session types:
Combat / Cardio / Mobility, the latter two using free-form movement rows). Day 7 reuses
this machinery unchanged, but the HUD defaults its Session Type to **Cardio** on the
transition into day 7.

**Known quirk (accepted, won't-fix — developer ruling 2026-07-16):** after logging a day-7
session while remaining on day 7, `resetActiveWorkout()` restores the Combat default and
the transition guard (which only fires on *entering* day 7) does not re-apply Cardio. The
next action is switching days anyway; reviewed post-deploy and deliberately left as-is.

Phase-unlock counting (`refreshCounts()` in `db/index.jsx`) **excludes** days 2/4/7 — only
S&C sessions count. Threshold: `PHASE_UNLOCK_THRESHOLD = 12` (constant in `HUD.jsx`),
gating advancement past Phase 1 or 2 only (`phase < 3`).

### Hip-score routing

Every mobility slot lookup is hip-aware via `hipAwareLookup()` in `usePlaybook.js`:

- **`hipScore <= 2`** is "High Alert": if an `-HA` variant row exists for that
  Phase/Day/Block/Slot, it's returned (flagged `isHighAlert: true`); otherwise the `-STD`
  row.
- Routing applies to **Mobility slots only** — strength lookups use no variant suffix at
  all; strength programming does not vary by hip score.
- Composite key format: `` `P${phase}-D${day}-${block}-${slot}-${variant}` ``.

`HUD.jsx` also surfaces the hip score as a standing banner: red "HIGH ALERT" at ≤2, amber
"MODERATE" at exactly 3, green "GOOD" at ≥4 — the same thresholds `WeeklyStats.jsx`
deliberately mirrors in its `hipColor()`.

## Sync: the outbound queue

Sync logic lives in `app/src/sync/syncQueue.js` (extracted from `db/index.jsx` in W8 with
zero behavior change; `db/index.jsx` re-exports `trySyncQueue` for compatibility):

- `enqueueSync(entry)` adds a pending envelope row to Dexie `syncQueue`.
- `trySyncQueue(onComplete)` drains the queue: skips entries at `MAX_ATTEMPTS = 5`, POSTs
  each payload with `mode: 'no-cors'`, deletes the row on apparent success, increments
  `attempts` on failure. A `_syncInFlight` module flag prevents concurrent runs.
- `initSyncListeners()` registers `window` `online`/`focus` auto-sync hooks (called once at
  `db/index.jsx` module-eval time).

**`no-cors` means the response is opaque** — the app never reads a webhook reply; success
is inferred from the fetch not throwing. Nothing in the app may be designed to need a
webhook response.

## Webhook contract

Defined by what the app sends (`db/index.jsx` + `sync/syncQueue.js`) and what
`scripts/webhook.gs` (`doPost`, **v3**) expects. The contract is frozen (AGENTS.md rule 2);
W17 was the one item that lifted it, and it has shipped. **Deployment caveat:** `webhook.gs`
only takes effect after a manual redeploy in the Apps Script editor — a merged PR is not a
deployed change. v3 is deployed and verified (2026-07-17).

### `action: 'log'`

```json
{ "action": "log", "sessionId": "<uuid>", "payload": { ...session fields... } }
```

`webhook.gs` builds one `FightLog` row in fixed column order (full column-letter mapping in
`docs/reference/fight-log-schema.md`):

1. `date`, `day`, `phase`, `hipScore`, `sessionType` (5 columns)
2. **4 exercises × 4 sets × 3 values** (`kg`, `reps`, `papReps`) = 48 columns, built by a
   fixed nested loop regardless of how much strength data exists — missing entries push
   empty strings, so row width is constant even for Fight Gym or partial sessions.
3. `core` (one multi-line `"ex — setsxreps"` string), `altSessionDetails`,
   `sessionDuration`, `mobDone`, `clrDone`, `bagRounds`, `bagCourse`, `bagModules`,
   `bagWorkouts`, `notes`, `completeness`.
4. **`sessionId` as the trailing data column (column 65)** — what lets a later delete find
   the row.

### `action: 'delete'` — soft delete (W17, decision D1)

```json
{ "action": "delete", "sessionId": "<uuid>" }
```

`doPost` searches the **last 100 rows** of `FightLog` (bottom-up, substring match on the
joined row) for the `sessionId`, then writes **`CANCELLED` to the Status column** —
`STATUS_COL = 66` (column BN), a fixed index on purpose: `getLastColumn()+1` would drift
once the column exists. Blank Status = active; rows written before v3 are active by
default. The write is idempotent, and a grid-width guard auto-widens the sheet if it's
narrower than 66 columns, so deletes are order-independent of the manual header step. The
row is never physically removed — the Sheet is the append-only audit trail (D1).

On the local side, `deleteLastSession()` in `db/index.jsx` is still a **hard delete** of
the most recent Dexie `sessions` row (no local tombstone — a deliberate W17 ruling), and it
enqueues the delete envelope through the same queue as logs, so a pending log for the same
session is processed before its delete.

## Durability (W23.5)

- `navigator.storage.persist()` is requested in a dedicated effect at provider mount —
  deliberately never gating `ready` or first paint, fully feature-detected and try/caught.
  Result surfaces as `storagePersisted` (Settings shows PERSISTENT vs BEST-EFFORT). On iOS,
  persist() does not prevent the ~7-day IndexedDB eviction — the backup export is the real
  mitigation there.
- **Full-backup export** (`app/src/db/backup.js`): dumps every Dexie table into one JSON
  document (`format: 'combatos-full-backup'`, version, `exportedAt`, `schemaVersion`,
  `tables`). Tables are enumerated dynamically via `db.tables` — new stores are included
  automatically. Export-only by design; restore/import is explicitly deferred to the
  Supabase era, for which this JSON doubles as the migration seed (D7). Delivered via the
  share-or-download path; `lastFullBackupAt` records the last delivered backup.

## Tests

Vitest (`npm test` in `app/`; `vitest.config.js`), with `fake-indexeddb` for Dexie-touching
suites. **206 tests across 15 files, all green as of 2026-07-17**, colocated with their
subjects: `db/` (backup, checklist, notes, syncQueue), `utils/` (navState, checklistDate,
checklistImport, checklistShare, checklistStreak, nextDay, noteChecklist, noteFilter,
noteTags, weeklyStats), and `hooks/` (usePlaybook). Pure logic is deliberately extracted to
`utils/` modules (no React/Dexie imports) precisely so it can be tested in a plain node
environment. Browser globals in tests are stubbed via `vi.stubGlobal`.

## Known structural debt

- **`webhookUrl` has no Settings UI** — changing the target requires a direct Dexie write.
  Acceptable for a single-user app whose default points at the live deployment; becomes
  real debt only if a second deployment (e.g. Project B) ever shares this codebase.
- **The delete search window is the last 100 rows** of `FightLog` — a session older than
  ~100 logs can no longer be soft-deleted remotely. Accepted: the app only offers
  "Delete Last Session".
- **`deleteLastSession()` only targets the most recent session** — there is no arbitrary-
  session delete in the UI.
- **`Calendar.jsx` sorts by `id` descending** as a proxy for recency — correct as long as
  sessions are only created live (never backfilled with older dates).
- Historical notes: W7 (test bootstrap) and W8 (sync extraction), described as pending in
  older revisions of this file, are long shipped; `app/src/sync/` exists and is the real
  home of sync logic.
