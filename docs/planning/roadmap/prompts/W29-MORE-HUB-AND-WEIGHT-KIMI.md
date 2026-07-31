# Kimi K3 High — W29/W30 More hub + weight surfaces visual pass

## Authority and operating mode

You are the sole implementation worker for one bounded Combat OS task: bring the **More hub** and
the **weight surfaces** into the app's accepted visual language, while preserving every behavior,
data path, navigation contract and honesty rule already shipped.

The developer has approved broad frontend judgment inside the sandbox below. This is not a request
to reproduce a screenshot pixel for pixel. Study the real interface, identify the strongest
coherent direction, and make it better using your own mobile UX and frontend judgment.

This authority does **not** extend to data layers, stored data, sync or network behavior,
authentication, database systems, navigation structure, pure utility modules, programme data,
dependencies, or PWA behavior.

Do not stage, commit, push, merge, deploy, delete, or rename files. Do not delegate to
Agent/AgentSwarm.

Design rationale and rulings live in `docs/planning/rebuild/MORE-HUB-EXPERIENCE-PLAN.md` — read it
first. This document is the executable half.

---

## 1. Binding baseline and preflight

Repository: `C:\Users\jmfg9\Documents\Fitness\Fight-Camp`, branch from current `main`
(`80383ab` or later).

Before touching anything, confirm the baseline:

```text
npm.cmd --prefix app test      →  58 files / 1145 tests passing
npm.cmd --prefix app run build →  succeeds
```

If the build fails with `EPERM ... dist`, delete `app/dist` and retry — a known Windows file lock,
not a code fault.

Binding skills in `.agents/skills/`: `combatos-conventions`, `mobile-interaction-ux`,
`personal-analytics-viz`, `pwa-offline-first`. Read `AGENTS.md` — those are hard rules.

---

## 2. Mission

The More hub was rebuilt structurally in PR #72 with content moved **as-is** from the old Settings
screen, and the weight surfaces were built for correctness in PR #79. Neither has had a visual
pass. Both are currently plain, functional, and visibly not part of the same app as Today, Timer,
Plan/Library and Log.

Bring them into the accepted language. The app's existing baselines, all developer-accepted:

- **"Execution Strata"** (Today) — closed blocks recede, the open block is the raised working
  stratum, full-height semantic spines preserve block identity.
- **"Instrument Strata"** (Timer) — raised token-mix slab, 1px rim reflection, one static ambient
  shadow, Signal Spine as a full-height 3px left rail.
- The A11 Plan/Train hybrid — raised day slab, recessed block wells.

The recipe is documented in `app/src/index.css` banner comments (see the `W15.1 — Timer hub:
Instrument Strata` block around line 1848). Tokens and `color-mix` only.

---

## 3. Binding visual evidence

- `archive/Snippets-for-review/trw-app-more-tab.jpeg` — the row idiom the More menu follows
  (icon · label · chevron). **The paradigm, not the styling.** Combat OS keeps its own identity.
- `archive/Snippets-for-review/` — current-state screenshots of other hubs for language reference.

---

## 4. Read-first application scope

Read before editing. These are the surfaces in scope:

1. `app/src/components/MoreHub.jsx` — the menu and the detail-screen frame
2. `app/src/components/more/ProfileScreen.jsx`
3. `app/src/components/more/SettingsScreen.jsx`
4. `app/src/components/more/IgnitionScreen.jsx` + `IgnitionImportSheet.jsx`
5. `app/src/components/more/BackupScreen.jsx`
6. `app/src/components/more/AgentScreen.jsx`
7. `app/src/components/more/AboutScreen.jsx`
8. `app/src/components/more/WeightCheckIn.jsx`
9. `app/src/components/overview/WeightTrend.jsx`
10. `app/src/components/WeightDueRail.jsx`
11. `app/src/index.css` — the `W29 — More hub` and `W30 — Weight check-in due rail` blocks

---

## 5. Confirmed diagnostic findings — do NOT "fix" these

Each of these is deliberate and was expensive to arrive at. Changing any of them is a regression.

1. **The More menu is a normal page, not a `BottomSheet`.** That primitive is modal (dimmed
   backdrop, 80vh cap, dismiss-on-tap-outside) and wrong for a primary hub. Reuse row styling, not
   the modal container.
