# Combat OS — A7 corrective implementation plan

_Supersedes `docs/planning/roadmap/prompts/A7-FINAL-IMPLEMENTATION-PLAN.md` in full. That document
and the code it produced remain intact, unpushed and unmerged, on the `attempt1/a7-*` branches —
kept as an audit trail, not deleted, until separately authorized. This plan reconciles a Phase 0
read-only review of that first attempt against a set of binding product corrections and produces
the plan actually being implemented._

**Base:** `origin/main` at `1687451`, fast-forwarded locally through `docs/goodnight-2026-07-26`
(`384ebc1`) — that continuity close is treated as landed and is the actual base of this work._

**Implementation coordinator and sole writer:** Claude Sonnet 5 High.

## What went wrong the first time, in one paragraph

The first attempt built a working, end-to-end cartridge Today in one continuous session without
stopping at the Stage 0 → A7a → A7b review gates the original plan itself specified, verified it
live against the developer's real, authenticated Supabase account (writing one real test session
to production), and shipped a completeness/UI design that undercounted what mattered (RPE/RIR-only
sets silently dropped), overcounted what shouldn't matter (mobility/cooldown/conditioning in the
completeness denominator), and under-built the interaction design (tiny tap targets, a new
`confirm()`, dead collapse state, no scroll restoration, anonymous PAP rows, no superset grouping).
None of it is pushed or merged. This plan fixes the contract, the process, and the design before
any of it becomes permanent.

## Approval and PR gates (unchanged in spirit, restated)

1. **Stage 0 — this document + the revised payload contract. Documentation only.** Stop for review.
2. **A7a — pure data, validation, analytics fields, draft persistence.** No Today UI change. Stop
   for independent review.
3. **A7b — Today UI redesign.** Stop for independent review and Android acceptance.
4. **A7c — separate, later.** App-wide adoption of `FocusedNoteEditor` in Checklist/Notes, only
   after A7b is merged and phone-approved.
5. **W26 — later, unrelated to A7.** Not implemented now; only its research brief gains one
   recorded limitation (see §7).

Each stage stops for explicit review before the next begins. A later stage's branch existing
locally is never a reason to start implementing it.

## Protected scope (unchanged)

Do not modify: legacy HUD payload shape · the outer `{ action, sessionId, payload }` envelope ·
`scripts/webhook.gs` / FightLog Sheet layout · Supabase schema/indexes/RLS/Auth/assignments ·
`%1RM`/e1RM calculations or legacy `useHistory` · `playbook.csv` / generated `playbook.js` ·
service-worker/manifest/caching/PWA-update configuration · n8n · Checklist/Notes database schemas ·
Log hub UI or W26 implementation · D9 standalone/off-programme logging.

## Remote-safety rule (binding for every verification step in every later stage)

Browser verification uses isolated local data with Supabase disabled, mocked, or network-blocked.
No stage authenticates as a real account or lets `syncQueue` drain remotely. The stray
`payloadVersion: 1` production row (§ below) is not touched by anything in this plan; its removal,
if it happens, is the developer's own separate action against Supabase directly — never routed
through the app's "Delete Last Session" (which operates on local Dexie order and would target an
unrelated row once the local copy is gone).

## 1. Branch repair — executed during Stage 0, recorded here

```
main fast-forwarded:  1b6b835 -> 1687451 (origin/main) -> 384ebc1 (docs/goodnight-2026-07-26)
attempt1/a7-stage0-payload-lock   (renamed from feat/a7-stage0-payload-lock, untouched, b6fcd19)
attempt1/a7a-payload-builder      (renamed from feat/a7a-payload-builder, untouched, 60ed46b)
attempt1/a7b-interactive-today    (renamed from feat/a7b-interactive-today, untouched, b8833a8)
feat/a7-stage0-payload-lock       (new, based on main == 384ebc1)
```

