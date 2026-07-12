# ARCHITECTURE.md — Combat OS

This describes the structure of the app as it exists in the repo today, based on reading the
actual source. Where something is ambiguous or not directly confirmed in code, it's marked
**unverified** rather than assumed.

## Component map

Entry point: `app/src/main.jsx` mounts `App.jsx`.

```
App.jsx
├── DailyIgnition            (fixed full-screen splash overlay, conditionally rendered)
└── AppShell.jsx              (owns activeTab state; conditionally renders exactly one tab)
    ├── HUD.jsx                (tab: "hud")
    ├── PlaybookViewer.jsx     (tab: "playbook")
    ├── Timer.jsx              (tab: "timer")
    ├── Calendar.jsx           (tab: "calendar", labeled "Log" in the nav)
    ├── Settings.jsx           (tab: "settings")
    └── BottomNav.jsx          (always rendered; 5-button tab switcher)
```

`AppShell.jsx` renders tabs with `{activeTab === 'x' && <X />}` — only the active tab's
component tree is mounted at any time; switching tabs unmounts the previous one and mounts the
new one. This is why state that needs to survive a tab switch (the in-progress workout, the
running timers) is deliberately NOT held inside `HUD.jsx` or `Timer.jsx` themselves — see
"In-memory state" below.

`BottomNav.jsx` confirms the 5 tabs and their order: **hud → timer → calendar (labeled "Log") →
playbook → settings.**

### HUD tab breakdown

`HUD.jsx` is the controller for the workout-logging screen. It reads workout structure from
`usePlaybook()` and renders (in order): a Day/Phase/Hip-Score selector row, an optional
`PhaseUnlockBanner`, a "next up" indicator, a hip-score status banner, then either:

- `FightGymDay.jsx` — when `usePlaybook` reports `isFightGymDay: true` (Days 2 and 4), or
- the full S&C block sequence, in this order:
  1. `MobilityBlock.jsx`
  2. `StrengthBlock.jsx` (which internally renders `ExerciseCard` + `SetRow`, and consults
     `useHistory.js` per set for last-logged values / suggested load — `useHistory.js` was not
     read this session beyond its call signature, so its internals are **unverified** here)
  3. `BagBlock.jsx`
  4. `CoreBlock.jsx`
  5. `CooldownBlock.jsx`
  6. `CompletenessBar.jsx`

All of these block components are presentational — they receive data + change handlers as
props and hold no state of their own (confirmed by reading each file; none calls `useState` for
workout data).

### Timer tab breakdown

`Timer.jsx` is a small local-state switcher (`activeMode: 'basic' | 'rounds'`, held in
`Timer.jsx` itself since it doesn't need to survive a tab switch) between:

- `BasicTimer.jsx` — a stopwatch + a preset-duration rest/countdown timer.
- `RoundsTimer.jsx` — a configurable interval-training timer (prep / work / rest / interim-bell,
  N rounds) with named saved setups.

Both read their actual running state from `useDB()` (see below), not local state — this is what
lets a timer keep running while the user is on another tab.

## Data model

### Dexie database: `FightersOS`

Defined in `app/src/db/index.jsx`:

```js
db.version(1).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key'
})
```

- **`sessions`** — one row per logged workout. This is the local source of truth for the Fight
  Log / Calendar tab and the phase-unlock session counter. Fields observed in the code that
  builds a session (`HUD.jsx` `handleLog`) include: `date`, `day`, `phase`, `hipScore`,
  `sessionType`, `strength` (array of per-exercise set data), `core`, `altSessionDetails`,
  `sessionDuration`, `mobDone`, `clrDone`, `bagRounds`, `bagCourse`, `bagModules`,
  `bagWorkouts`, `notes`, `completeness`, and a generated `sessionId` (UUID via
  `crypto.randomUUID()`, with a fallback string generator if `crypto.randomUUID` is unavailable).
- **`syncQueue`** — one row per pending outbound webhook call: `{ id, sessionId, attempts,
  payload }`, where `payload` is the full envelope (`{ action, sessionId, payload }` for `log`,
  or `{ action: 'delete', sessionId }` for `delete`).
- **`settings`** — a flat key/value store (`{ key, value }` rows). Known keys, from
  `DEFAULTS` and the `getSetting`/`setSetting` call sites: `currentPhase`, `webhookUrl`,
  `appName`, `appSubtitle`, `dailyIgnitionEnabled`, `bookmarkedIgnitions`, `savedRoundsTimers`.

**`webhookUrl` has a hardcoded default** in `DEFAULTS.webhookUrl`
(`app/src/db/index.jsx`) pointing at a specific Google Apps Script deployment URL. If no
`settings` row exists for `webhookUrl`, `getSetting()` falls back to this hardcoded default. No
UI to change it was found in `Settings.jsx` — changing it would currently require writing
directly to the Dexie `settings` table (**unverified** whether any UI for this exists elsewhere).

### In-memory state (NOT persisted to Dexie)

`DBProvider` (in `app/src/db/index.jsx`) holds two categories of state in plain React
`useState`, never written to Dexie:

1. **Active workout state**: `day`, `hipScore`, `hudScrollY`, `mobChecked`, `strSets`,
   `coreSets`, `clrChecked`, `bagRounds`, `bagCourse`, `bagModules`, `bagWorkouts`, `notes`,
   `gymSessionType`, `altRows`, `altDuration`.
2. **Timer state**: `swTime`/`swRunning` (stopwatch), `cdTime`/`cdRunning` (countdown),
   `alertState`, plus the entire `useRoundsTimer` custom-rounds-timer state.

**Why this matters:** `AppShell.jsx` unmounts a tab's component tree when the user switches
away from it. If this state lived inside `HUD.jsx` or `Timer.jsx` (via local `useState`), it
would be wiped out every time the user left the tab — switching from HUD to check the Playbook
tab and back would lose all typed-in set data, and switching away from Timer would stop a
running stopwatch/countdown from the user's perspective (the interval itself would also be
killed, since the interval lives in an effect scoped to the mounted component).

