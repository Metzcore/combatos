# Cartridge Session Payload — Schema Reference (v2)

_Frozen by the A7 payload lock (Stage 0, corrective pass — `AGENTS.md` rule 2a). This is the
permanent contract for every cartridge-driven logged session — the object stored in the local
Dexie `sessions` row, as the `payload` value inside the unchanged `{ action, sessionId, payload }`
envelope, and in the existing Supabase `public.sessions.payload` JSONB column. Rule 2a's own text
is field-agnostic — it points at this document rather than enumerating individual keys — so no
change to `AGENTS.md` is required by this revision; only this document changes._

**Legacy HUD sessions are unaffected and unversioned.** A row with no `payloadVersion` key is a
legacy session, read exactly as `docs/reference/fight-log-schema.md` and `ARCHITECTURE.md` already
describe. No legacy row is migrated or rewritten by this schema.

## 0. Why v2, not v1

The first implementation attempt (unpushed, unmerged — see `attempt1/a7-*` branches) shipped a
`payloadVersion: 1` contract, then wrote exactly one real row under it: a manual verification
session (Apex Protocol, Day 1) that reached the **production** Supabase `sessions` table before the
mistake was caught. That row has not been removed and must not be assumed removed.

Because that v1 shape differs from this corrected contract in ways that matter for readers
(completeness denominator, absence of `sessionActivities`, a `performed.done`/`performed.
roundsCompleted` shape on mobility/cooldown/conditioning items that no longer exists), reusing the
`1` version number for the corrected shape would let a future reader misinterpret that one
production row as if it already matched the new rules. **This document defines `payloadVersion: 2`
instead**, and readers must tolerate a `payloadVersion: 1` row as a distinct, historical, read-only
variant (§10) — never reinterpreted under v2 rules, never rewritten, never deleted by anything in
this codebase. No other v1 row is known or expected to exist; if the stray row is later confirmed
removed from Supabase, that fact does not retroactively change this document — v2 stays v2, and §10
stays in place as long as any v1 row might still exist anywhere (local device or Supabase) that
hasn't been positively confirmed gone.

## 1. Discriminator

Every cartridge session carries:

```json
{ "payloadVersion": 2, "sessionKind": "cartridge" }
```

A reader that does not recognize `payloadVersion` treats the row as legacy. A reader that
recognizes `payloadVersion` but not its exact value (i.e. sees `1`) applies the historical-variant
rules in §10, never the rules below. A reader that does not recognize `sessionKind` treats the row
as unknown and must not guess a shape.

## 2. Representative training session (v2)

```json
{
  "payloadVersion": 2,
  "sessionKind": "cartridge",
  "sessionId": "uuid",
  "date": "2026-08-02",
  "startedAt": "2026-08-02T17:04:11.902Z",
  "completedAt": "2026-08-02T18:21:40.115Z",
  "sessionCategory": "strength-conditioning",
  "cartridgeId": "combatos-operator-2026",
  "cartridgeVersion": "1.0.1",
  "cartridgeSchemaVersion": 3,
  "dayTemplateKey": "day:1",
  "dayTemplateLabel": "Day 1 — S&C: Lower + Posterior",
  "dayType": "training",
  "phaseId": null,
  "completeness": 62.5,
  "sessionActivities": ["warmup", "bag-workout", "cooldown"],
  "notes": "Solid session.",
  "blocks": [
    {
      "kind": "strength",
      "label": "Strength & Power",
      "items": [
        {
          "itemId": "d1-str-1",
          "prescribed": {
            "name": "Barbell Back Squat",
            "target": "Quads / Glutes",
            "sets": 4,
            "reps": "4",
            "prescription": { "rpe": 8 },
            "pair": null,
            "superset": null
          },
          "performed": {
            "sets": [
              { "kg": 100, "reps": 4, "rpe": 7 },
              { "kg": 105, "reps": 4, "rpe": 8 },
              { "rpe": 9 },
              { "kg": 105, "reps": 3, "rir": 1 }
            ]
          },
          "substituted": false,
          "note": "Left side felt off."
        },
        {
          "itemId": "d1-str-3",
          "prescribed": {
            "name": "Bulgarian Split Squat (DB)",
            "sets": 3,
            "reps": "6 each side",
            "prescription": { "rpe": 8 },
            "pair": { "name": "Single-Leg Broad Jump", "sets": 3, "reps": "3" },
            "superset": null
          },
          "performed": {
            "name": "Reverse Lunge (DB)",
            "sets": [
              { "kg": 24, "reps": 6, "rpe": 8 },
              { "kg": 24, "reps": 6 }
            ],
            "pair": { "sets": [ { "reps": 3 }, { "reps": 3 }, { "reps": 2 } ] }
          },
          "substituted": true
        }
      ]
    },
    {
      "kind": "conditioning",
      "label": "Bag Work",
      "items": [
        {
          "itemId": "d1-bag-1",
          "prescribed": {
            "name": "Jab-Cross Foundation",
            "rounds": 6,
            "roundLength": "3 min",
            "rest": "60s",
            "perRound": ["R1: Technical Jab-Cross"]
          },
          "performed": {},
          "substituted": false
        }
      ]
    },
    {
      "kind": "mobility",
      "label": "Warm-up",
      "items": [
        {
          "itemId": "d1-mob-1",
          "prescribed": { "name": "Your own 10-min warm-up routine", "dose": "10 min" },
          "performed": {},
          "substituted": false
        }
      ]
    }
  ]
}
```