Pure renames and fast-forwards only — no rebase, no reset, no force, nothing pushed. The three
`attempt1/*` branches are kept until you separately authorize deleting them; they are not part of
any PR and require no review themselves.

## 2. Payload version — v2, and why

See `docs/reference/session-payload-schema.md` §0 for the full reasoning. Short version: one real
`payloadVersion: 1` row already reached production Supabase during the first attempt's
verification, and its status is **not confirmed removed**. The corrected contract is
`payloadVersion: 2`; §10 of the schema document defines the tolerated, read-only, never-written-
again v1 shape. A7a's test suite carries an actual v1 fixture, not just a legacy and a v2 one.

## 3. Ruled decisions (D11 revised, D12 unchanged, D13 new)

Recorded in full in `docs/planning/roadmap/OPEN-DECISIONS.md`. Summary:

- **D11 (revised)** — the permanent cartridge-session payload is `payloadVersion: 2`;
  `sessionActivities`/`otherActivity` are required analytics-ready fields; completeness counts only
  strength/core (+ PAP/pair); mobility/cooldown/conditioning keep prescribed-guidance display,
  substitution, and notes, but no completion tracking of any kind; strict nested validation and
  exact numeric ranges are locked now (schema §5); Today reports **local draft durability only**,
  no remote-sync signal; `FocusedNoteEditor` is controlled UI over the existing draft controller,
  never a second writer; "Use Last Values" requires effective-exercise match and never exceeds the
  current prescribed slot count; superset mismatches are communicated via header set counts, not an
  absent-round placeholder.
- **D12 (unchanged)** — multi-phase cartridge execution remains an open, unblocking future decision.
- **D13 (new)** — Checklist/Notes owner-scoping for a future unified/cross-device Log view is a
  named, deliberately-deferred limitation (§7).

## 4. Component/state architecture for the redesigned Today (A7b target — not built in Stage 0)

**New shared component** (used in Today now; A7c adopts it elsewhere later):

- `app/src/components/FocusedNoteEditor.jsx` — **controlled** component: `value`/`onChange` from
  the parent's existing cartridge state (`cartridgeNotes`/`itemNotes[itemId]`), which is already
  persisted through `useWorkoutDraftPersistence`'s single debounce/schedule path. The editor itself
  owns **no Dexie access, no `workoutDraftController` reference, no independent timer** — it is
  strictly a presentation layer (compact idle preview → full-screen editor sized against the
  visible viewport when the keyboard opens, internal scrolling, explicit Done) over state the
  parent already autosaves. It calls the parent's `onChange` synchronously on every input change —
  **no internal debounce of any kind, even framed as a React rendering optimization**; only
  `useWorkoutDraftPersistence`'s existing debounce/schedule path may delay persistence. This is the
  exact correction to "no second writer or debounce chain," and prevents losing the latest
  characters if the app backgrounds or the component unmounts mid-edit.

**Today-scoped additions** (`components/today/`):

- `TodayHeader.jsx` — persistent header: day label, a `N/M sets` progress figure derived from the
  same completeness units (not a separate count), and a save-state string drawn **only** from
  `cartridgeDraftSaveStatus` (`Saving…` / `Saved on device ✓` / `Not saved — Retry`) — **no
  remote-sync signal of any kind**, resolving the open question from Phase 0 exactly as ruled.
- `SessionSummary.jsx` — two preparation checkboxes (Warm-up, Cooldown) + seven activity chips + the
  conditional `otherActivity` field (single line, bounded via `maxLength={120}` at the input plus
  validator rejection of any over-length or multi-line value on submit — user text is never
  silently truncated) + the session `notes` field via `FocusedNoteEditor`. All nine IDs write into
  one `sessionActivities` array; the checkbox/chip split is presentational only.
- `EffortGuideSheet.jsx` — a `BottomSheet` explaining RPE / RIR / %1RM. Explanatory only; no math
  changes.
