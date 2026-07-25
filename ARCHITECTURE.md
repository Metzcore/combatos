# ARCHITECTURE.md — Combat OS

This describes the structure of the app as it exists in the repo today, based on reading the
actual source (last full pass: 2026-07-17, post-W17; targeted reconciliation 2026-07-24 for the
A10 Train IA and the live Supabase backend). Where something is ambiguous or not directly
confirmed in code, it's marked **unverified** rather than assumed.

## Component map

Entry point: `app/src/main.jsx` mounts `<AuthProvider><App /></AuthProvider>`. Inside `App.jsx`,
`AuthGate` renders only `<SignIn/>` while signed out, so `DBProvider` (from `app/src/db/index.jsx`,
nested `AuthProvider > AuthGate > CartridgeAccessProvider > DBProvider`) mounts only for a
resolved owner and **does** unmount on sign-out — corrected 2026-07-24 (A6.5); an earlier
revision of this doc predating the live Supabase auth work claimed `DBProvider` sat at the true
root and was never unmounted, which stopped being true once `AuthGate` was introduced. What still
holds: `DBProvider` is mounted once per signed-in session and never remounted by hub/tab
navigation, which is what matters for state survival (see "In-memory state" below).

```
App.jsx
├── DailyIgnition             (fixed full-screen splash overlay, conditionally rendered)
└── AppShell.jsx              (owns activeHub + per-hub top-tab state; renders exactly one hub)
    ├── TrainHub.jsx           (hub: "train" — Today / Plan / Library, A10)
    │   ├── HUD.jsx             (top tab: "Today" — the legacy workout HUD, pre-A7)
    │   ├── PlanViewer.jsx      (top tab: "Plan" — read-only active-cartridge orientation)
    │   └── CartridgeViewer.jsx (top tab: "Library" — assigned programmes + activation)
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

**Current structure (A10, pre-A7):** `TrainHub.jsx` hosts three top tabs — **Today** (`HUD.jsx`),
**Plan** (`PlanViewer.jsx`, read-only orientation around the confirmed active cartridge), and
**Library** (`CartridgeViewer.jsx`, assigned-programme preview + confirmed activation). Today
deliberately remains the legacy `playbook.js`-driven HUD until A7 makes it cartridge-driven; Plan
and Library are cartridge-aware. This describes the architecture as it stands now — A7 will change
how Today renders and logs.

`HUD.jsx` is the controller for the workout-logging (Today) screen. It reads workout structure from
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

### Dexie database: `FightersOS` (schema v4)

Defined in `app/src/db/index.jsx`. Four additive versions, each restating **all** tables
verbatim (Dexie requires the full schema per version; omitting a table would drop it and
destroy real data). No `.upgrade()` callbacks — all changes so far are purely additive.

```js
db.version(4).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key',
    checklistGroups: 'id, order',                                  // v2 (W21)
    checklistTasks: 'id, groupId, [groupId+order], deletedAt',     // v2 (W21)
    checklistCompletions: '[taskId+date], taskId',                 // v2 (W21)
    noteGroups: 'id, order',                                       // v3 (W23)
    notes: 'id, groupId, deletedAt, *tags',                        // v3 (W23)
    workoutDrafts: '[ownerUserId+slot], ownerUserId, updatedAt'     // v4 (A6.5)
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
- **`workoutDrafts`** (A6.5) — at most one row per owner (`[ownerUserId+slot]`, `slot`
  always `'active'` today). Durable mirror of the active-workout HUD state; see "Durable
  active-workout draft" below. Local-only and temporary — cleared on log, discard, or
  sign-out; never reaches `syncQueue` or the webhook payload, and is never the permanent
  logged-session shape.

**`webhookUrl` has a hardcoded default** in `DEFAULTS.webhookUrl` (`app/src/db/index.jsx`)
pointing at the live Apps Script deployment. No Settings UI exists to change it; overriding
it requires writing to the Dexie `settings` table directly.

**Test discipline:** tests never hardcode current-schema facts (`verno === 3`) — they use
capture-before/assert-unchanged or `>=` floors (a decision earned when the v3 bump broke
three such tests; the newest feature's own test owns the exact `verno` pin — see
`db/workoutDrafts.test.js`).

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

### Durable active-workout draft (A6.5)

