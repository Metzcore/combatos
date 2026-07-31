# W26 — Log Hub: Overview tab · FOLLOW-UP 2 · Builder: Kimi (frontend)

_Second developer review, on-device. Three problems, all presentation. No data-layer change is
needed for any of this — `logOverview.js` already returns everything required. Do not modify it._

The governing principle for this round, in the developer's words: **"the entire Overview tab should
not leave the user guessing what everything means."** Every number, colour, and control on this
screen should explain itself without the user having to infer it.

---

## Problem 1 — The tap affordance is arbitrary

`MonthHeatmap.jsx` line ~68: `const tappable = cell.sessionCount > 1`.

On device this means one green cell responds to touch and the green cell right next to it does
nothing, with no visible difference except a small dot. That is not a learnable rule — the user
taps a session day, gets nothing, and concludes the calendar is broken.

**Fix: any cell with `sessionCount >= 1` is tappable.** Empty past cells and future cells stay
non-interactive (there is genuinely nothing to reveal).

The corner dot stays, but its meaning changes: it now means **"more than one session on this day"**
— extra information, not the tap affordance. Every coloured cell is tappable whether or not it has
a dot.

**Watch out:** `dayBreakdownCaption()` currently hardcodes `"${cell.sessionCount} sessions"`. Once
single-session days are tappable that renders "1 sessions". Pluralise it.

## Problem 2 — Nothing explains what the colours mean

The grid shows green `S` cells, an amber `O`, a dim `R`, outlines, and filled neutrals, with no key
anywhere. The developer's note: *"we need to add a label that explains why certain blocks are
highlighted."*

**Add a compact legend directly beneath the grid**, above the summary line. One row, wrapping if
needed, each entry a small swatch in the bucket's own colour carrying its glyph, plus its name:

```
[S] S&C   [C] Combat   [O] Other   [R] Rest / Recovery
```

Reuse `BUCKET_STYLE` — do not restate the colours anywhere else. Keep it quiet (small text,
`--dim`); it is a key, not a headline. Rest and Recovery share one entry since they already share a
visual treatment.

## Problem 3 — The two count lines read as one run-on string

With a day selected the screen currently shows, stacked and centred in near-identical styling:

```
Jul 30 — 5 sessions: S&C x4, Combat x1
7 sessions · S&C 6 · Combat 1
```

The developer read these as a single confusing string. They are two different scopes — one day
versus the whole month — presented as though they were one thought.

**Fix both lines so their scope is self-evident:**

- The month line always carries an explicit scope label, e.g. `JULY TOTAL · 7 sessions · S&C 6 ·
  Combat 1`. It never appears as a bare list of numbers.
- The selected-day caption is visually distinct — accent-coloured, and clearly the transient one.
  It keeps its reserved-height slot so the grid never shifts.

Keep both visible simultaneously (the month total staying put while inspecting a day is useful) —
the fix is hierarchy and labelling, not hiding one.

## Problem 4 — The period control implies it governs the calendar

The `8 WEEKS / 26 WEEKS` control currently sits at the very top of the tab, above the calendar. It
does not affect the calendar at all (the calendar has its own month navigation). A control placed
above something reads as governing it.

**Move the period control out of the top of `Overview.jsx` and place it directly above the
completeness-trend section** — i.e. below the calendar, immediately on top of the two panels it
actually drives. Give it a short scope label so its reach is unambiguous, e.g. a small heading like
`TREND & COVERAGE PERIOD` or equivalent.

The calendar keeps its own month prev/next exactly as-is. Two time controls on one screen is
intentional; the fix is making each one's scope obvious by placement and labelling.

## Problem 5 — Sections do not explain themselves

Each of the three panels needs one short, plain-English line under its heading. Style them
consistently (small, `--dim`) so they read as help text, not content.

**Calendar** — the legend from Problem 2 does most of this work. Add only if it reads thin:
one line noting each square is a day and tapping a coloured one shows what was trained.

**`LAST 8 WEEKS · AVG COMPLETENESS`** — currently seven dashed empty boxes and one small green bar,
with no scale and no definition. It looks broken rather than sparse. Needs:
- A one-line definition in plain language: completeness is how much of a session's prescribed
  strength/core work was actually recorded. Do not write a formula — say it in words.
- An explicit note that **a dashed slot means no S&C session was logged that week** — not zero
  percent. This distinction is already correct in the code; it just isn't communicated.
- A `100%` reference marker at the top of the track so the bar heights have a scale.
- The date range under the strip (first week's start → last week's end, both already available on
  `buildWeeklyStats()` output as `weekStart`/`weekEnd`) so "last 8 weeks" is concrete.

**`ACTIVITY COVERAGE`** — rows read `2/6` and `33.3%` with no stated denominator. Add a line
explaining that the figures cover the logged workouts in the selected period, and state the count
(`coverage.eligible`, already returned). The existing "N older sessions have no activity data"
footnote stays as-is — it is doing its job.

---

## Guardrails (unchanged, still binding)

- **Do not modify `app/src/utils/logOverview.js` or `logOverview.test.js`.** Everything above is
  renderable from what they already return. If you believe you need a new field, stop and report
  rather than adding one.
- Do not touch `weeklyStats.js`, `sessionCategory.js`, `cartridgeSessionPayload.js`, anything under
  `db/` or `sync/`, or the `Calendar.jsx` header title (already settled).
- No new dependencies, no chart library, existing tokens only.
- Never `new Date('YYYY-MM-DD')` — string/UTC helpers only.
- Explanatory text must stay honest: describe what a metric *is*, never editorialise about whether
  the user's numbers are good or bad. No praise, no nudging, no fabricated encouragement.

## Verification

1. `npm test` in `app/` — 960 baseline must still pass.
2. `npm run build` in `app/` — succeeds.
3. On-device portrait: every coloured cell responds to tap; the legend is readable at real width;
   the two count lines are clearly different scopes; the period control obviously governs only the
   two panels below it; a single-session day reads "1 session" not "1 sessions".