- `SupersetGroup.jsx` — groups a block's strength/core items by `item.superset`, renders
  "SUPERSET A · N ROUNDS" with a **header line stating each member's own set count** when they
  differ (e.g. "A1: 4 sets · A2: 3 sets") rather than rendering a placeholder for a round a shorter
  member doesn't reach — a round simply shows fewer rows for that member, with the mismatch already
  disclosed up top.
- `PowerPairItem.jsx` (or a `pair`-aware branch of the strength item) — "POWER PAIR / MAIN · {name}
  / POWER · {pair.name}" instead of anonymous "PAP 1/2" rows. `pair: null` renders nothing.
- `ChangeExerciseSheet.jsx` (replaces `SubstitutionSheet.jsx`) plus a persistent two-line
  "Performed: X / Prescribed: Y" display once substituted.
- Revised `PerformedHoldItem.jsx` / `PerformedConditioningItem.jsx` — **read-only** guidance
  (name/dose/cue, or rounds/roundLength/rest/perRound/cue), **no checkbox, no stepper**; substitution
  and note actions remain, now as large one-thumb "Change exercise" / "Add note" controls, not the
  0.75rem links from the first attempt.
- Revised `PerformedStrengthItem.jsx` — one bounded visual unit per set (`SET 1 / Load / Reps` then
  effort); effort input is **conditional**: `prescribed.rpe` present → RPE input;
  `prescribed.rir` present → RIR input; neither → no effort input; `percent` alongside `rpe` →
  display the %1RM prescription text plus the RPE input. Never both RPE and RIR by default. Adds
  "Use Last Values" (effective-exercise-matched, prescribed-slot-capped — schema §9) and "Add Set"
  (appends one extra performed entry beyond prescribed count for asymmetric extra work; never
  affects the completeness cap).
- Revised `TodayBlock.jsx` — real `open`/`onToggle` wiring against `cartridgeBlockOpen`, keyed by
  block index within the frozen day (stable for the session's lifetime since the day is frozen at
  Start/Continue).

**DBProvider (`db/index.jsx`) additions:**

- `sessionActivities`/`setSessionActivities`, `otherActivity`/`setOtherActivity` — new flat state,
  same `WORKOUT_DEFAULTS`/reset discipline as every existing cartridge field.
- Wire the **already-existing** `cartridgeBlockOpen`/`setCartridgeBlockOpen` and
  `cartridgeScrollY`/`setCartridgeScrollY` (built in the first attempt's A7a, never consumed by its
  A7b) into `CartridgeToday` and `TodayBlock`.
- **Scroll**: a throttled scroll listener (matching `HUD.jsx`'s existing pattern in spirit, but
  explicitly throttled rather than relying solely on flush-on-backgrounding) keeps
  `cartridgeScrollY` reasonably current continuously, not just at flush time; a `useLayoutEffect`
  restores `window.scrollTo()` on mount from the resolved value. This is the correction to "scroll
  restoration absent."
- **Collapse initialization, transition-safe:** on a **fresh** workout (Start, not Continue), the
  first prescribed block with incomplete content opens by default, every other block starts
  collapsed; on **Continue**, whatever `blockOpen` map was persisted in the draft is used verbatim
  — the "first incomplete open" default applies only once, at true session start, never on every
  remount, and never overrides a state the user has already interacted with. Completing a block may
  gently auto-expand the next one; nothing the user has explicitly opened is ever force-collapsed.
- Small mutators: apply-last-values (copies `findLastPerformance`'s sets into
  `itemStateById[itemId].sets`, capped and effective-exercise-checked per schema §9), add-extra-set,
  add-superset-round (appends one entry to every member of a superset group in lockstep). All
  discrete actions use the existing `immediateTick` convention.
- Reset's destructive confirmation moves into a `BottomSheet` (mirroring `WorkoutDraftSheet.jsx`
  exactly), replacing the first attempt's `confirm()`; the trigger itself moves to a low-prominence
  secondary/overflow position, never the dominant bottom action.