Active-workout state above is React state — ephemeral by default, gone on a full reload.
A6.5 adds a **durable mirror** in the `workoutDrafts` Dexie table so an unfinished workout
survives a reload, phone lock, or PWA update, without changing where that state actually
lives during a session (still `DBProvider`) or the shape of the permanent logged-session
payload (still frozen — `AGENTS.md` rule 2).

- **Row shape** — one row per owner: `{ ownerUserId, slot: 'active', draftSchemaVersion,
  createdAt, updatedAt, workoutIdentity, definitionSnapshot, state }`.
  `workoutIdentity` is `{ kind: 'legacy-playbook' | 'cartridge', cartridgeId,
  cartridgeVersion, cartridgeSchemaVersion, dayTemplateKey, phaseId, hipScore }` — legacy
  rows null every cartridge field and encode day/phase as `legacy-day:{n}` /
  `legacy-phase:{n}` (parsed back by `parseLegacyDay`/`parseLegacyPhase`). `cartridge`-kind
  rows exist as a tested representation only — A7's renderer is what will make one
  reachable.
- **Frozen `definitionSnapshot`** — `HUD.jsx` freezes the resolved workout into React state
  (`frozenWorkout`) the moment a draft either becomes meaningful (fresh) or is resumed
  (Continue), and both **rendering** and every subsequent autosave use that frozen value
  instead of re-deriving from `usePlaybook()`. Without this, a `playbook.js` regeneration
  (PWA/content update) mid-session — or a resumed draft whose exercises have since been
  renumbered — would reinterpret already-saved slot values under different exercises, and
  the next autosave would silently overwrite the protective snapshot with fresh, possibly-
  different live data. `frozenWorkout` clears back to `null` on the next `draftLifecycleKey`
  bump (log success / Reset HUD), so the next draft freezes fresh.
- **Persistence controller** (`app/src/db/workoutDrafts.js`) — a **module-scope** singleton
  (`workoutDraftController`), not a hook. It owns the debounce timer, latest pending
  snapshot, a monotonic generation counter, and a serialized write chain. Module scope
  matters because `signOut()` lives in `AuthProvider`, an ancestor of any hook in the tree
  (`AuthProvider > AuthGate > CartridgeAccessProvider > DBProvider`) — only an object both
  can import directly can be invalidated synchronously from there. Every write captures its
  generation at schedule time and re-checks it **twice**: once before the Dexie `put`, and
  again immediately after the awaited `put` settles (success or failure) — `invalidate()` can
  run while a put is still in flight, and without the second check a write that went stale
  mid-flight would still land its own status update once it settled, most dangerously on
  failure, which would silently restore "Draft not saved" even though `invalidate()` had
  already reset status to idle and the draft may already have been successfully discarded or
  logged. A failed autosave write is caught internally and reported via `status: 'error'`
  (never thrown) — `HUD.jsx` renders a persistent "Draft not saved" banner with Retry
  (`flushDraftNow`) while that status holds. `discardDraft()` is different: it **rejects** if
  the underlying delete fails, because an interactive caller (Discard, Discard-and-switch,
  Reset HUD) must not proceed as if a row it failed to remove were actually gone. Sign-out is
  the sole exemption — `AuthProvider` wraps its two calls in their own best-effort catch,
  since blocking sign-out on a local delete failure is worse than a stray row the composite
  owner key already prevents another identity from ever hydrating. `invalidate()` also clears
  a stale `'error'` status back to idle (every caller — discard, sign-out, log — is ending
  this draft's write lifecycle, so a report about a prior save no longer describes anything
  live); without this, a successful discard/log after a failed autosave left "Draft not
  saved" stuck on screen with a Retry that had nothing left to retry. And because
  `invalidate()` also cancels whatever debounced edit was still pending, `discardDraft()`
  captures that snapshot first and — if the delete itself fails — re-persists it under the
  new generation before the rejection propagates, so a failed discard can never silently drop
  the user's latest unsaved input; if that RECOVERY put also fails, the controller sets
  `status: 'error'`/notifies rather than leaving itself looking idle while the edit is
  genuinely at risk of being lost.