Note the third strength set (`{ "rpe": 9 }`) — an effort-only entry with no `kg`/`reps`. This is
retained verbatim in the payload (a fixed defect from the first attempt, whose `normalizeSets`
silently dropped it) but does **not** count toward `completeness`'s numerator (§7).

## 3. Rest / recovery / custom variants

Rest and recovery rows carry the shared identity fields, their fixed `sessionCategory`,
`completedAt`, `blocks: []`, and no `completeness`/`sessionActivities` (there is no Session Summary
step for a day with no logged workout content):

```json
{
  "payloadVersion": 2, "sessionKind": "cartridge", "sessionId": "uuid",
  "date": "2026-08-04", "completedAt": "2026-08-04T09:00:00.000Z",
  "sessionCategory": "rest",
  "cartridgeId": "apex-protocol-phase1", "cartridgeVersion": "1.0.1", "cartridgeSchemaVersion": 3,
  "dayTemplateKey": "day:2", "dayTemplateLabel": "Day 2 — Rest", "dayType": "rest",
  "phaseId": "phase1", "blocks": []
}
```

Custom rows carry the shared identity fields, a user-selected `sessionCategory`, optional
`startedAt`, `completedAt`, `blocks: []`, plain-text `customContent`, optional numeric
`sessionDuration` (minutes), **`sessionActivities` (required, same rules as a training day)**, and
optional `notes`:

```json
{
  "payloadVersion": 2, "sessionKind": "cartridge", "sessionId": "uuid",
  "date": "2026-08-05", "startedAt": "2026-08-05T18:00:00.000Z",
  "completedAt": "2026-08-05T19:15:00.000Z",
  "sessionCategory": "combat",
  "cartridgeId": "combatos-operator-2026", "cartridgeVersion": "1.0.1", "cartridgeSchemaVersion": 3,
  "dayTemplateKey": "day:2", "dayTemplateLabel": "Day 2 — Fight", "dayType": "custom",
  "phaseId": null, "blocks": [],
  "customContent": "6 rounds sparring, 3 rounds pads",
  "sessionDuration": 75,
  "sessionActivities": ["bag-workout", "abs"],
  "notes": ""
}
```

A fight/class day getting an "abs" chip because you did a few minutes of core after class is
exactly the case `sessionActivities` exists for — it is not modelled as a separate structured
exercise, just a fact about the session.

## 4. Field rules

- Omit unused fields. Never zero-fill or null-fill them.
- `phaseId`, `prescribed.pair`, and `prescribed.superset` may be `null` when explicit absence is
  part of the frozen prescription (a cartridge item with no PAP pair, a cartridge with no phases).
- `completedAt` is always present.
- `startedAt` is optional and is never fabricated — captured only when Start was actually pressed;
  never substituted with the draft's `createdAt` (the first meaningful *save*, not the workout
  start).
- `sessionDuration` is permitted only on a `custom` day.
- `sessionActivities` is **required** (array, possibly `[]`) on `training` and `custom` days;
  **absent** on `rest`/`recovery` days. Unknown top-level payload keys are validation errors, and
  **so is every nested object** — an item's `prescribed`/`performed`, and each entry inside
  `performed.sets`/`performed.pair.sets`, are validated against their own closed key sets, not just
  checked for being "an object" (a corrected gap from the first attempt).