- A new `.today-safe-actions` CSS class (sticky/fixed, safe-area padding, tactical tokens only) for
  Today's Finish/overflow bar — additive, does not touch the shared `.actions-bar` `HUD.jsx` still
  uses.

## 5. Staged file list and tests

### Stage 0 (this stage) — files

- `docs/reference/session-payload-schema.md` — full v2 rewrite (done).
- `docs/planning/roadmap/prompts/A7-CORRECTIVE-IMPLEMENTATION-PLAN.md` — this document (done).
- `docs/planning/roadmap/OPEN-DECISIONS.md` — D11 revised, D13 added.
- `docs/planning/roadmap/ROADMAP.md` — corrective-pass status.
- `docs/planning/roadmap/prompts/W26-log-hub-research.md` — D13/owner-scoping limitation appended.
- **No `AGENTS.md` change** — rule 2a already points at the schema document generically and does
  not enumerate fields; it covers `sessionActivities`/`otherActivity` without modification.
- **No app code.**

### A7a — pure data, validation, analytics fields, draft persistence (no Today UI)

Files:
- `utils/cartridgeSessionPayload.js` — fix `normalizeSets` (RPE/RIR-only preservation); add
  `sessionActivities`/`otherActivity` to the builder, `ALLOWED_TOP_LEVEL_KEYS`, and the validator;
  reject `sessionDuration`/`customContent` on `training`; enforce the substitution invariant
  independently of the builder; enforce exact numeric ranges (§5 of the schema doc) including
  per-set nested validation; revise mobility/cooldown/conditioning `performed` shape + validator
  (`{}`/`{name}` only, no `done`/`roundsCompleted`); bump `payloadVersion` check to `2`; add a
  dedicated (non-exported or clearly-marked) path/fixture for validating a historical
  `payloadVersion: 1` row is *readable* without being *acceptable as a new write*.
