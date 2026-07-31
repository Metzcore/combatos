# Log Hub Experience Plan (supersedes W26)

_Written 2026-07-31 by Sonnet (architect role for this session), from a live conversation with the
developer. Supersedes `docs/planning/roadmap/prompts/W26-log-hub-research.md` as the operative plan
— that brief was written 2026-07-19 and never run; this document reflects everything that changed
since (Supabase live, A7 payload schema frozen, Kimi validated as a frontend builder, a separate
onboarding/dashboard site now in progress) plus rulings made directly with the developer this
session.

_Revised the same day by Opus 5 after a verification pass against the code — four claims in the
first draft were wrong or unverified (see §8). The developer then dropped the weekly target and
deferred off-programme logging, and the Codex contrarian review was cancelled: this plan goes
straight to Kimi, so §8's open questions became corrections rather than review inputs._

Status: **plan approved by the developer; Stage 1 (pure utilities) not yet built.** The executable
worker prompt is `docs/planning/roadmap/prompts/W26-LOG-HUB-OVERVIEW-KIMI.md`._

## 1. Purpose (why this exists, not just what it shows)

The Log hub's job is **honest, low-friction self-monitoring with a fast feedback loop on "did I do
what I said I'd do."** This is not a design preference — self-monitoring paired with honest,
non-punitive feedback is one of the most consistently evidenced behavior-change techniques in the
adherence literature, well ahead of gamification or badges. Two constraints fall out of that:

- **Absence is data, not failure.** An empty week/day is shown honestly, never dressed up or guilt-
  framed (already a house rule — `.agents/skills/personal-analytics-viz/SKILL.md`). Punitive tracking
  measurably increases dropout.
- **Deep, cross-metric analytics is explicitly NOT this surface's job.** The developer is building a
  separate onboarding/dashboard site for that. The Log hub stays glanceable and mid-workout-honest —
  this materially bounds scope, on purpose.

## 2. Scope

**In scope:** rebuild the Log hub's two top tabs (`Log` / `Stats` in `utils/navState.js`
`HUB_TOP_TABS.log`) around two distinct jobs instead of two overlapping ones.

**Explicitly out of scope, ruled with the developer this session:**
- **Checklist/Notes data does not feed this surface, in either direction.** Checklist is a general-
  purpose personal tool different users will use for different things (habit tracking, task
  management, whatever) — folding it into a fitness-specific adherence view assumes everyone uses it
  the way the developer does, which won't hold once other users are on it. This also fully sidesteps
  D13 (Checklist/Notes owner-scoping, still open, still real, just irrelevant to this work) and the
  two-day-axis reconciliation problem the original W26 brief flagged as its hardest open question —
  neither applies once Checklist is out.
- **No new session/webhook schema.** Nothing here touches `AGENTS.md` rule 2. Everything below reads
  the existing frozen `sessions` shape (`docs/reference/session-payload-schema.md`, v2) as-is.
- **No chart library.** Every visual below is buildable with the existing plain-DOM/CSS primitives
  already in the codebase (badges, dots, bars, grids) — consistent with the standing house rule. If a
  future idea genuinely needs one, that's a separate, explicit decision — not smuggled in here.

## 3. D9 (off-programme activity logging) — resolved, no new build required

The original D9 entry (`OPEN-DECISIONS.md`) worried that real activity outside the programme "looks
like rest in the Log, skewing the picture," and proposed routing it through a Checklist counted task.
**That proposal is void now that Checklist is out of scope** — and turns out to be unnecessary anyway.

Checked directly against the code: `CartridgeToday.jsx` already lets the athlete pick ANY day
template on ANY date (D10, `DaySelectSheet`, line ~537 "Choose a different day"), and a `custom` day
already prompts free-text content + duration + activity chips + an explicit category choice via
`CategorySheet` (`fixedCategoryForDayType` returns `null` for `custom` specifically so the user
picks). So a gym session, a class, or a spar outside the suggested order is already loggable today.

**Correction to the first draft:** it claimed `sessionBucket()` classifies every custom-day result
into the `other` bucket. That is false. `PICKER_CATEGORIES` is
`['strength-conditioning', 'combat', 'custom']`, and `BUCKET_BY_CATEGORY` maps only `custom → other`
— pick "combat" on a custom day and it buckets as `combat`, identical to a programme session.

That turns out to be the *right* behaviour, so nothing needs building: an off-programme combat
session genuinely **is** a combat session, and colouring it differently would be the dishonest
choice. D9's actual concern was "real training renders as rest," which is satisfied by the session
being logged at all, under whatever category the athlete chose.

