# Kimi K3 High — A11 Today premium UX/UI experiment

## Authority and operating mode

You are the sole implementation worker for one deliberately creative but strictly frontend-only
Combat OS experiment: make the active **Train → Today** workout experience substantially more
attractive, motivating, legible, and premium while preserving every existing behavior.

The developer has approved broad visual judgment inside the frontend sandbox defined here. You do
not need to copy a mockup or ask permission for routine aesthetic decisions. Study the real
application and improve it with your own frontend/UX judgment.

This creative authority does **not** extend to workout logic, state ownership, persistence,
database systems, authentication, logging, payloads, webhooks, programme data, navigation
structure, dependencies, or PWA behavior.

Do not stage, commit, push, merge, deploy, delete, or rename files.

## 1. Binding baseline and preflight

Repository/worktree:

`C:\Users\jmfg9\Documents\Fitness\Fight-Camp-kimi-trial`

Expected branch:

`codex/kimi-trial-1`

The accepted A11 Today exercise-reference commit must be present:

`f104028 feat(today): add exercise demonstration links`

HEAD may be a later documentation-only commit containing this prompt and A11 status updates. Before
editing, prove that `f104028` is an ancestor and that no application changes exist after it unless
they are part of an explicitly documented baseline commit.

Read completely:

1. `AGENTS.md`
2. `.agents/skills/combatos-conventions/SKILL.md`
3. `.agents/skills/mobile-interaction-ux/SKILL.md`
4. `.agents/skills/pwa-offline-first/SKILL.md`
5. `docs/engineering/AI-WORKFLOW.md`
6. `docs/engineering/KIMI-CODE-OPERATING-GUIDE.md`
7. this prompt

Record:

```text
git branch --show-current
git log -5 --oneline
git status --short
git merge-base --is-ancestor f104028 HEAD
```

Expected unrelated state may include:

- modified `.gitignore`;
- intentional deleted `app/.env.example`;
- untracked `.claude/`;
- untracked `docs/planning/rebuild/` files;
- ignored reports or design assets under `archive/`.

Preserve all unrelated state exactly. Never read, print, modify, copy, rename, or delete
`.env.local` or any environment file.

If the branch is wrong, `f104028` is absent, protected files are already modified, or the Today
implementation differs materially from the evidence below, stop and report the conflict.

## 2. Mission

Redesign and polish the active Today workout surface so it feels:

- premium and intentional;
- modern tactical rather than generically “green”;
- subtly futuristic and instrument-like without becoming science fiction or a HUD parody;
- tactile through restrained light, reflection, depth, and material contrast;
- motivating through clarity, visible progress, confident next actions, and satisfying control
  feedback;
- visually congruent with the accepted Plan/Library **Strata + Signal Spine** direction;
- fast, calm, and readable during a real workout.

The developer should feel more inclined to begin, track, and complete the workout because the
interface reduces cognitive friction and makes progress feel tangible—not because it applies
manipulative reward mechanics.

This is a real application implementation, not a mockup. Improve the existing DOM where useful,
but keep the current information architecture, active-workout workflow, and mobile interaction
model recognisable.

## 3. Visual evidence and intent

Inspect these images:

### Binding current-state evidence

- Accepted Today baseline with the compact demonstration link:
  `archive/Snippets-for-review/▶ DEMO ↗.png`
- Earlier exercise-block baseline:
  `archive/Snippets-for-review/exercise-block-current.png`

### Accepted Plan/Library direction

- Claude Strata:
  `archive/design-explorations/claude-a11-plan-train/direction-1.png`
- Claude Signal Spine:
  `archive/design-explorations/claude-a11-plan-train/direction-2.png`
- Current long-name Plan evidence:
  `archive/Snippets-for-review/plan-item-long-name-current.png`

The Plan mockups are evidence of the visual language, not pixel specifications. Today has a
different job: it is an execution and data-entry surface used between sets, not a read-only
programme browser.

Preserve the best accepted ideas—layered dark materials, restrained reflections, purposeful
semantic accents, recessed content wells, strong type hierarchy, and section continuity—then
translate them into a more operational Today experience.

Do not reproduce the images literally and do not import their HTML/CSS harnesses.