- **Meaningful-input gating** (`app/src/utils/workoutDraftState.js`) — identity, selection
  (day/phase/hip/session-type) and UI-only fields (scroll, collapse) never create a draft by
  themselves; a row is written only once real content exists (a check, a performed value, a
  note, …). Once one exists, everything is saved with it. Same module owns hydration
  validation: owner mismatch / unsupported schema-or-kind fail closed without hydrating or
  rewriting; a row's three discriminators (`workoutIdentity.kind`, `definitionSnapshot.kind`,
  `state.kind`) must each be individually recognized **and** form one coherent combination
  (legacy+legacy+legacy or cartridge+cartridge+cartridge) — a mixed triple is an invariant
  violation (`'corrupt'`), never a "future format"; a structurally coherent cartridge-kind row
  is still refused (`'unsupported-state'`) because the legacy HUD — the only renderer that
  exists before A7 — must never offer one. A `legacy-workout-v1` snapshot is checked
  end-to-end for render safety, not just at the array level: `mobSlots`/`strSlots`/`clrSlots`
  must be arrays (`HUD.jsx` calls `.filter()`/`.reduce()`/`.map()` on them directly) **and**
  every entry inside them must be a plain object (`MobilityBlock`/`StrengthBlock`/
  `CooldownBlock` dereference `slot.exercise`/`slot.duration`/… directly — a `null` entry
  crashes there just as surely as a non-array field does); `dailyFocus` must be `null` or a
  string (rendered directly as a JSX child — an object value there is a React crash, not just
  bad data). The legacy identity itself must not just be well-typed — `dayTemplateKey`/
  `phaseId` must actually PARSE (`legacy-day:{n}`/`legacy-phase:{n}`) and fall inside the
  ranges the HUD actually offers (day 1–7, phase 1–3, hip score 1–5), or resuming would select
  nothing in a `<select>` or feed `usePlaybook()` a combination it was never designed to look
  up. And `state.fields`' own containers are checked the same way: `mobChecked`/`clrChecked`/
  `strSets`/`coreSets` must be plain objects and `altRows` an array — `resumeDraft()` and
  `handleLog()` (`altRows.map(...)`) dereference them as such directly. The same module also
  owns the identity-conflict matrix used below, and `classifyHydratedDraft` — the pure reducer
  `DBProvider`'s
  hydration effect calls to turn a raw read (or a **read failure**) into
  `{ continueDraft, draftIssue }`. A read failure is its own protected `draftIssue`
  (`reason: 'read-failed'`) — never collapsed into "no draft exists" — because the underlying
  row may still be there and valid; autosave would otherwise silently overwrite it the moment
  new content became meaningful. Only Retry (`retryHydration()`, which bumps a key the
  hydration effect depends on) recovers it — there is no Discard, since it's unknown whether
  anything exists to discard.
- **Resolution gate** — while hydration itself hasn't resolved (`draftPhase !== 'ready'` —
  covers the initial idle/hydrating window AND the Retry transition, which re-runs the same
  effect and briefly clears `continueDraft`/`draftIssue` before the new outcome lands) OR
  `continueDraft`/`draftIssue` (including `'read-failed'`) is set, `HUD.jsx` renders **only**
  a banner (a generic "Loading your workout…" placeholder during hydration itself, the
  specific offer/issue banner once classified) — no selectors, no blocks, no Log/Reset. Log
  in particular must never be reachable before hydration has actually resolved. Editing or
  logging over an unresolved offered/protected draft would silently create a second,
  conflicting version of "what's live". `autosaveEnabled` (`DBProvider`) is gated the same way,
  so autosave stays off for the same duration.