2. **More does not use `TopTabs`.** Six labels do not fit a 360px portrait tab row, and the
   menu→screen relationship is hierarchical, not peer tabs.
3. **`useMoreBackNavigation` deliberately does NOT pop its history entry on unmount.** The
   reasoning is recorded in the hook. Leaving a detail via the bottom nav strands one entry, making
   one hardware-Back press a no-op — a bounded, accepted wart. **Do not re-add the cleanup.**
4. **`WeightDueRail` must remain `position: fixed`.** `.bottom-nav` is itself fixed, so an in-flow
   rail lays out at the end of the document — it previously rendered at y=864 in an 812px viewport,
   correctly in the DOM and entirely invisible. It is anchored via `--bottom-nav-height`.
5. **The weight panel is NOT governed by the 8/26-week control above it.** That control is
   labelled "Trend & coverage period" and drives exactly the two panels beneath it.
6. **`Overview.jsx` computes "today" from UTC rather than local.** This is a known bug tracked
   separately. Do not fix it here — it changes the window of two accepted panels.

---

## 6. Ethical design contract — the hard one

This surface carries body weight for a combat-sports athlete, a context adjacent to weight cutting.
The following are **ruled out by construction** and are not open to reinterpretation as a visual
idea:

- weight targets, goal lines, weight-class markers
- cut-rate calculators, projected weigh-ins, extrapolated trends
- threshold alerts, "on track" / "behind" labels, any verdict on a value
- logging streaks, scores, points, badges, celebration states

A streak in particular rewards entering *a* number, which actively incentivises a fake entry on a
day someone dislikes the real one.

**Colour carries no judgement.** Up and down share one neutral accent. A red "gain" is a verdict on
the athlete's body, which is not this surface's job.

**The due rail is information, never pressure.** One line, one action, one dismiss. No alarm
colour, no failure iconography, no overdue-day count, no celebration when satisfied. "Later" is a
seven-day snooze and its copy must keep saying so — an unexplained ✕ implies "never again".

**Gaps must never be drawn as measurements.** The trend reports breaks explicitly; a gap is a
missing observation, not a change in weight. Do not smooth, interpolate, zero-fill, or evenly space
points to make the line prettier.

---

## 7. Creative latitude — explicitly wide

Yours to decide:

- the material treatment of menu rows (slab, well, spine, divider weight, pressed feedback)
- iconography and whether icons stay emoji or become something more considered
- the drill-down transition, and the detail-screen header/Back treatment
- card rhythm, spacing and hierarchy inside all seven screens
- the visual form of the weight trend — line weight, point treatment, how a break reads, axis and
  label styling, the empty and single-entry states
- the due rail's material, provided it stays quiet and unjudging
- typography scale and emphasis within existing tokens

Do not pause for routine visual choices inside this authority. Stop only if the best solution
requires a forbidden file, a behavior change, new stored data, a dependency, or material scope
expansion.

---

## 8. Mobile, accessibility, performance, offline contract

- Portrait **360px** is the primary target; verify at 320px too. No horizontal overflow anywhere.
- Touch targets ≥44px. The due rail sits directly above the nav — a mis-tap there switches hubs.
- Preserve every `aria-label`, `role`, `aria-pressed`, `aria-current` and label association that
  exists today. `MoreHub`'s menu is `role="navigation"`, NOT a tablist. The weight SVG keeps its
  descriptive `aria-label`.
- Respect `prefers-reduced-motion`: any transition must degrade to a legible static state.
- No layout shift on load. No new fonts, no new assets, no network requests.
- Everything must work offline — this is an installed PWA used in a gym with no signal.

---

## 9. Product and technical invariants

Preserve exactly:

- every control that exists today, its behavior, and its copy semantics;
- More's menu → screen → Back navigation, including the pushed history entry per detail;
- the `initialScreen` deep-link entry point (the due rail's "Log it" opens Profile directly);
- sign-out's confirm and its disabled/busy states;
- the backup export's delivered-vs-cancelled distinction;
- the Agent screen's empty state, https-only validation, and password-type token field;
- weight entry: unit toggles are **presentation only and never write**; the input is seeded from
  canonical kg; only Save persists;
- per-entry sync state ("On this device" / "Synced" / "Sync needs attention") and delete;
- the due rail's snooze behavior and the "no entry is not overdue" rule.

No new database, schema, settings key, localStorage entry, event log, analytics, or network
behavior.

---

## 10. Explicitly forbidden

Do not modify:

- `app/src/db/**` — including `bodyWeight.js`, `backup.js`, `backupRedaction.js`, `index.jsx`
- `app/src/sync/**` — including `backupPush.js`, `bodyWeightSync.js`, `syncQueue.js`
- `app/src/auth/**`
- `app/src/utils/weightValue.js`, `weightTrend.js`, `weightDueState.js`, `logOverview.js`,
  `weeklyStats.js`, `dateMath.js`, `moreNav.js`, `navState.js`, `customIgnitions.js`,
  `backupSchedule.js`
- `app/src/hooks/useMoreBackNavigation.js`, `useWeightDue.js`, `useBackupPushScheduler.js`
- `AppShell.jsx`, `BottomNav.jsx`, `TopTabs.jsx`, `BottomSheet.jsx`, `App.jsx`, `Calendar.jsx`
- `MonthHeatmap.jsx`, `CompletenessTrend.jsx`, `ActivityCoverage.jsx` — accepted W26 surfaces
- `scripts/webhook.gs`, anything in `cartridges/`, `catalogue/`, `supabase/`
- `vite.config.js`, the manifest, service-worker config, PWA behavior
- `package.json`, lockfiles, test config
- root design-token VALUES in `:root` (you may add new scoped classes; do not redefine `--primary`
  et al.)
- ROADMAP, STATUS, handoff, decision log, OPEN-DECISIONS, or any planning document
- `.env*`, git state

**No new npm dependencies. No chart library** — the weight trend is plain SVG and must stay so.
**No new hex colours** — existing tokens and `color-mix` only.

If an idea needs a forbidden file, put it in the handoff as a report-only future candidate. Do not
implement it and do not work around the boundary.

---

## 11. Stop-and-report clause

If a utility returns something that looks wrong or missing — a value, a gap, a due state — **stop
and report it**. Do not patch the utility, do not work around it in the component, do not recompute
it inline. Silent disagreement between the math layer and the UI layer is the specific failure mode
this split exists to prevent, and it has already held twice under pressure in this codebase.

---

## 12. Required verification

Run:

```text
npm.cmd --prefix app test
npm.cmd --prefix app run build
git diff --check
git status --short
```

All 1145 tests must still pass — you are not expected to add tests, and you must not delete or
weaken any. Also:

- inspect the final changed-file list against §4 and §10, and prove no forbidden file changed;
- prove no root token VALUE changed;
- confirm no new dependency, asset, font, timer, persistence key, or network call;
- search every changed CSS selector and prove it cannot affect another hub;
- do not claim physical-device acceptance.

The developer will verify on device:

1. all seven More screens at 360px portrait and at 320px;
2. menu → detail → in-app Back, and Android hardware Back from a detail;
3. the due rail's "Log it" deep-link landing on Profile, and Back out of it;
4. weight entry in kg and in lb, unit toggling repeatedly, and that the stored value does not drift;
5. the weight trend with zero, one, several, and gapped entries;
6. per-entry sync state and delete;
7. backup export (share and download paths);
8. Agent screen empty state, invalid URL rejection, and Send now;
9. sign-out;
10. reduced-motion;
11. **iOS installed-PWA pass** — this app must work on both platforms;
12. no visible regression in Train, Timer, Log History, Log Overview's three existing panels, or
    Checklist.

---

## 13. Handoff report

Write to `dev_files/answers-from-agents-to-review/kimi-w29-w30-more-hub-weight-visual.md`:

1. the direction you chose and why, in a few sentences;
2. every file changed, with what changed in each;
3. the CSS strategy — new classes added, and proof of scope isolation;
4. how the menu row treatment relates to the accepted Strata language;
5. how a gap reads in the weight trend, and why that reading cannot be mistaken for a measurement;
6. how you kept the due rail unjudging;
7. accessibility: what you preserved and anything you improved;
8. reduced-motion behavior;
9. selector-scope proof for unrelated hubs;
10. exact full-test, build and diff-check results;
11. anything you found wrong that was OUT of scope — report it, do not fix it;
12. up to five larger ideas intentionally left as report-only ICEBOX candidates.

End the report and final response with:

`READY FOR CODEX REVIEW — NOTHING STAGED OR COMMITTED`
