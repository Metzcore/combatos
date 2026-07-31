# W26 — Log Hub: Overview tab · IMPLEMENTATION PROMPT · Builder: Kimi (frontend)

_Written 2026-07-31. Design rationale and rulings live in
`docs/planning/rebuild/LOG-HUB-EXPERIENCE-PLAN.md` — this document is the executable half.
Same relationship as `TRAIN-EXPERIENCE-PLAN.md` → the `A11*` prompts._

**PRECONDITION — do not start until this is true:** `app/src/utils/logOverview.js` and
`app/src/utils/sessionActivityLabels.js` exist on the branch, with passing tests. Those are the
coordinator's Stage-1 deliverable (pure aggregation math). If they are missing, stop and say so —
do not write them yourself.

---

## Your role and boundary

You are building the **presentation layer only**. Every number you display is computed by a pure
utility that already exists; your job is to render it well on a portrait phone.

If a utility appears to return something wrong or missing, **stop and report it**. Do not patch the
utility, do not work around it in the component, do not recompute the value inline. Silent
disagreement between the math layer and the UI layer is the specific failure mode this split exists
to prevent.

## Read first (do not explore the repo beyond this list)

- `AGENTS.md` — hard rules
- `docs/planning/rebuild/LOG-HUB-EXPERIENCE-PLAN.md` — why this surface exists, what it must not become
- `.agents/skills/personal-analytics-viz/SKILL.md` — **binding.** Honest sparse data, small multiples, semantic color
- `.agents/skills/mobile-interaction-ux/SKILL.md` — **binding.** Portrait-phone interaction rules
- `app/src/utils/logOverview.js` — the two functions you consume (read the JSDoc contracts carefully)
- `app/src/utils/sessionActivityLabels.js` — the shared activity vocabulary
- `app/src/components/WeeklyStats.jsx` — the existing card/bar/dot idiom you are matching
- `app/src/components/Calendar.jsx` — the host component you modify
- `app/src/utils/navState.js` — tab labels
- `app/src/index.css` — existing tokens and `badge-*` classes

## Hard guardrails

**Never modify any of these:**
`app/src/utils/cartridgeSessionPayload.js` · `app/src/utils/sessionCategory.js` ·
`app/src/utils/weeklyStats.js` · `app/src/utils/logOverview.js` · `app/src/utils/dateMath.js` ·
anything under `app/src/db/` or `app/src/sync/` · `scripts/webhook.gs` · any file in `cartridges/` ·
`app/src/utils/phaseUnlock.js` · `app/src/components/HUD.jsx`

**Also:**
- **No new npm dependencies. No chart library.** Everything here is plain DOM + CSS grid/flex.
- **No new colors.** Use existing tokens only (`--primary`, `--accent`, `--alert`, `--warn`,
  `--dim`, `--label`, `--panel`, `--divider`) and existing `badge-*` classes.
- **Never parse a date with `new Date('YYYY-MM-DD')`.** It parses as UTC midnight and renders in
  local time, silently showing the wrong day for any user west of UTC. All date handling comes from
  the utilities or from string operations. See the History-tab fix below — this bug is live today.
- No sixth bottom-nav slot. No new nav idiom.
- Do not add analytics, tracking, streak counters, badges, points, or any fabricated reward. This
  surface reports what happened. Nothing else.

---

## Task 1 — Rename the two Log-hub tab labels

In `app/src/utils/navState.js`, `HUB_TOP_TABS.log`:

| key (**do not change**) | old label | new label |
|---|---|---|
| `log` | `Log` | `History` |
| `stats` | `Stats` | `Overview` |

**Change the `label` strings only.** The `key` values are matched literally in `Calendar.jsx`
(`view === 'stats'`) and validated by `setHubTab`; renaming them buys nothing and risks a silent
fallthrough to the wrong view.

---

## Task 2 — History tab (small, surgical)

In `app/src/components/Calendar.jsx`'s list branch:

**2a. Fix the date bug.** Line ~55 currently does:

```js
const displayDate = new Date(dateStr).toLocaleDateString('en-US', {...})
```

`dateStr` is a `YYYY-MM-DD` string, so this parses as UTC midnight and formats in local time — one
day early for any negative UTC offset. Replace it with string-based formatting in the same style as
`formatShort` in `WeeklyStats.jsx` (split on `-`, index a month-name array). Keep the same visual
output for the current timezone: `Thu, Jul 30`.

**2b. Demote legacy metadata.** Rows that are *not* cartridge rows (`isCartridge === false`) render
a `Phase N • Day M — FOCUS` line. That is permanent historical furniture — the pre-rebuild system no
longer exists and no new row will ever have it. Keep the information, reduce its visual weight
(muted color, smaller, in the existing `--dim`/`--label` vocabulary), so it reads as an archival
detail rather than a live concept. Cartridge rows are unchanged.

Nothing else in the History tab changes. Do not restructure the list, add filters, or paginate.

---

## Task 3 — Overview tab (the main build)

Replace the `WeeklyStats` mount in `Calendar.jsx`'s `view === 'stats'` branch with a new
`app/src/components/overview/Overview.jsx` composing three pieces, in this vertical order.