- **Autosave + flush** (`app/src/hooks/useWorkoutDraftPersistence.js`, called from `HUD.jsx`
  — the only place the effective, possibly-frozen `workout` is available for the
  `definitionSnapshot`) — checks/substitutions save immediately; text/numeric edits debounce
  at 700ms (the `NoteEditor.jsx` precedent). Every row build reads `window.scrollY` directly
  rather than the `hudScrollY` field passed in — `DBProvider`'s `hudScrollY` state is only
  synced by `HUD.jsx`'s own scroll effect on **its** unmount, a `setState` call that never
  reaches a next render when the component is unmounting, so it would otherwise be flushed
  stale by up to an entire scroll session. Flushes fresh (not just re-sent stale) state on
  `visibilitychange`(hidden), `pagehide`, and its own unmount (a Today→Plan/Library tab
  switch, this app's most common backgrounding event). `DBProvider`'s own unmount flushes
  whatever the controller already has pending as a belt-and-suspenders net for the sign-out/
  teardown case, where no `workout` is available to rebuild a fresh row.
- **Continue / conflict UX** — a valid draft puts Today into the resolution gate above with
  Continue/Discard; `resumeDraft()`/`discardCurrentDraft()` live on `DBProvider`. Continuing
  also freezes `definitionSnapshot` (see above). Day/phase/hip-score changes (and cartridge
  activation, wired but currently inert — see below) pass through a shared
  `attemptIdentityChange` preflight: if the live draft is meaningful *and* the change would
  move to a different identity, `WorkoutDraftSheet.jsx` (a `BottomSheet`) gates it — Keep/
  backdrop/close all preserve the workout; only "Discard and switch" clears the draft first,
  and — since `discardDraft()` can now reject — stays open with an inline error on failure
  rather than silently proceeding. Keep/backdrop/close are themselves disabled/ignored while
  a discard-and-switch is in flight (`pending`): without this, tapping Keep the instant after
  starting a discard would close the sheet and let the user resume working, only for the
  already-in-flight discard to complete moments later and call `resetActiveWorkout()`
  regardless — silently wiping whatever they'd just done. A legacy draft's null cartridge
  identity never conflicts with a cartridge activation target, so `CartridgeViewer.jsx`'s
  wiring is a no-op until A7 makes a `cartridge`-kind draft reachable.
- **Reset HUD** — `discardAndResetActiveWorkout()` (`DBProvider`) invalidates pending writes
  and deletes the durable draft **first**; only clears live state (`resetActiveWorkout()`) if
  that succeeds, surfacing an error and leaving fields untouched otherwise — clearing them
  regardless would desync the screen from a still-persisted row a later reload would offer as
  Continue. `logSession()`'s own post-commit reset does **not** go through this path: the
  atomic transaction below already deleted the row, so re-discarding would be a redundant
  delete-of-an-absent-row that could only ever spuriously fail and mask an already-successful
  log.
- **Atomic local logging** — `HUD.jsx`'s `handleLog` first flushes the newest snapshot
  (`flushDraftNow()`); if THAT flush itself fails, logging **aborts** entirely (no transaction,
  no reset) rather than proceeding — otherwise, if the atomic transaction below also failed
  for an unrelated reason, the recoverable draft left behind would be stale, violating "leaves
  the freshest recoverable draft". Live state is untouched either way, and the existing
  "Draft not saved" banner is already visible with Retry. Once flushed, `logSession()` freezes
  autosave (`invalidate()`) then calls `commitLoggedSession()` (`app/src/db/workoutDrafts.js`)
  — one Dexie transaction across `sessions` + `syncQueue` + `workoutDrafts`: add the session,
  enqueue the sync envelope (`enqueueSync()` joins the ambient transaction unmodified — no
  change to `sync/syncQueue.js`), delete the draft. `commitLoggedSession` is extracted
  specifically so `db/workoutDrafts.test.js` exercises the exact function production calls,
  not a hand-copied mirror — this repo has no React-render test infrastructure to exercise
  `DBProvider.logSession` directly. Only a committed transaction triggers the in-memory
  reset/success message; a failure rolls all three back and the draft survives.
- **Sign-out isolation** — both explicit `signOut()` and the Supabase `SIGNED_OUT` event
  invalidate the controller and attempt to delete the resolved owner's draft, catching (not
  propagating) a delete failure so it can never block sign-out itself; the composite
  `[ownerUserId+slot]` key means a later identity can never hydrate a prior owner's row
  regardless.

### Auth & Supabase backend (live since 2026-07-21)

Alongside the local Dexie layer, a Supabase backend provides identity and per-account programme
access. It is **not** on the logged-session write path — that still goes to the Google Sheets
webhook (repointing it to Supabase is separate, unstarted work).

- **Auth** (`app/src/auth/AuthProvider.jsx`): Supabase magic-link, **invite-only** at two layers
  (`shouldCreateUser: false` in the app; project signups off). A tightly-scoped offline mode lets a
  previously-confirmed device resume read-only when auth cannot refresh purely due to a network
  failure (A9c); explicit sign-out clears device trust. The publishable key is the
  `VITE_SUPABASE_ANON_KEY` (RLS is the real protection).
- **Schema** (captured as repo migrations under `supabase/migrations/`): `profiles` (one row per
  user; `assigned_cartridge` is the single active-programme pointer), `sessions` (a generic JSONB
  payload, so the cartridge rebuild changes the payload, not the table), and `user_cartridges`
  (which programmes a coach has made available). RLS isolates each user to their own rows; a user
  may update only their own active pointer.
- **Cartridge access** (`app/src/cartridges/`, `app/src/sync/cartridgeAccess.js`): the confirmed
  access snapshot is cached in the Dexie `settings` store for instant/offline reads; unknown server
  cartridge IDs are preserved and reported, never silently substituted.
