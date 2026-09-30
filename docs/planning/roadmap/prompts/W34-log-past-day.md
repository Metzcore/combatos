# W34 — Log a Workout for a Past Day · Tier: IMPL, then REVIEW
_Written 2026-09-30. Base: `main` @ `1f522d1`. Context: the developer sometimes forgets to log a
workout on the day it is done. Today, every cartridge session is stamped with the moment FINISH is
pressed, so a workout logged the next morning lands on the wrong day in History and the Overview
calendar, and there is no way to put it where it belongs. This item adds a date choice to the
existing Today logging flow. It is a small UI addition plus three reader fixes — not a second
logger._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything. This touches the
logging path and the frozen payload contract, so it takes the full `AI-WORKFLOW.md` §4 lifecycle.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions` and `mobile-interaction-ux` skills in
`.agents/skills/`, and `docs/reference/session-payload-schema.md` in full. Task: let a cartridge
session be logged against a past date. Nothing else.

## THE DECIDED SCOPE (do not relitigate)

Developer rulings, 2026-09-30:
- **The date is chosen on Today, not in a separate form.** Today already owns the cartridge
  renderer, substitutions, drafts, the payload builder and validation. A second logging surface
  would duplicate all of it and drift. A calendar shortcut into this flow is **W35**, a later PR.
- **Window: today and the previous 14 days.** No future dates.
- **`AGENTS.md` rule 2 is lifted for exactly one clarification** in
  `session-payload-schema.md` (point 4 below). The field set, key names, nesting and validation
  stay frozen.

**1. No payload shape change.** `date` already exists and is required. A past-day log differs only
in the *value* of `date`. Do not add a `backdated` flag, a `loggedAt` field, or any other key —
unknown top-level keys are validation errors by design, and the difference is already derivable
(`date` ≠ the date of `completedAt`).

**2. Field semantics for a past-day log:**
- `date` = the chosen training day.
- `completedAt` = the real instant FINISH was pressed. **Do not fabricate a time on the chosen
  day** — the schema forbids fabricated timestamps, and `completedAt` is the only truthful record of
  when the entry was made.
- `startedAt` = **omitted** when the chosen date is not today. It would be the moment the user
  started *entering data*, not the moment they started training, and the schema says `startedAt`
  is never fabricated.

**3. The control.** A "Logging for" control on Today's active workout, directly above FINISH:
**Today · Yesterday · Pick a date** (a native date input bounded by `min`/`max`, not a custom
calendar). Default is always Today. When a past date is selected the choice must be unmistakable
at the moment of pressing FINISH (e.g. the button reads "▶ FINISH — LOG FOR MON 28 SEP"). The chosen
date is **component state only — it is not written to the workout draft.** The A6.5 draft shape is
closed; leave it alone. Consequence, accepted: if the app is killed mid-entry, the resumed workout
shows Today again. That is visible (the control sits beside FINISH), not silent.

**4. One sentence in the frozen contract.** In `session-payload-schema.md` §4, add that `date` is
the training day and `completedAt` is when the session was recorded; they fall on different days
for a session logged after the fact, and `startedAt` is omitted in that case. Nothing else in that
file changes.

**5. Three readers must order by training day, not entry order.** A late entry would otherwise
be treated as the newest session:
- `utils/cartridgeDaySelection.js` `sessionSortKey` — currently `completedAt || date`. The
  suggested next day would jump forward past a workout that was actually done earlier.
- `utils/lastPerformance.js` (same key, line ~29) — "last time you lifted X" would show the
  back-filled numbers instead of the most recent ones.
- `components/Calendar.jsx` History — currently `b.id - a.id` (insertion order), so a back-filled
  entry would sit at the top of History.

Order by `date`, then `completedAt` (then `id` for History) as tie-breakers. **Prove, don't assume,
that this is a zero-change for existing data:** every existing cartridge row's `date` and
`completedAt` come from the same `nowDate` in `utils/cartridgeLogInput.js`, so ordering by
`(date, completedAt)` equals ordering by `completedAt`. For History, check whether any path
(e.g. the device-migration restore) can have inserted rows out of date order, and state the result.

**6. Date convention — do not mix.** The write path and every reader use
`new Date().toISOString().slice(0, 10)` — a **UTC** calendar date — and `utils/logOverview.js` says
so explicitly. "Today", "Yesterday", the 14-day bound and the picker's `max` must all come from that
same convention, via one pure helper. Do not introduce local-time dates alongside UTC ones: a
mixture puts a workout on the wrong heatmap cell. (The convention means a session logged between
midnight and 1 a.m. Irish summer time is dated the previous day. That is pre-existing and **out of
scope** — note it in the diagnostic, do not change it.)

**7. Structure for testability.** There is no component-test infrastructure (D14, still open). So
put every decision in pure code: a new `utils/logDate.js` (today string, allowed range, "is this
date allowed", label formatting) and a `logDate` input to `buildTrainingOrCustomLogInput`, which
sets `date` and drops `startedAt` when it is not today. The only untested part should be the wiring
from the control to that argument — and that gets a named device check below.

## EXPLICITLY OUT OF SCOPE
- **The Overview calendar shortcut** (tap an empty past day → Today with that date set). That is
  W35 and is designed after this lands.
- **Rest/recovery one-tap logging** (`buildRestOrRecoveryLogInput`) — stays today-only.
- **The legacy (non-cartridge) HUD logging path** (`HUD.jsx`). Cartridge sessions only.
- **Editing the date of an already-logged session.** New entries only.
- Changing the UTC date convention (point 6).
- `deleteLastSession` keeps its current meaning (the most recently *entered* session). Say in the
  diagnostic what it deletes after a back-filled entry; do not change it.

## DO NOT TOUCH
- The payload field set or validator key lists in `utils/cartridgeSessionPayload.js`, beyond
  whatever `date`-value validation the diagnostic proves is necessary.
- Dexie schema and the `workoutDrafts` shape, `syncQueue`, the Supabase `sessions` table (the
  payload is JSONB; no migration), `scripts/webhook.gs`, `playbook.js`, `%1RM`/e1RM math.
- `package.json` / lockfile. Zero new dependencies.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. Every reader of session `date` / `completedAt` / insertion order, and for each: does a
   back-filled row need a change? Point 5 lists the three known ones. Confirm there are no others
   (Overview heatmap, weekly stats, completeness trend, weight trend, any Supabase read).
2. The zero-change proof from point 5, with the evidence.
3. Confirm cartridge sessions no longer reach the Google Sheets webhook (the `db/index.jsx` and
   `sync/syncQueue.js` headers say so). If anything does still reach it, stop and report — rule 2
   is only lifted for the one sentence.
4. Whether the validator should reject a `date` outside the window, or whether bounding the input
   is enough. Recommend one, with the reason. (A future date reaching Supabase is the case to
   consider.)
5. Exact diff plan: files, new helper and tests, the control, the doc sentence. Nothing else.
6. Edge cases: a past date chosen and then Today re-selected; a past date on a `custom` day; two
   sessions on the same past day; a date picked at 23:59 that becomes "yesterday" before FINISH;
   the draft resumed after a kill.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only. `npm test` and `npm run build` both green, with real counts cited.
- Tests in house style (Vitest, `globals: false` so explicit imports, 4-space, no semicolons,
  behaviour-named `describe`): `logDate.js` boundaries (day 0, day 14, day 15, tomorrow); the
  builder drops `startedAt` and keeps a truthful `completedAt` for a past date and is unchanged for
  today; the three orderings, including a back-filled row that must *not* become "newest"; and a
  built past-day payload passes `validateCartridgeSessionPayload` unchanged.
- **Never hardcode a Dexie version number in a test.**
- Browser check at 375px via the `combatos-verify` launch config (port 5180, dev sign-in): log a
  workout for Yesterday; confirm it appears on yesterday's cell in Overview, in the right place in
  History, and that Today's suggested next day is what it would have been had it been logged on
  time. Then delete that test session.

## MANUAL CHECKLIST FOR THE DEVELOPER (real hardware)
- The native date input on Android Chrome and iOS Safari in standalone PWA mode: opens, respects
  the 14-day bound, readable in the app's dark theme.
- Log one real forgotten workout for yesterday; confirm the Overview calendar and History.
- Kill the app mid-entry with a past date selected; confirm the resumed workout shows Today and
  that this is obvious before pressing FINISH.

Commit: `feat(today): log a workout for a past day (W34)`.