## 4. Read-first application scope

Read only the source necessary for the active Today surface:

- `app/src/components/today/CartridgeToday.jsx`
- `app/src/components/today/TodayHeader.jsx`
- `app/src/components/today/TodayBlock.jsx`
- `app/src/components/today/PerformedHoldItem.jsx`
- `app/src/components/today/PerformedStrengthItem.jsx`
- `app/src/components/today/PerformedConditioningItem.jsx`
- `app/src/components/today/SupersetGroup.jsx`
- `app/src/components/today/PowerPairItem.jsx`
- `app/src/components/today/SessionSummary.jsx`
- `app/src/components/today/TodayExerciseReferenceLink.jsx`
- `app/src/components/today/ChangeExerciseSheet.jsx` — read-only interaction context
- `app/src/components/FocusedNoteEditor.jsx` — read-only interaction context
- `app/src/components/BottomSheet.jsx` — read-only shared primitive
- `app/src/components/CompletenessBar.jsx` — read-only shared primitive
- the existing tests for these components and their pure utilities

In `app/src/index.css`, inspect:

- root tokens, without editing their values;
- `.today-*`, `.today-active`, `.today-item*`, `.today-set-unit*`;
- `.superset-group*`, `.power-pair*`;
- `.cartridge-block*` and the accepted `.library-week` Plan scoping;
- `.exercise-ref*` and `.today-exercise-ref*`;
- `.today-safe-actions*`, `.btn-*`, `.card*`;
- relevant form, focus-visible, BottomSheet, and safe-area rules.

Do not explore Supabase, Dexie, authentication, payload/webhook code, programme-generation logic,
service workers, or unrelated tabs. The binding invariants below already define those boundaries.

## 5. Product and behavioral invariants

Every existing Today behavior must remain intact:

- active day and phase context;
- local draft autosave and accurate save-status wording;
- canonical `done/units` progress from the existing completeness logic;
- block open/closed behavior and existing default state;
- kg, reps, RPE, and RIR entry—including `inputMode`, constraints, labels, and focus behavior;
- conditional RPE/RIR rendering;
- added-set creation and safe extra-set removal;
- populated-extra-set confirmation;
- pair/PAP rows and values;
- true superset round ordering, member labels, mismatched-count handling, and Add Round;
- last-performance recall and “Use last values” safety;
- free-text exercise substitution and revert;
- the binding rule that a substituted exercise hides the prescribed exercise's DEMO link;
- per-exercise and session note editing;
- session preparation/activity selections, including Weights;
- custom-session content and duration behavior;
- Finish, validation, error, retry, reset, and discard flows;
- the fixed Finish bar, bottom navigation clearance, and safe-area behavior;
- session payload shape and all persistence behavior.

Do not remove, rename, disable, duplicate, or change the meaning of any functional control.
Presentational reordering is allowed only when the interaction remains unambiguous and callbacks,
props, input attributes, and state ownership remain identical.

## 6. Science-based motivation boundary

You may use established low-friction interaction principles:

- make session progress immediately legible;
- create a clear visual hierarchy from session → block → exercise → set → action;
- distinguish guidance from editable data;
- make the active/open block easy to follow spatially;
- make completed factual progress feel tangible using the existing canonical progress values;
- emphasize the next obvious action without hiding alternatives;
- provide restrained pressed/focus feedback;
- reduce visual noise and decision fatigue;
- keep status statements truthful.

Do not add:

- invented points, XP, levels, ranks, readiness, recovery, strain, or performance scores;
- streaks, badges, achievements, trophies, random rewards, confetti, or celebratory overlays;
- unsupported coaching claims or “AI” guidance;
- new completion formulas or per-set completion semantics;
- guilt, urgency, loss-aversion messaging, or manipulative dark patterns;
- audio, vibration, haptics, notifications, or timers;
- new stored state or analytics.

Motivation must come from excellent information design and interaction quality, not fabricated
metrics.

## 7. Creative latitude

Within the protected scope, you may substantially improve:

- Today header composition and progress presentation;
- the visual relationship between phase, day, focus, save state, and effort guide;
- active/open block identity and section continuity;
- card, block, exercise, and set-unit depth;
- typography, spacing, grouping, and scanning rhythm;
- input surfaces and their static/pressed/focus states;
- separation between prescription, coaching cue, history, and performed data;
- the prominence and clarity of Add Set, Change Exercise, Note, Use Last Values, and DEMO;
- superset and power-pair legibility;
- Session Summary presentation;
- the fixed Finish action's integration with the page;
- scoped colour balance, borders, token-derived lighting, shadows, and reflections.

You may add presentational wrappers, class hooks, pseudo-elements, and small presentational
components under `components/today/` when they materially improve clarity. Prefer restructuring
existing markup over creating a parallel component system.

Use your own judgment. Do not constrain yourself to the mockup palette or mimic a named product.
However:

- keep all styling scoped to Today;
- use existing tokens and token-derived `color-mix()` values;
- do not alter global root-token values;
- do not introduce a disconnected palette of hard-coded colours;
- preserve semantic meanings already attached to status colours.

## 8. Mobile, accessibility, and performance contract

Design for portrait phones first:

- primary workout controls need at least 48 × 48 CSS-pixel targets;
- long exercise names, long cues, history strings, and phase labels must wrap without overlap;
- no essential hover, long-press, or precision gesture;
- no horizontal page scrolling;
- numeric inputs must remain easy to select and edit with one thumb;
- fixed actions must respect existing bottom safe-area and navigation clearance;
- support narrow Android and modern iOS Safari layouts using ordinary standards-based CSS;
- retain semantic buttons, anchors, labels, `aria-*`, focus-visible, and external-link behavior;
- do not communicate state through colour alone.

Performance limits:

- no WebGL, canvas, SVG filter system, background video, or large new image assets;
- no `backdrop-filter` or blur-heavy filters;
- no looping, ambient, decorative, or scroll-driven animation;
- no new animation library;
- no new dependency;
- keep shadows static, restrained, and bounded;
- avoid large fixed translucent layers and excessive overdraw;
- use no runtime network request for presentation;
- keep offline app behavior unchanged.

Small direct-manipulation feedback such as `:active` or a short existing expansion transition is
allowed. Any newly introduced non-essential motion must be negligible and disabled under
`prefers-reduced-motion: reduce`; the simpler choice is usually no new motion.

## 9. Permitted application files

You may edit:

1. `app/src/index.css`
2. `app/src/components/today/CartridgeToday.jsx`
   - only active-workout presentational imports and the rendered JSX from the active-workout
     return;
   - do not modify hooks, effects, mutators, persistence wiring, log construction, or handlers.
3. `app/src/components/today/TodayHeader.jsx`
   - presentational markup and presentation derived from the existing `done`/`units`;
   - do not replace or reinterpret `itemCompleteness`.
4. `app/src/components/today/TodayBlock.jsx`
   - presentational wrappers/classes only;
   - preserve render routing, props, toggle behavior, and block-kind semantics.
5. `app/src/components/today/PerformedHoldItem.jsx`
6. `app/src/components/today/PerformedStrengthItem.jsx`
7. `app/src/components/today/PerformedConditioningItem.jsx`
8. `app/src/components/today/SupersetGroup.jsx`
   - rendered markup/classes only; pure grouping and round-order builders are frozen.
9. `app/src/components/today/PowerPairItem.jsx`
10. `app/src/components/today/SessionSummary.jsx`
11. `app/src/components/today/TodayExerciseReferenceLink.jsx`
12. directly corresponding existing Today test files;
13. at most two new focused presentation/component test files under
    `app/src/components/today/`, only if necessary;
14. at most two new purely presentational components under `app/src/components/today/`, only if
    they reduce complexity rather than creating a parallel system.

Do not edit `ChangeExerciseSheet.jsx`, `EffortGuideSheet.jsx`, `DaySelectSheet.jsx`,
`CategorySheet.jsx`, `FocusedNoteEditor.jsx`, `BottomSheet.jsx`, or `CompletenessBar.jsx`.
They are read-only context and must continue working through their existing call sites.

## 10. Explicitly forbidden

Do not modify:

- anything under `app/src/db/`;
- Dexie stores, versions, schemas, migrations, backups, or persistence ownership;
- Supabase code, live Supabase, authentication, RLS, tables, migrations, URLs, or credentials;
- `.env.local`, `.env.example`, or any environment file;
- workout-draft hooks or save-status utilities;
- session payload, cartridge log input, completeness, last-performance, extra-set, validation,
  numeric-coercion, or day-selection utilities;
- `%1RM`/e1RM calculation or display logic;
- webhook/sync code, `scripts/webhook.gs`, Google Sheets, or n8n;
- canonical/bundled cartridge or exercise-catalogue JSON;
- exercise catalogue resolvers or reference URLs;
- `playbook.csv`, generated `app/src/data/playbook.js`, or their pipeline;
- `TrainHub.jsx`, Plan, Library, Checklist, Timer, Log, Settings, shared TopTabs, or BottomNav;
- navigation state, routes, tab structure, or the five-slot bottom navigation;
- PWA configuration, Workbox, manifest, service workers, install/update behavior, or assets;
- dependencies, `package.json`, lockfiles, build config, or test config;
- global root design-token values;
- ROADMAP, STATUS, handoff, decision log, ICEBOX, or other planning documents;
- unrelated working-tree state;
- Git staging, commits, pushes, merges, branches, PRs, or deployment;
- Agent/AgentSwarm delegation.

If a desired idea needs a forbidden file, state it as a report-only future opportunity. Do not
implement it and do not work around the boundary.

## 11. Implementation discipline

1. Complete preflight and inspect the visual/source evidence.
2. Write a concise internal intent covering:
   - the Today experience hierarchy you intend to create;
   - exact permitted files/selectors expected to change;
   - how progress becomes more motivating without inventing metrics;
   - how the result remains congruent with Plan/Library without cloning it.
3. Implement one coherent design direction. Do not produce three themes or feature flags.
4. Preserve every handler, prop, input attribute, and state owner while modifying presentation.
5. Inspect the complete diff for accidental logic edits and selector leakage.
6. Confirm Plan/Library and every non-Today tab remain untouched.
7. Run verification.
8. Write the handoff report.
9. Stop with nothing staged or committed.

Do not pause for routine aesthetic choices inside this authority. Stop only if the best solution
requires a forbidden file, functional behavior change, new state/data, or material scope expansion.

## 12. Required verification

Run:

```text
npm.cmd --prefix app test
npm.cmd --prefix app run build
git diff --check
git status --short
```

Also:

- inspect the final changed-file list against §9;
- prove no protected file changed;
- confirm no global selector leaks into Plan/Library or other hubs;
- confirm all existing Today tests remain present and passing;
- add focused tests for material semantic/wiring changes, not for CSS appearance;
- do not claim physical-device acceptance.

The developer will verify on localhost/device:

1. narrow portrait layout and long exercise names;
2. all block kinds, collapsed and expanded;
3. DEMO present, absent, substituted, and restored;
4. several prescribed sets plus populated and blank extra-set removal;
5. kg/reps/RPE/RIR keyboard entry;
6. history and Use Last Values;
7. Change Exercise and Note sheets;
8. supersets and pair/PAP content where fixtures permit;
9. Session Summary, Weights chip, notes, and Other;
10. save-state/error/retry presentation;
11. Finish, validation errors, reset/discard, and bottom safe areas;
12. smooth scrolling and return from an external demonstration link.

## 13. Handoff report

Write:

`archive/agents-answers-for-review/kimi-a11-today-premium-ux-ui-experiment.md`

Include:

1. branch, HEAD, preflight, and proof `f104028` is present;
2. exact files and selectors changed;
3. the design concept and hierarchy;
4. how the result translates Strata + Signal Spine into an execution surface;
5. how progress/motivation was improved without fabricated metrics;
6. detailed preservation proof for every functional invariant;
7. accessibility and relevant contrast notes;
8. Android/iOS layout and performance rationale;
9. selector-scope proof for Plan/Library and unrelated hubs;
10. exact test/build/diff-check results;
11. complete device-acceptance checklist;
12. up to five larger ideas intentionally left as report-only ICEBOX candidates.

End the report and final response with:

`READY FOR CODEX REVIEW — NOTHING STAGED OR COMMITTED`