- Cartridge rows never emit any of: `day`, `phase`, `hipScore`, `sessionType`, `mobDone`,
  `clrDone`, `bagRounds`, `bagCourse`, `bagModules`, `bagWorkouts`, `strength`, `core`,
  `altSessionDetails`. These are legacy-only fields; their absence is what keeps cartridge rows
  invisible to legacy phase-unlock counting and legacy day-focus lookups.
- A `training` day never carries `sessionDuration` or `customContent` — those belong to `custom`
  only. (The first attempt's validator failed to enforce this; corrected here and in the validator.)

### `sessionActivities` — closed set

```
warmup · cooldown · bag-workout · cardio · mobility · abs · corrective-exercises · other
```

Stable IDs, not display labels — the UI's "Preparation" checkboxes (Warm-up, Cooldown) and
"Activities" chips (the remaining six) both write into this **one** array; the split is a UI
grouping, not a payload distinction. Duplicate or unknown entries are validation errors. `[]` is
valid and means "recorded, nothing selected" — distinct from the key being **absent entirely**,
which means "this row predates `sessionActivities` and its activity data is unknown" (§8).

`otherActivity` — a plain string, present **only** when `sessionActivities` includes `'other'` and
the value is non-empty after trimming. Single line (no `\n`/`\r`), **maximum 120 characters** after
trimming. Absent whenever `'other'` is not selected, or the field was left blank.

## 5. Exact numeric ranges (strict validation, locked now — enforced in A7a)

| Field | Rule |
|---|---|
| `completeness` | finite number, `0 ≤ x ≤ 100` |
| `cartridgeSchemaVersion` | finite positive integer (`≥ 1`) |
| `sessionDuration` | finite non-negative integer (minutes) |
| `performed.sets[].kg` | finite number, `≥ 0` (no fixed upper bound — a loaded lift's real range is open-ended) |
| `performed.sets[].reps` | finite non-negative integer |
| `performed.sets[].rpe` | finite number, `0 ≤ x ≤ 10` |
| `performed.sets[].rir` | finite non-negative integer (no fixed upper bound; realistically small) |
| `performed.pair.sets[].kg` / `.reps` | same rules as the main set's `kg`/`reps` — pair sets never carry `rpe`/`rir` (not part of the frozen shape; a pair-set object with either key is a validation error) |
| `otherActivity` | string, single line, trimmed, `1–120` characters |

A value that is present but fails its range (a negative `reps`, an `rpe` of `11`, a non-finite
`kg`) is a **validation error**, not a silently-dropped field — the first attempt's validator only
checked `typeof === 'number'`, which let `NaN`, `Infinity`, and negative values through.

## 6. Prescribed and performed shapes

`prescribed` is copied field-by-field from the frozen definition snapshot, through this allowlist
only — never a spread of the cartridge item:

- common: `name`
- mobility / cooldown: `dose`
- strength / core: `target`, `sets`, `reps`, `prescription`, `pair`, `superset`
- conditioning: `rounds`, `roundLength`, `rest`, `perRound`

Performed shapes:

- **strength / core**: `{ name?, sets: [{ kg?, reps?, rpe?, rir? }], pair?: { sets: [{ kg?, reps? }] } }` — unchanged from the first attempt except for the `normalizeSets` fix (an entry survives if **any** of `kg`/`reps`/`rpe`/`rir` is present, not only `kg`/`reps`).
- **conditioning**: `{ name? }` — **no `roundsCompleted`.** The rounds stepper is removed from the
  UI (ruling 4); conditioning stays read-only guidance plus optional substitution/note. What
  actually happened on a conditioning block is recorded through `sessionActivities` (`bag-workout`,
  `cardio`, …) and free-text `notes`, not a per-item count.
- **mobility / cooldown**: `{ name? }` — **no `done`.** Same reasoning: no checkbox, no per-item
  completion tracking; substitution and notes still apply (ruling 7), completion doesn't.
- every kind may carry an optional per-item `note`, and `name` only when substituted.

`performed.name` exists only when the item was substituted. `prescribed.name` always retains the
original prescribed exercise. `substituted` is derived from those two values at build time — never
trusted from draft input. **The validator independently re-derives and checks this invariant**
(the first attempt's validator accepted the builder's word for it without re-checking):
`substituted === true` requires `performed.name` to be a non-empty string different from
`prescribed.name`; `substituted === false` requires `performed.name` to be absent.

## 7. Completeness

One pure function drives both the live progress display and the stored value. **Only strength/core
main sets and a prescribed PAP/pair's own sets count** — mobility, cooldown, and conditioning
contribute nothing to the denominator (corrected from the first attempt, which counted all three).

| Kind | Units | Done |
|---|---|---|
| mobility / cooldown / conditioning | **0** — never contributes | — |
| strength / core main work | numeric `prescribed.sets` | performed set entries with non-empty `kg` **or** `reps` (an RPE/RIR-only entry does not count as filled), capped at prescribed sets |
| prescribed pair / PAP | numeric `prescribed.pair.sets` | performed pair-set entries with non-empty `kg` or `reps`, capped at prescribed pair sets |

- Every prescribed main item and every prescribed pair counts. There is no `optional` exception —
  that field does not exist in `PROGRAM-CARTRIDGE-SPEC.md`, the validator, or any shipped
  cartridge.
- Extra performed sets beyond the prescribed count are **retained in the payload** (real history —
  never discarded) but **never inflate completeness** past its cap; this was already correctly
  implemented and needs no code change, only this explicit confirmation.
- Zero total units (a conditioning-only or mobility-only training day, or `dayType` ∈ {`custom`,
  `rest`, `recovery`}) means `completeness` is **omitted**, never `0`. A conditioning-only day
  legitimately has no completeness at all.
- Rounded with `Math.round(value * 10) / 10`.
- `sessionActivities` has **zero effect** on completeness in either direction.

### WeeklyStats aggregation (unchanged from the prior pass, restated for completeness)

- `sc` / `combat` / `other` — workout session counts by category; `total = sc + combat + other`.
- `restDays` / `recoveryDays` — reported separately, **excluded** from `total`.
- `avgCompletenessLegacy` / `avgCompletenessCartridge` — never averaged together; `completenessMixed`
  true only when both exist for the week; a mixed week shows both, never one combined figure.

## 8. Analytics-readiness (W26 preparation, no new tables)

`sessionActivities` exists so a **future** W26 pure utility (not built now) can derive counts like
"Warm-up: 4 of 5 eligible workouts" or "Bag work: 3 sessions" directly from raw `sessions` rows —
no cached total, no new Dexie table, no schema change.

- **Eligible workout denominator** = sessions whose category is a workout category
  (`strength-conditioning` / `combat` / `custom`) — `rest`/`recovery` are never in the denominator.
- **Three states, not two**, for any given session's activity data: the key is **absent** (a legacy
  row, or a cartridge row from before this field existed — including any `payloadVersion: 1` row,
  §10 — meaning *unknown*, excluded from both numerator and denominator); the key is `[]`
  (*recorded, none selected* — counts toward the denominator, not the numerator); the key is a
  non-empty array (*counts toward both*). Coercing "absent" to "none selected" would misrepresent
  old data as a worse record than it is.
- **Two day-axes stay separate, permanently.** Workout `sessions.date` (calendar date) and
  Checklist/Notes' logical day (`checklistResetTime`) are never joined by anything in this
  document.
- **Known limitation, recorded, not solved here:** Checklist and Notes are device-local and
  unauthenticated-to-any-account today. A unified Log view spanning workouts and habits across
  devices, or for a multi-account household, needs an owner-scoping/sync decision for
  Checklist/Notes first — that decision does not exist yet and is out of scope for A7. See
  `docs/planning/roadmap/prompts/W26-log-hub-research.md`.

## 9. Last-performance recall and "Use Last Values"

```
findLastPerformance(sessions, { cartridgeId, itemId })
  → { date, prescribedName, sets: [{ kg, reps, rpe?, rir? }], substitutedTo? } | null
```

Matches on **both** `cartridgeId` and `itemId` — item IDs repeat across cartridges (e.g.
`d1-str-1` exists in both `apex-protocol-phase1.json` and `combatos-operator-2026.json`), so an
unscoped lookup would show one programme's history under another's item. `prescribedName` is a new
field (the first attempt's version omitted it) needed for the "same effective exercise" rule below.

**Corrected:** the newest *matching* session is not automatically the newest **meaningful** one — a
later session that logged the item but left every set empty (skipped that day, or substituted to
something else) must not mask an earlier session with real numbers. The recall walks newest-first
and skips any candidate whose `performed.sets` (main sets) contains no entry with `kg` or `reps`
present, continuing to the next-older match.

**"Use Last Values"** (an explicit user action, never automatic, never a suggested load):

- copies only when the **effective exercise matches**: today's effective name (the current
  substitution if one exists today, else the prescribed name) must equal the recalled record's
  effective name (`substitutedTo` if that historical record was itself substituted, else its
  `prescribedName`). A recalled Back Squat's numbers never populate today's Front Squat, even
  though both share `itemId: "d1-str-1"`.
- copies **at most the current prescribed set count** — never the historical record's set count if
  that was larger (a looser prescription, or manually-added extra sets, at the time it was logged).
  Historical extra sets are recall data, visible, but never auto-applied.
- is a single explicit tap; nothing pre-fills on render.

The legacy `useHistory`/`%1RM`/e1RM suggestion path (`app/src/hooks/useHistory.js`,
`app/src/utils/math.js`) is untouched and legacy-only. Cartridge Today shows factual recall only —
never a suggested load.

## 10. Historical `payloadVersion: 1` rows (read-only, tolerated, never written again)

Exactly one such row is known to exist, in production Supabase (a manual verification session,
Apex Protocol Day 1, logged during the first implementation attempt — see decision D11 in
`OPEN-DECISIONS.md`). Its shape, for reader reference only:

```json
{
  "payloadVersion": 1, "sessionKind": "cartridge",
  "…identity/date/category fields as in v2…": "…",
  "completeness": "computed under the OLD (incorrect) denominator — includes mobility/cooldown/conditioning",
  "blocks": [
    { "kind": "mobility", "items": [ { "itemId": "…", "prescribed": {"…"}, "performed": { "done": true }, "substituted": false } ] },
    { "kind": "conditioning", "items": [ { "itemId": "…", "prescribed": {"…"}, "performed": { "roundsCompleted": 5 }, "substituted": false } ] }
  ]
}
```

No `sessionActivities` key. `performed.done`/`performed.roundsCompleted` present on
mobility/cooldown/conditioning items — a shape v2 no longer produces.

**Reader rule:** any code path that reads cartridge sessions (`categoryOf`, `findLastPerformance`,
`weeklyStats.js`, `Calendar.jsx`) must not crash or misbehave on a `payloadVersion: 1` row. In
practice this falls out of rules that already have to exist anyway for pre-`sessionActivities`
cartridge rows in general (§8's "absent = unknown") and for the fact that `completeness` is a
**stored**, not recomputed-on-read, value — a v1 row keeps whatever number it was logged with,
displayed as-is, with no retroactive correction attempted or needed. The one thing every reader
must get right is not assuming `sessionActivities` exists just because `sessionKind === 'cartridge'`
— which the general "required-but-must-still-tolerate-absence-on-old-rows" rule already covers.
This document does not require a `payloadVersion === 1` special case anywhere in reader code beyond
that — but A7a's test suite must include an actual v1-shaped fixture (not just a legacy fixture and
a current v2 fixture) to prove it, since "should be covered by the general rule" is a claim, not a
verification.

**This variant is never written again.** `validateCartridgeSessionPayload` (A7a) only ever accepts
`payloadVersion: 2` for new writes; a `1` is rejected as a write target, exactly like any other
malformed input.

## Revision history

- **v2 (corrective pass):** completeness denominator restricted to strength/core (+ PAP/pair);
  `sessionActivities`/`otherActivity` added; mobility/cooldown/conditioning `performed` shape
  loses `done`/`roundsCompleted`; exact numeric ranges specified; substitution invariants and
  nested-object strictness specified for the validator; last-performance recall corrected to skip
  empty newer records and specified `prescribedName` + the "Use Last" effective-exercise/
  prescribed-slot-cap rule. Bumped from v1 specifically because one v1 row already reached
  production and must not be reinterpreted under the corrected rules.
- **v1 (first attempt, unpushed/unmerged):** initial cartridge payload — see `attempt1/a7-*`
  branches. Superseded in full by this document before any code was ever merged.
