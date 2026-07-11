# W22 — Checklist v1.1 Polish · Tier: IMPL, then REVIEW pre-merge
_Written 2026-07-11 from the developer's hands-on review of W21 against the live TRW Android app
(new reference screenshots in `docs/reference/therealworld-app-references/android-screenshots/checklist/`,
especially `checklist-timer-expanded.jpeg`, `import-checklist-expanded.jpeg`). Runs on main after
PR #14 (W21). Same hard boundary as W21: the checklist is LOCAL-ONLY — zero webhook/Sheets/sync
involvement._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules. Task: four scoped improvements to the Checklist hub shipped in W21.

## THE DECIDED SCOPE (developer + reviewer rulings, 2026-07-11 — do not relitigate)

**1. Group header actions → bottom sheet.** The group card header keeps ONLY the `+` (add task)
button. Rename / move up / move down / delete move into a `…` button opening a group-actions
bottom sheet (reuse `BottomSheet.jsx`, mirror `TaskActionsSheet`). Rename happens via an
**in-sheet text input**, NOT `prompt()`. Also replace the `prompt()` used by "+ Create Group"
with the same in-sheet input pattern. `prompt()` must not survive this PR anywhere in checklist
code (it renders inconsistently and is silently blocked in embedded browsers). Native `confirm()`
for the two destructive deletes STAYS as-is (works everywhere that matters; not in scope).

**2. Configurable daily reset time + "RESETS IN" countdown.**
- New setting, default `"00:00"` (midnight — current behavior). Store it in the EXISTING
  `settings` key-value store (e.g. key `checklistResetTime`) — **no Dexie schema bump**; if your
  diagnostic concludes a bump is unavoidable, stop and justify it.
- The logical checklist "day" boundary becomes the reset time instead of hard midnight: the
  logical date of an instant is the calendar date of (instant − reset offset). `checklistDate.js`
  is the single place this rule lives — extend it (e.g. `localDateStr(d, resetTime)` or a new
  `logicalDateStr`), keep it pure, and update ALL call sites (completion toggling, view model,
  streaks) so nothing computes "today" its own way. Streak math itself (`checklistStreak.js`)
  should not need changes — it operates on date strings; prove that in the diagnostic.
- Header left slot: a live **"RESETS IN HH:MM:SS"** countdown to the next reset (1-second tick
  scoped to its own small component so the rest of the hub doesn't re-render). Tapping it opens
  an edit sheet (BottomSheet) with a time input + Save. NO timezone picker — device-local only.
- Document (in the diagnostic) the behavior when the user changes the reset time mid-day: the
  logical "today" may shift, which can flip doneToday/streak display at that moment. That is
  accepted; no compensation logic.

**3. Share → JSON export.** A Share button in the checklist header exports the existing
`exportChecklist()` JSON (that function is the contract — do not change its shape). Use the Web
Share API with a file when available (Android Chrome PWA supports `navigator.share({files})`),
falling back to a plain blob download named `combatos-checklist-YYYY-MM-DD.json`. No report
image, no charts — data export only.

**4. Import → paste-text sheet.** An Import button opens a BottomSheet with a textarea: one task
per line; strip leading list markers (`-`, `*`, `•`, whitespace); ignore empty lines; show a live
"N tasks will be created" count; on confirm, create them as plain tasks (repeatDaily false, no
time) in the General group via the existing `createTask`/`quickAddTask` path. No image import,
no AI parsing, no import quota.

**Explicitly OUT:** Notes top tab (that's W23), Schedule view, checklist stats/charts in the Log
tab, report-image share, image/AI import, timezone handling, drag-and-drop.

## DO NOT TOUCH
- `exportChecklist()`'s output shape (it's the D4 connector contract, test-pinned).
- Dexie schema version (stays 2 — the settings store is key-value, no version bump for a new key).
- Anything outside the checklist feature + its utils/tests: HUD, sync/, webhook.gs, payload
  shapes, package.json / package-lock.json (zero new dependencies).
- The nav shell (AppShell/TopTabs/BottomNav).

## HOUSEKEEPING (include in your branch)
This prompt file (`docs/planning/roadmap/prompts/W22-checklist-polish.md`) and the W22/W23 lines
in `docs/planning/roadmap/ROADMAP.md` already exist in the working tree, uncommitted — `git add`
them into your PR so the planning layer travels with the change.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. **Reset-time design:** the exact signature change in `checklistDate.js`, every call site that
   must pass the setting, how the setting is read (once per render? per action?) and cached, and
   the proof that `checklistStreak.js` needs no change. List the new/updated unit tests
   (boundary instants just before/after reset time, default-midnight equivalence with W21
   behavior, DST days, reset-time change mid-day).
2. **Countdown component:** where the 1s interval lives, how it's cleaned up, and confirmation it
   can't re-render the group list.
3. **Group-actions + create-group sheets:** component structure, what gets deleted from
   `ChecklistGroupCard`, and the full list of `prompt()` call sites being removed.
4. **Share/export mechanics:** feature-detection order (`navigator.canShare({files})` →
   `navigator.share` → blob download), and what happens on desktop browsers.
5. **Import parsing:** the exact line-parsing rules and their unit tests (markers, whitespace,
   empty lines, duplicate titles allowed).
6. **Risk list**, including: any place that still computes "today" independently after your
   change; interval leaks; the settings read racing the first view-model load.

## PHASE 2 — IMPLEMENT (only after approval)
- Execute the approved plan. `npm ci` only; `npm test` and `npm run build` green; existing tests
  may be UPDATED only where the reset-time parameter genuinely changes a signature — explain any
  test-file diff in the report.
- Manual checklist for the user: group `…` sheet renames/moves/deletes (with cascade confirm
  text) · create group via sheet input · no `prompt()` anywhere · countdown ticks and survives
  hub switches · change reset time to ~5 minutes from now, watch a completed daily task reset
  when it elapses (and streak display behave per the documented rule) · Share produces a valid
  JSON file on the phone · Import of a 5-line paste creates 5 tasks in General · workout logging
  still lands in the Sheet.

Commit: `feat: checklist v1.1 — group action sheet, reset-time countdown, export/import (W22)`.

## REVIEW PASS (separate session)
Focus: single-source-of-truth for the logical day (grep for any stray `localDateStr()` calls
missing the reset parameter), interval cleanup, export shape untouched, and zero sync/webhook
imports (same grep as W21).