**Ruling: D9 is functionally solved by the existing custom-day mechanism.** The one true remaining
gap is activity matching *no* day template at all (e.g. went bouldering). That is narrow, and
closing it means a change to the logging path — the riskiest area in this plan, adjacent to the
frozen payload contract. **Deferred** until the rebuilt Overview shows whether it actually bites.
Update `OPEN-DECISIONS.md` D9 to record this once the plan lands; do not mark it fully ruled while
the bouldering-class gap is still open.

## 4. IA: two tabs, two different jobs

| Tab | Job | Cognitive task |
|---|---|---|
| **History** (was Log) | The detail record — exact sets, duration, your own notes | Recall: "what exactly did I do on this day" |
| **Overview** (was Stats) | Pattern recognition across time, visual-first | Consistency: "am I actually training regularly" |

A redundant third view repeating "this week: N sessions" in a card would duplicate what the top of
History already shows at a glance — that's why Overview leans fully visual instead of restating the
same counts in different chrome.

### 4.1 History tab — minimal change

`Calendar.jsx`'s list view stays almost as-is; it already correctly separates cartridge vs legacy
rows and shows the right badge/completeness/duration/notes per row. Two changes:

1. **De-emphasize the legacy `Phase N • Day M` line** for old rows — permanent historical furniture
   now, never a live concept. Styling only, no functional change.
2. **Fix a live date bug** found during the verification pass. `Calendar.jsx` line ~55 formats the
   row date with `new Date(dateStr).toLocaleDateString(...)`, where `dateStr` is a `YYYY-MM-DD`
   string. That parses as **UTC midnight** and renders in **local time**, so every row displays one
   day early for any user west of UTC. Invisible to the developer (UTC+1); wrong for a US client on
   the coaching side. `WeeklyStats.jsx`'s `formatShort` already avoids this by string-splitting, and
   `personal-analytics-viz` explicitly bans the pattern — this row is simply the one place that
   slipped through. Fix it with the existing string-based approach.

### 4.2 Overview tab — full rebuild, three visual pieces

All three read `db.sessions` only (calendar-date axis) — never Checklist/Notes.

**(a) Monthly calendar heatmap.** A grid of the selected month's days, each cell colored by
`sessionBucket()` result: `sc` → green, `combat` → red, `other` → amber (custom/off-programme days —
this is where D9's fix actually lands), `rest`/`recovery` → dim, no session → empty/transparent. Per
the app's existing "status reads as color + badge, not sentences" convention (and to avoid a
color-only encoding nobody flagged for accessibility until now — worth being deliberate about it),
each cell also carries a 1-letter glyph (S/C/O/R) so the pattern reads without relying on color
alone, same principle as the existing hip-score dots carrying both color and number.