- **On sign-out**, the cartridge-access cache and the owner's `workoutDrafts` row (A6.5) are both
  cleared; logged `sessions`/checklist/notes Dexie data persists (see `AGENTS.md` and
  `docs/engineering/AI-WORKFLOW.md` for the persistence risk gates).

## Day structure: 3 phases × 7-day cycle (legacy Today/HUD model)

This section describes the **legacy `playbook.js`-driven model** that still powers the Today/HUD
tab (pre-A7). Cartridge programmes do not use this fixed rotation: under decision **D10** a
cartridge is a **flexible pool of day-templates with a suggested order** — any day-template is
loggable on any date, the order is guidance, not a lock. A7 is what will connect that cartridge
model to Today; until then, Today runs the sequential cycle below.

The legacy program is 3 phases, each cycling strictly sequentially through 7 days (1→…→7→1;
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
  automatically. Export-only by design; a local restore/import path is still not built (Supabase
  is now live, but the import half remains deferred), and this JSON doubles as a migration seed
  (D7). Delivered via the share-or-download path; `lastFullBackupAt` records the last delivered
  backup.

## Tests

Vitest (`npm test` in `app/`; `vitest.config.js`), with `fake-indexeddb` for Dexie-touching
suites. The suite grows with each feature — **run `npm test` for the current count and
pass/fail** rather than trusting a number here. Tests are colocated with their subjects. The
list below is **not exhaustive** (`npm test` is the source of truth) — representative areas:

- `db/` — backup, checklist, notes, syncQueue, cartridgeAccess (cache), workoutDrafts (schema
  upgrade, controller, atomic-transaction pattern)
- `utils/` — navState, checklistDate/Import/Share/Streak, nextDay, noteChecklist/Filter/Tags,
  weeklyStats, blockOrder, phaseUnlock, validateCartridge, cartridgeFormat/Library/Plan,
  workoutDraftState (meaningful-input, hydration validation, identity-conflict matrix)
- `hooks/` — usePlaybook
- `auth/` — offlineAccess; `cartridges/` — accessModel; `sync/` — cartridgeAccess (Supabase reads)

Pure logic is deliberately extracted to `utils/` modules (no React/Dexie imports) precisely so it
can be tested in a plain node environment. Browser globals in tests are stubbed via `vi.stubGlobal`.

## Known structural debt

- **`webhookUrl` has no Settings UI** — changing the target requires a direct Dexie write.
  Acceptable while the default points at the live deployment; becomes real debt only if the app
  ever needs to write to more than one webhook target. (Apex is a cartridge inside this shared
  app, not a separate deployment, so it does not by itself create that need.)
- **The delete search window is the last 100 rows** of `FightLog` — a session older than
  ~100 logs can no longer be soft-deleted remotely. Accepted: the app only offers
  "Delete Last Session".
- **`deleteLastSession()` only targets the most recent session** — there is no arbitrary-
  session delete in the UI.
- **`Calendar.jsx` sorts by `id` descending** as a proxy for recency — correct as long as
  sessions are only created live (never backfilled with older dates).
- **No React-render test infra exists in this repo** — all Vitest coverage drives Dexie
  tables and pure `utils/` logic directly, never a mounted component. A6.5's hydration
  effect, the frozen-workout render decision, autosave field-wiring, and the
  visibilitychange/pagehide/unmount flush paths are therefore verified by direct code
  review plus manual/E2E browser testing, not by an automated test that renders
  `HUD`/`DBProvider`. Where the underlying decision was extractable as a plain function
  independent of React, it was — `commitLoggedSession()` (the exact atomic-logging
  transaction, `db/workoutDrafts.js`) and `classifyHydratedDraft()` (the hydration-outcome
  reducer, `utils/workoutDraftState.js`) are both called by production and exercised
  directly by `db/workoutDrafts.test.js`/`utils/workoutDraftState.test.js`, rather than
  being re-implemented as a hand-copied test mirror that could silently drift. The other
  persistence primitives (debounce, generation, resurrection-race prevention, save/discard
  error propagation) are fully unit tested in `db/workoutDrafts.test.js` independent of
  React.
- Historical notes: W7 (test bootstrap) and W8 (sync extraction), described as pending in
  older revisions of this file, are long shipped; `app/src/sync/` exists and is the real
  home of sync logic.
