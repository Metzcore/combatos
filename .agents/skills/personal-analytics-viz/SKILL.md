---
name: personal-analytics-viz
description: Judgment for stats and analytics surfaces in Combat OS — the W9 WeeklyStats pattern and the future Log→Stats expansion (checklist %, notes presence, W24 tracking counts). Read before building or changing anything that aggregates, counts, or visualizes the user's own training data. Small multiples over dashboards, trends over totals, honest handling of sparse n=1 data.
---

# Combat OS — Personal Analytics & Viz Judgment

This is one person's training data, not a product metrics dashboard. It is sparse (empty
weeks happen), partial (fight-gym days have no completeness), and honest rendering beats
impressive rendering every time — n=1 data lies easily when you smooth or zero-fill it.

---

## Honest sparse-data handling

- **Absence is data — render it, don't fake it.** An empty week gets its own card saying
  "0 sessions"; a metric with no eligible sessions shows an em dash, not 0%. Coercing
  missing to zero turns a rest week into a fake failure.
- Metrics keep their exclusions: average completeness is S&C-only (days 2/4/7 have no
  completeness to average); phase-unlock counting excludes days 2/4/7. A new metric must
  decide — and make visible — what it excludes, not silently average unlike things.
- No smoothing, projections, or streak-inflation. Show what happened.

## Small multiples over dashboards

- The shipped pattern (`WeeklyStats.jsx`) is the template: a column of uniform per-week
  cards — count badges, an S&C/Fight split, a progress bar, a hip-score dot trail, day
  1–7 coverage chips. Comparison happens by scanning down identical cards, not by
  reading one grand overview.
- Trends over totals: a row of dots in date order says more than a lifetime average.
  Prefer within-week and week-over-week shapes to all-time aggregates.
- **No chart library.** Plain DOM/CSS with the existing tokens has covered every need so
  far (dots, chips, bars). Adding a charting dependency is a product decision for the
  developer, not an implementation convenience.

## Semantic color consistency

The same metric means the same color everywhere: hip score is red ≤ 2 / amber = 3 /
green ≥ 4 in the HUD banner and in stats (`hipColor` in `WeeklyStats.jsx` deliberately
mirrors the HUD thresholds — if one changes, both change). New metrics reuse the
existing tokens (`--accent`, `--alert`, `--warn`, `--primary`) so color stays a
vocabulary, not decoration.

## Aggregation is pure, tested, and out of the components

- Math lives in `app/src/utils/` (`weeklyStats.js`, `dateMath.js`): no React, no Dexie
  imports, unit tests alongside. Components stay thin — `WeeklyStats.jsx` just maps over
  `buildWeeklyStats(sessions)` output. Follow that split for any new surface.
- **Date math:** session dates are `YYYY-MM-DD` strings. All arithmetic goes through the
  `dateMath.js` UTC helpers — never `new Date('YYYY-MM-DD')` local-time parsing, which
  drifts across timezones. Weeks are ISO, Monday-start.

## Two day-axes — never conflate them

1. **Calendar date** (`sessions.date`, weekly stats): what day a workout was logged.
2. **Logical day** (the checklist's configurable reset time, `utils/checklistDate.js`):
   THE definition of "today" for checklist/notes/habit features.

The planned Log→Stats expansion (checklist completion %, notes presence, W24 tracking
counts) joins on the **logical-day** axis; workout history stays on calendar dates. A
stat that mixes the two (e.g. counting a 1 a.m. journal entry into the wrong day) is
wrong even when the numbers look plausible — state which axis a new metric uses.
