# W26 — Log Hub: Overview tab · FOLLOW-UP 1 · Builder: Kimi (frontend)

_Developer review of your Stage 2 work found one real UX gap. This is a small, contained fix on
top of what you already built — everything else from the original prompt stands unchanged._

## What's already done for you (do not redo, do not modify)

`app/src/utils/logOverview.js` has been extended — each cell from `buildMonthHeatmap()` now also
carries its own `counts` object:

```js
{
  date, bucket, sessionCount, isToday, isFuture,
  counts: { sc: number, combat: number, other: number, rest: number, recovery: number }
}
```

`cell.counts` is the per-DAY equivalent of the month-level `counts` you already consume for the
summary line — same five keys, no `total`. A session whose category is unrecognized still counts
toward `sessionCount` but not toward any key in `counts` (matches the existing "never guess a
bucket" rule). Tests covering this are already written and passing (`logOverview.test.js`, 27/27).
The header title in `Calendar.jsx` has also already been changed from "Fight Log" to "Log" — not
your task, don't touch that line again.

## The problem

On a day with more than one session, `MonthHeatmap.jsx` currently prints a bare number in the
cell's corner (`cell.sessionCount`). The developer's own data has a day with 5 sessions, and seeing
a colored cell with a small "5" next to it reads as a rating or score — specifically, it collides
with the retired hip-score convention (colored dot + a 1-5 number), which this whole rebuild exists
to move away from. A bare digit also doesn't say *what* the sessions were — 5 of what?

## The fix — tap to reveal, not a bigger number

**1. Remove the corner numeral entirely.** Delete the `{cell.sessionCount > 1 && (<span>...)}` block
in `Cell` (`MonthHeatmap.jsx`).

**2. Replace it with a small, wordless "there's more" marker** — a solid dot (not a digit) in the
same corner position, shown only when `cell.sessionCount > 1`. It signals "tap for detail," nothing
more; it must never carry a number, since a number is exactly what caused the confusion.

**3. Make multi-session cells tappable.** Only cells where `cell.sessionCount > 1` become
interactive (`<button>`, not `<div>`) — a single-session cell or an empty cell stays exactly as
before, purely visual, no new affordance where there's nothing extra to reveal. This mirrors the
`CompletenessTrend.jsx` pattern one panel below on the same screen (bars as buttons, `selected`
state, a readout line beneath) — read that file before you start; match its interaction shape
rather than inventing a new one.

**4. Add a caption line below the calendar grid** (above the existing summary line, or replacing it
when something's selected — your call on exact placement, but it must not push the grid itself or
require scrolling to see). On tap, it reads the tapped cell's own breakdown from `cell.counts`, e.g.:

```
Jul 30 — 5 sessions: S&C x4, Combat x1
```

Only include categories with a non-zero count (mirror how the month summary line already omits
zero-count categories — don't repeat that logic, look at how `MonthHeatmap.jsx` builds
`summaryParts` today and reuse the same shape for the per-day version). Tapping the same cell again,
or tapping a different multi-session cell, should behave the same way the trend strip's selection
already does (toggle off / switch selection).

## Guardrails (same as the original prompt, repeated because they still apply)

- Do not modify `app/src/utils/logOverview.js` or its test file. If `cell.counts` looks wrong for
  some case you hit, stop and report — don't patch around it.
- No new dependencies, no chart library, tokens only.
- Keep the existing glyph-in-cell rendering for the *winning* bucket exactly as it is — this change
  only touches the multi-session marker and the new tap interaction, not the base cell rendering.
- The dot marker must be visually distinct from the `isToday` accent ring — they can coexist on the
  same cell (today could itself be a multi-session day) and must both remain legible together.

## Verification

1. `npm test` in `app/` — must still pass in full (960 baseline + anything you add).
2. `npm run build` in `app/` — production build succeeds.
3. On-device: confirm the dot is visible and the tap target is comfortably sized at real phone
   width (48px minimum, matching the month-nav buttons already in this file), and that a day with
   5 real sessions (the developer's own July 30 data) reads clearly once tapped.

## Out of scope

- Anything about the header title, tab labels, History tab, trend strip, or activity coverage panel
  — all untouched by this follow-up.
- Making single-session cells tappable — only multi-session cells get the interaction.