- `utils/cartridgeCompleteness.js` — zero out mobility/cooldown/conditioning contribution.
- `utils/lastPerformance.js` — skip newer records with no meaningful performed data; return
  `prescribedName`; add the effective-exercise-match + prescribed-slot-cap logic "Use Last Values"
  needs (as a pure helper A7b's UI calls, not duplicated there).
- `utils/sessionCategory.js` — fix `categoryOf`'s missing `payloadVersion`/`sessionKind` check.
- `hooks/useWorkoutDraftPersistence.js` — add `fields.sessionDuration` to the autosave dependency
  array; add `fields.sessionActivities`/`fields.otherActivity`.
- `db/index.jsx` — add `sessionActivities`/`otherActivity` state (`WORKOUT_DEFAULTS`, `useState`,
  reset, `getLiveDraftRow`); confirm `cartridgeBlockOpen`/`cartridgeScrollY` round-trip (already
  present from the first attempt — verify, do not rebuild).
- `utils/workoutDraftState.js` — extend `CARTRIDGE_STATE_FIELD_KEYS` with `sessionActivities`,
  `otherActivity`; extend render-safety checks accordingly.

Tests (every item explicitly required, several moved here from the first attempt's A7b staging per
the binding correction that all data/reader/rollback/phase-unlock compatibility tests belong in
A7a, not A7b):
- exact `sessionActivities` closed set, required `[]` on new training/custom rows, absence on
  legacy **and on `payloadVersion: 1`** rows read as unknown;
- duplicate/unknown activity id rejection;
- `otherActivity` presence/absence/blank/over-length/multi-line rejection;
- activities have zero effect on completeness;
- revised strength/core/PAP-only completeness denominator; conditioning-only and mobility-only
  completeness omission (`null`, never `0`);
- extra-set retention with completeness cap (confirm existing correct behavior explicitly);
- RPE/RIR-only payload preservation (the fixed `normalizeSets` defect);
- finite/non-negative/ranged numeric validation for every field in schema §5, including nested
  per-set entries;
- exact substitution invariants, independently validator-enforced;
- strict allowed keys at every nesting level; training-day rejection of `sessionDuration`/
  `customContent`;
- last-performance skipping empty newer rows; `prescribedName` present; effective-exercise-match
  and prescribed-slot-cap logic for "Use Last";
- a genuine `payloadVersion: 1` fixture read without error by every reader (`categoryOf`,
  `findLastPerformance`, `weeklyStats.js` aggregation), and rejected as a **write** target by
  `validateCartridgeSessionPayload`;
- mixed legacy/v1/v2 reader regressions (`weeklyStats.js`, `Calendar.jsx` logic where testable);
- delete/backup/transaction-rollback behavior with all three shapes present;
- phase-unlock exclusion — cartridge rows of any version never inflate legacy phase-unlock counts;
- duration-only autosave trigger (the fixed dependency-array defect);
- no UI-only fields (`blockOpen`, `scrollY`) ever reachable in a built payload.

No Today UI changes in this stage; `CartridgeToday.jsx` etc. are untouched until A7b.

### A7b — Today UI redesign

Files: the full component/state list in §4 above, plus removal of now-dead CSS
(`.today-rounds-stepper`, unstyled checkbox) and addition of real touch-target sizing for
Change-exercise/Add-note and the Preparation checkboxes/activity chips.

Tests: scroll/collapse draft round-trip (persist + restore, including the Continue-preserves-
existing-collapse-state case); collapse transition-safety (first-incomplete-open fires once, never
on remount, never fights a manual toggle); legacy payload byte-for-byte regression (still passes
unmodified); full suite + build + `git diff --check`; protected-file diff audit (explicit zero-diff
check against `scripts/webhook.gs`, `docs/reference/fight-log-schema.md`,
`supabase/migrations/**`, `app/src/hooks/useHistory.js`, `app/src/utils/math.js`,
`app/src/data/playbook.js`, service-worker/manifest config).

Browser verification: isolated local data, Supabase disabled/mocked/network-blocked, no real
authentication, no live sync drain — per the remote-safety rule above, without exception.

### A7c — separate, later

Adopt `FocusedNoteEditor` in Checklist/Notes' existing note surfaces, only after A7b is merged and
phone-approved. Not scoped now.

## 6. Android portrait acceptance (A7b, on-device, cannot be closed from here)

Set clarity · superset and Power Pair grouping (including a genuinely mismatched member-count
superset) · Add Set / Add Round · Use Last Values (including a deliberately-mismatched-exercise
case that must **not** copy) · keyboard Next order (load → reps → effort → next set; superset A1 →
A2 → next round) · focused note editing with the keyboard open · activity chips and the Other field
· warm-up/cooldown as read-only guidance (no stray checkbox) · block collapse/restore across
Today↔Plan↔Library, lock/unlock, force-stop/reopen, and offline reopen · save-state indicator
accuracy (local-only, never implying remote sync) · bottom safe-area placement and touch targets ·
no accidental Reset prominence · later PWA-update survival.

## 7. W26 brief amendment (D13)

`docs/planning/roadmap/prompts/W26-log-hub-research.md` gains one recorded limitation: Checklist
and Notes are device-local and unauthenticated-to-any-account; a future unified/cross-device Log
view needs an owner-scoping/sync decision for those two surfaces first, which does not exist yet
and is not decided by this document or by A7.

## 8. Stop conditions (unchanged from Phase 0, restated)

Stop and report rather than redesign if: live code contradicts this plan; a Dexie schema version
bump appears necessary; a new cartridge spec field appears necessary; a Supabase/webhook/Sheet/
service-worker/`%1RM`/e1RM change appears necessary; multi-phase execution becomes necessary; D9 or
broader W26 scope starts leaking into A7; the legacy HUD payload would change; an unrelated dirty-
working-tree change overlaps the task; any step would require authenticating as a real account or
touching the production Supabase row discussed in §2.