Two cases the first draft missed, both real rather than hypothetical: a date with **more than one
session** (already present in the developer's data) resolves to a priority bucket plus a count
marker, and a **future date** in the current month renders neutral — never as a missed day. Details
in §5.

Month prev/next navigation only — no other filtering. Sub-line beneath: session count and category
split for the visible month (reuses `sessionBucket` counts, not a new aggregation).

**(b) Weekly completeness trend strip.** A row of small bars, one per week, height = that week's
`avgCompletenessCartridge` — small multiples turned sideways into a scannable strip instead of
`WeeklyStats.jsx`'s stacked cards. **This needs no new aggregation function** — `buildWeeklyStats()`
already returns `avgCompletenessCartridge` per week; this is a new renderer over existing data, not
new math. Legacy/cartridge completeness stay un-blended, same as today (never violate that rule).
Period toggle: this month / last 3 months (maps to `weeks` param already on `buildWeeklyStats`).

**(c) Activity-coverage breakdown.** "Warm-up: 4/5 · Cooldown: 3/5 · Bag work: 5/5 · …" for the
selected period, built from `sessionActivities` — a field the A7 payload schema added specifically
for this (`session-payload-schema.md` §8), never yet aggregated anywhere. Follow §8's rules exactly:
denominator = sessions whose category is a workout category (`sc`/`combat`/`other`); the key being
**absent** (legacy or pre-`sessionActivities` rows) means *unknown*, excluded from both numerator and
denominator; `[]` counts toward the denominator only; a non-empty array counts toward both. This is
the one genuinely new signal in this plan — warm-up/cooldown neglect is currently invisible, and
making it visible (not shamed) is a real, targeted nudge.

### 4.3 Personal weekly target — DROPPED (developer ruling, 2026-07-31)

The first draft proposed an optional user-set weekly target in Settings. **Cut before implementation.**

The reasoning that killed it: the evidence base for *self-monitoring* is strong, but the evidence for
vague distal goals ("about six a week") is much weaker than for specific proximal ones — so a target
number here buys little. Meanwhile the heatmap already delivers the same behavioural function through
visual continuity, without creating a number to fail against. It would have cost a Settings surface, a
new settings key, and plumbing for marginal gain.

For the record, had it been built it could only ever have been a **user-declared** number, never a
cartridge-derived one: D10 ruled cartridges are a flexible pool with a suggested order, not a fixed
rotation, so no authored "train N times per week" exists anywhere in the schema to read. Revisit only
if the developer actually misses it in use.

## 5. Data layer (new pure utilities — written first, own PR, no React/Dexie imports, unit-tested)

Mirrors the existing split (`weeklyStats.js` pure math / `WeeklyStats.jsx` thin renderer). Proposed
new file `app/src/utils/logOverview.js`:

**`buildMonthHeatmap(sessions, { year, month, todayStr })`** →
`{ year, month, weeks: [[cell|null × 7], …], counts: { sc, combat, other, rest, recovery, total } }`
where `cell = { date, bucket, sessionCount, isFuture, isToday }`.

- Monday-first ISO grid, matching the existing `mondayOfWeek` convention; adjacent-month padding
  slots are `null`.
- `bucket` comes from `sessionBucket()`. **Multi-session days are real** (two sessions on one date
  already exist in the developer's data), so a date with several sessions resolves to the
  highest-priority bucket: `sc` > `combat` > `other` > `recovery` > `rest`, with `sessionCount`
  carrying the true number.
- `sessionCount > 0` with `bucket: null` (an unrecognized category) stays `null` — never guessed into
  a bucket. The renderer shows it as "something logged," honestly.
- `isFuture` exists so an unreached day is never drawn as a missed one. An empty *past* day and an
  empty *future* day are different facts.
- `dateMath.js` UTC helpers for all boundaries — never local-time `Date` parsing.

**`buildActivityCoverage(sessions, { sinceDateStr, untilDateStr })`** →
`{ eligible, unknown, activities: [{ id, count, pct }] }`, all nine IDs in frozen
`SESSION_ACTIVITIES` order, following schema §8's three-state rule exactly (key absent → *unknown*,
excluded from both sides; `[]` → denominator only; non-empty → both). `pct` is `null` when
`eligible === 0` — never `0`.

Worth stating so nobody "fixes" it later: legacy rows carry no `sessionActivities` key at all, so
§8's absent-means-unknown rule already excludes them from both sides of every ratio. The known
legacy-vocabulary gap in `isWorkoutCategory()` (`sessionCategory.js`, flagged there as out of scope
for A7a) therefore has **no consequence here** — widening it to accept legacy categories would
silently corrupt the denominator.

Unit tests must include an absent-key legacy fixture, an empty-array fixture, and a
`payloadVersion: 1` fixture (§10 tolerance) alongside normal v2 rows.

**`utils/sessionActivityLabels.js`** — a shared, exported activity vocabulary. Today the labels live
as unexported local consts (`PREPARATION`, `ACTIVITY_CHIPS`) inside
`app/src/components/today/SessionSummary.jsx`; concatenated they happen to match `SESSION_ACTIVITIES`
order exactly. Extract them so the Overview cannot drift into a second, subtly-different vocabulary,
and have `SessionSummary.jsx` import from the new module. Pure rename/move — no behaviour change,
and it keeps the two-group (Preparation / Activities) rendering the summary sheet already does.

**Weekly completeness trend needs no new function** — it is a new consumer of `buildWeeklyStats()`'s
existing `avgCompletenessCartridge` output, which already accepts a `weeks` count.

## 6. Component work (Kimi, after the data layer above is merged and tested)

Full detail is in the worker prompt (`prompts/W26-LOG-HUB-OVERVIEW-KIMI.md`); summary:

- `overview/MonthHeatmap.jsx` — renders `buildMonthHeatmap()` output, month prev/next nav, count
  sub-line. Colour **and** glyph per cell (see §4.2a).
- `overview/CompletenessTrend.jsx` — renders `buildWeeklyStats()` output as a horizontal bar row,
  with `null` weeks drawn as explicit gaps rather than zero-height bars.
- `overview/ActivityCoverage.jsx` — renders `buildActivityCoverage()` output as label/count rows,
  plus the `unknown` footnote.
- `overview/Overview.jsx` — composes the three, owns the shared 8/26-week period control (which
  drives the trend and coverage panels; the heatmap keeps its own month navigation, since a monthly
  grid and a multi-week trend are different time units).
- `Calendar.jsx` — swap the `WeeklyStats` mount for `Overview`, apply the two History-tab changes
  from §4.1. Pass down the session array already in local state — no second Dexie read.
- `utils/navState.js` — **`label` strings only** (`Log` → `History`, `Stats` → `Overview`). The
  `log`/`stats` keys are matched literally in `Calendar.jsx` and validated by `setHubTab`; renaming
  them buys nothing and risks a silent fallthrough. (An earlier worry that the selection was
  persisted turned out to be wrong — it is `AppShell` `useState`, reset on reload by design — but
  the keys still stay.)
- Retire `WeeklyStats.jsx` only once nothing imports it. **`utils/weeklyStats.js` stays** — its pure
  `buildWeeklyStats()` feeds §4.2b.

Guardrails for Kimi: reuse `BottomSheet`/`TopTabs`/existing tokens only; no new dependencies and no
chart library; never `new Date('YYYY-MM-DD')`; do not modify the Stage-1 utilities or any frozen
module — if a utility looks wrong, stop and report rather than patching around it; verify on the
developer's Android device in portrait before calling it done (`mobile-interaction-ux`, "Verify
where it's used").

## 7. Build order (two PRs, diagnostic-first per AGENTS.md rule 6)

The first draft put this in one PR, which violates rule 6 ("one surgical change per session/PR") and
mixes pure math with UI in a single review. Split:

1. **Stage 1 — data layer** (coordinator): `utils/logOverview.js` + tests,
   `utils/sessionActivityLabels.js` extraction, `OPEN-DECISIONS.md` D9 update, and the
   `ROADMAP.md` / `decision_log.md` truth-up recording that this document supersedes
   `prompts/W26-log-hub-research.md`. No UI change. Aggregation bugs are silent — they render as
   plausible numbers and survive visual review — which is why this half does not go to the frontend
   builder.
2. **Stage 2 — UI** (Kimi, from `prompts/W26-LOG-HUB-OVERVIEW-KIMI.md`, after Stage 1 merges): the
   four components, `Calendar.jsx` / `navState.js` wiring, and the two History-tab changes. Android
   acceptance required before merge.

Stage 3 (off-programme logging, §3) is deferred and only revisited if Stage 2 shows a real gap.

## 8. Corrections made to the first draft (verification pass, 2026-07-31)

Recorded because this plan goes straight to a builder with no contrarian review in between — the
first draft asserted several things that turned out not to hold against the code.

| # | First draft said | Verified reality |
|---|---|---|
| 1 | Off-programme sessions bucket as `other`, so the heatmap can distinguish them | False. `PICKER_CATEGORIES` includes `combat` and `strength-conditioning`; only `custom` maps to `other`. Resolved by *not* distinguishing them — see §3 |
| 2 | (not mentioned) | `Calendar.jsx` has a live UTC-parsing date bug displaying every row one day early west of UTC — §4.1 |
| 3 | (not mentioned) | Activity labels are unexported consts in `SessionSummary.jsx`; the Overview would have silently forked the vocabulary — §5 |
| 4 | (not mentioned) | Multi-session days already exist in real data; the heatmap needs an explicit priority + count rule — §5 |
| 5 | Weekly target as an optional Settings field | Dropped by the developer — §4.3 |
| 6 | One implementation PR | Split into two stages; rule 6 — §7 |
| 7 | Tab-key rename might break persisted state | Overstated. Layer-2 selection is `AppShell` `useState`, not persisted. Keys stay anyway, for a different reason — §6 |

Two open questions from the first draft survive as **things to check on-device during Stage 2**,
rather than as review inputs: whether the letter-glyph-plus-colour cell encoding is legible at real
phone cell size, and whether a period with zero eligible workouts needs distinct empty-state copy
from a zero-of-N period. Both are answered by looking at a phone, not by reasoning.

One invariant carried forward from the first draft, now written into the worker prompt as a
stop-and-report condition: `buildMonthHeatmap`'s bucket for a session must never visually contradict
`categoryBadge()`'s badge for that same session on the History tab.