`Calendar.jsx` already loads every session into local state — pass that same array down. **Do not
add a second Dexie read.**

### 3a. `MonthHeatmap.jsx`

Consumes `buildMonthHeatmap(sessions, { year, month, todayStr })`.

Renders a **7-column, Monday-first** CSS grid of the month, with a weekday header row (`M T W T F S S`).

Cell states — all five are visually distinct:

| State | Appearance |
|---|---|
| `bucket: 'sc'` | green fill, glyph `S` |
| `bucket: 'combat'` | red fill, glyph `C` |
| `bucket: 'other'` | amber fill, glyph `O` |
| `bucket: 'rest'` / `'recovery'` | dim fill, glyph `R` |
| no session, past/today | empty — bordered outline, no fill |
| no session, **future** (`isFuture: true`) | flat/neutral, visibly *not* a missed day |
| padding (`null` cell) | render nothing |

**Both color and glyph are required.** Color alone is inaccessible to a colorblind user and this is
the surface's flagship visual — the existing hip-score dots already carry color *and* number for
exactly this reason. Match that precedent.

`isToday` gets a subtle outline/ring — position, not celebration.

`sessionCount > 1` on one date gets a small corner marker (a dot or the numeral). It happens
routinely — two sessions on one day already exist in real data. **`sessionCount > 0` with
`bucket: null`** (a logged session whose category is unrecognized) renders as a neutral filled cell
with no glyph — it is honestly "something was logged," never guessed into a category.

Controls: month **prev / next** only. No other filtering. Place them within one-hand reach and give
them real tap targets — this is the one interactive control on the screen.

Below the grid, one quiet summary line from the returned `counts` — e.g.
`12 sessions · S&C 7 · Combat 4 · Other 1`. Omit zero-count categories rather than printing `0`.

### 3b. `CompletenessTrend.jsx`

A horizontal row of small bars — one per week, oldest → newest, left → right. Bar height is that
week's `avgCompletenessCartridge` from `buildWeeklyStats(sessions, { weeks })`, which already exists
and already returns it. **No new math.**

- A week with `avgCompletenessCartridge === null` renders as an explicit **gap** (an empty slot or
  baseline tick), never as a zero-height bar. Zero and "no eligible session" are different facts and
  must not look the same.
- Never blend `avgCompletenessLegacy` into this strip. The two are deliberately never averaged
  together; this strip is the cartridge figure only.
- Label the axis extent in words, not numbers on every bar (e.g. `Last 8 weeks · avg completeness`).
  A value per bar is too dense at phone width — surface the exact number on tap if you want detail.

### 3c. `ActivityCoverage.jsx`

Consumes `buildActivityCoverage(sessions, { sinceDateStr, untilDateStr })`.

One row per activity, in the order the utility returns them (that order is the frozen schema order —
do not re-sort alphabetically or by count). Each row: label · `count / eligible` · a thin proportion
bar. Labels come from `sessionActivityLabels.js`; **do not write a second label map.**

- When `eligible === 0`, show a single honest empty state ("No sessions with activity data in this
  period") — not nine rows of `0/0`.
- When `unknown > 0`, add one quiet footnote: `N older sessions have no activity data`. This is
  schema-mandated honesty — those rows are excluded from both sides of the ratio because their data
  is genuinely unknown, not because it was zero.
- `pct === null` renders as an em dash, never `0%`.

### 3d. Period control

One shared control at the top of the Overview drives **3b and 3c** (not the heatmap, which has its
own month navigation): `8 weeks` / `26 weeks`. Derive `sinceDateStr` for 3c from the same window so
the two panels always describe the same period.

Two controls on one screen is deliberate — a monthly grid and a multi-week trend are different time
units, and forcing them onto one selector would make one of them useless.

---

## Consistency requirement

A given session must never be classified one way on History and another way on Overview. Both read
the same `sessionBucket()` / `categoryBadge()` logic through the utilities. If you find a case where
the heatmap cell color disagrees with that row's badge in the History list, **stop and report it** —
that is a real bug in the shared layer, not something to paper over in the component.

## Verification (all required before this is done)

1. `npm test` in `app/` — all tests pass. Add component tests only if the existing suite has a
   pattern for them; do not introduce a new test framework or React-render infrastructure.
2. `npm run build` in `app/` — production PWA build succeeds.
3. **Android portrait check on the developer's device**, per `mobile-interaction-ux`: heatmap cells
   are legible and tappable at real phone width, month nav is thumb-reachable, nothing overflows
   horizontally, the trend strip is readable without pinch-zoom.
4. Confirm honest empty states by looking at a real empty month and a real empty period — not by
   reasoning about the code.

## Out of scope — do not build

- Any Checklist or Notes data on this surface, in either direction (ruled out with the developer)
- A personal weekly target (dropped — see the experience plan §4.3)
- Off-programme logging changes (deferred; the existing custom-day mechanism covers it)
- Streaks, badges, points, projections, smoothing, or trend extrapolation
- Any change to what gets written when a session is logged