Instead, this state lives in `DBProvider`, which `app/src/main.jsx` mounts once at the true root
— above `<App />`, which itself renders `<DailyIgnition />` and `<AppShell />` as siblings:

```jsx
ReactDOM.createRoot(...).render(
  <DBProvider>
    <App />
  </DBProvider>
)
```

Because `DBProvider` is never unmounted by tab switching (only its children inside `AppShell`
are), its state — and its running `setInterval` timers, declared in `useEffect` hooks scoped to
the provider itself, not to any tab — survives switching tabs. The stopwatch and countdown
intervals are explicitly described in the file's own header comment as being designed to
"survive tab switches."

`resetActiveWorkout()` clears the active-workout state (called after a successful `logSession()`
and from the HUD's manual "RESET HUD" button) but intentionally does **not** reset `day` — the
code comment notes this matches prior behavior ("Day and Phase are kept").

## Day structure: 3 phases × 7-day cycle

The program is organized as 3 phases, each phase cycling through 7 days (extended from 6 by
decision D2 / roadmap item W16 — strictly sequential 1→…→7→1). `getDailyFocus(day)` in
`usePlaybook.js` names the S&C-focused days:

| Day | Focus |
|-----|-------|
| 1 | Lower Body Heavy & Vertical Power |
| 3 | Upper Body Push & Rotational Power |
| 5 | Lower Body Hinge & Horizontal Power |
| 6 | Upper Body Pull & Posterior Chain |

**Days 2 and 4 are Fight Gym days; Day 7 is an optional/custom gym day.** `playbook.csv` has no
rows for these day slots — there is no Mobility/Strength/Bag/Cooldown programming for them.
`getWorkout(phase, day, hipScore)` detects `d === 2 || d === 4 || d === 7` and short-circuits to
`{ isFightGymDay: true, ... }` before doing any Playbook lookups. `HUD.jsx` uses this flag to
render `FightGymDay.jsx` instead of the normal block sequence. `FightGymDay.jsx` supports three
session types (Combat / Cardio / Mobility), the latter two using free-form "movement rows"
instead of the fixed Playbook structure. Day 7 reuses this machinery unchanged, but the HUD
defaults its Session Type to Cardio (rather than Combat) on the transition into day 7.

Session counting for phase-unlock explicitly **excludes** fight-gym days and Day 7:
`refreshCounts()` in `db/index.jsx` only increments a phase's counter
`if (s.day !== 2 && s.day !== 4 && s.day !== 7)`. The unlock threshold is
`PHASE_UNLOCK_THRESHOLD = 12` S&C sessions in the current phase (constant in `HUD.jsx`), gating
advancement past Phase 1 or 2 (not Phase 3 — `phase < 3` in the unlock check).

### Hip-score routing

Every mobility slot lookup is hip-aware via `hipAwareLookup()` in `usePlaybook.js`:

- **`hipScore <= 2`** is treated as "High Alert." If a High-Alert (`HA`) variant row exists for
  that Phase/Day/Block/Slot combination (`Key` suffixed `-HA`), it's returned instead of the
  standard row, and the result is flagged `isHighAlert: true`.
  Otherwise it falls back to the `-STD` row.
- This routing is applied to **Mobility slots only** in the current `getWorkout()` code —
  Strength (`STR`) lookups call `lookup(p, d, 'STR', slot)` with no variant suffix at all, i.e.
  strength programming does not vary by hip score. This matches the hook file's own header
  comment ("Strength (up to 4 slots, STD only — no HA variants)").
- The composite lookup key format, confirmed directly in code: `` `P${phase}-D${day}-${block}-${slot}-${variant}` `` (or without the variant suffix when none is given), mirroring what the header
  comment says was originally a Google Sheets formula convention.

`HUD.jsx` also surfaces the hip score as a standing banner regardless of block-level routing:
a red "HIGH ALERT" banner at ≤2, an amber "MODERATE" badge at exactly 3, and a green "GOOD"
badge at ≥4.

## Webhook contract

Defined by what `app/src/db/index.jsx` sends and what `scripts/webhook.gs`'s `doPost` expects.

### `action: 'log'`

Request body (JSON, sent with `mode: 'no-cors'`, so the app never reads a real response body —
success/failure is inferred only from whether the `fetch` call itself throws):

```json
{ "action": "log", "sessionId": "<uuid>", "payload": { ...session fields... } }
```

`webhook.gs` builds one spreadsheet row from `payload`, in this fixed column order (see
`docs/reference/fight-log-schema.md` for the full column-letter mapping, confirmed consistent
with the script logic read this session):

1. `date`, `day`, `phase`, `hipScore`, `sessionType` (5 columns)
2. **4 exercises × 4 sets × 3 values** (`kg`, `reps`, `papReps`) = 48 columns, built by a fixed
   nested loop (`for ex in 0..3 { for s in 0..3 { push kg, reps, papReps } }`) regardless of how
   many exercises/sets actually exist in `payload.strength` — missing entries push empty
   strings, so the row width is constant even for Fight Gym or partial sessions.
3. `core` (joined into one multi-line string `"ex — setsxreps"` per row), `altSessionDetails`,
   `sessionDuration`, `mobDone`, `clrDone`, `bagRounds`, `bagCourse`, `bagModules`,
   `bagWorkouts`, `notes`, `completeness`.
4. **`sessionId` is appended as the trailing column** — `row.push(..., sessionId ?? '')` is
   explicitly the last push before `log.appendRow(row)`. This is what later lets a delete action
   find the row again (see below).

### `action: 'delete'`

```json
{ "action": "delete", "sessionId": "<uuid>" }
```

`doPost` searches the last 100 rows of the `FightLog` sheet for any row whose concatenated cell
values (`values[i].join("||")`) contain the given `sessionId`, then calls `log.deleteRow(...)`
on the first match found, scanning from the bottom up. **This is currently a hard delete** — the
row is physically removed from the sheet, not marked cancelled or archived.

The `webhook.gs` file's own header comment states this explicitly: "on action:'delete'
HARD-DELETES the matching row." This matters because:

- `docs/planning/roadmap/OPEN-DECISIONS.md` decision **D1** rules that this should become a
  **soft delete** instead (a status column set to something like `CANCELLED`, row retained) —
  ruled 2026-07-10, "Option B — soft delete."
- Per that ruling, roadmap item **W17** (`docs/planning/roadmap/prompts/W17-soft-delete.md`) is
  the item that implements this change, and it is explicitly the one place where the
  do-not-touch-webhook guardrail (see `AGENTS.md` rule 2) is deliberately lifted.
- **As of this session, W17 has not been implemented.** The hard-delete behavior described above
  is what's live in `scripts/webhook.gs` right now — this file describes current reality, not
  the target state.

On the local (Dexie) side, `deleteLastSession()` in `db/index.jsx` deletes the matching
`sessions` row outright (`db.sessions.delete(lastSession.id)`) and enqueues the delete envelope
onto `syncQueue` — so locally, delete is also currently a hard delete, with no tombstone
mechanism observed in this file. Whether W17 introduces a local tombstone alongside the sheet
schema change is an open implementation detail of that (not-yet-run) item, not something this
session can verify.

## Known structural debt

- **`app/src/sync/` — expected but not present.** Roadmap item **W8**
  (`docs/planning/roadmap/prompts/W08-sync-refactor.md`) describes this as "a refactor was
  started long ago and never finished: `app/src/sync/` exists but is empty, and sync/queue logic
  lives inside `app/src/db/index.jsx`." **Directly checking this repo this session, the
  `app/src/sync/` directory does not exist at all** (not merely empty) — a discrepancy between
  the W8 prompt's description and the current repo state, noted here rather than silently
  reconciled. Regardless of whether the directory is empty or absent, the underlying fact the
  prompt is pointing at is accurate: all sync/queue logic (`trySyncQueue`, the `MAX_ATTEMPTS`
  retry counter, the `_syncInFlight` concurrency lock, the `online`/`focus` listeners) currently
  lives inline in `app/src/db/index.jsx` rather than in a dedicated module. W8 is the roadmap
  item intended to extract it into `app/src/sync/syncQueue.js` with (per its own hard rules)
  zero payload or behavior change.
- **No automated tests exist yet.** Roadmap item **W7**
  (`docs/planning/roadmap/prompts/W07-test-bootstrap.md`) is the planned introduction of a
  Vitest + `fake-indexeddb` test harness, explicitly sequenced *before* W8 so the sync refactor
  has a safety net. As of this session, no test framework, test files, or `test` script were
  found in `app/package.json` — this repo currently ships with zero test coverage.
