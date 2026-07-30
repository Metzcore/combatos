# Combat OS — A11 Today Exercise Reference Layer

_Approved implementation scope: 2026-07-30. This task adds the already-proven A11 exercise
reference capability to the active Today workout surface. It is a bounded functional/UI slice,
not the forthcoming Today visual redesign._

## 0. Worker, authority, and required reading

**Implementation worker:** Claude Code using Sonnet 5 in a fresh chat.

Before editing, read these files completely:

- `AGENTS.md`
- `.agents/skills/combatos-conventions/SKILL.md`
- `.agents/skills/mobile-interaction-ux/SKILL.md`
- `.agents/skills/pwa-offline-first/SKILL.md`
- `docs/planning/roadmap/ROADMAP.md` — read the A11 entry, not the whole roadmap history
- `app/src/data/exerciseCatalogue.js`
- `app/src/components/ExerciseReferenceLink.jsx`
- `app/src/components/ExerciseReferenceLink.test.jsx`
- `app/src/components/today/TodayBlock.jsx`
- `app/src/components/today/PerformedHoldItem.jsx`
- `app/src/components/today/PerformedStrengthItem.jsx`
- `app/src/components/today/PerformedConditioningItem.jsx`
- `app/src/components/today/SupersetGroup.jsx`
- the relevant existing `.exercise-ref*`, `.today-item*`, and `.superset-group*` rules in
  `app/src/index.css`; do not read or rewrite the stylesheet wholesale

The architecture in this prompt is already approved. Do not restart broad repository,
database, or UX exploration. If current code materially contradicts this packet, stop and
report the contradiction before editing.

## 1. Mission and stop condition

Add a compact, accessible, fail-safe external video affordance to each eligible exercise on the
active Today workout screen.

The implementation must:

- resolve the URL from the existing bundled exercise catalogue;
- use the cartridge item's optional canonical `exerciseId`;
- render for prescribed exercises with a usable curated video;
- render nothing for missing, unknown, or malformed references;
- hide the prescribed exercise's video whenever that item has been substituted;
- work across mobility, strength, core, conditioning, and cooldown render paths, including
  strength/core items rendered inside a superset;
- preserve all existing Today workout behavior;
- remain visually compact and neutral so a later Kimi task can redesign the full Today surface.

Run verification, write the handoff report, and stop. Do not stage or commit.

## 2. Binding data and offline architecture

### 2.1 Use the existing bundled catalogue

The only approved resolution path is:

```text
cartridge item.exerciseId
  → bundled app/src/data/exerciseCatalogue.json
  → shared fail-safe resolver
  → first usable curated video resource
  → external anchor rendered in Today
```

Do not query Supabase, Dexie, an API, or the network to decide whether the affordance should
render. Catalogue metadata is already bundled with the JavaScript application and remains
available offline. The external provider loads only after the user's explicit tap; no preview,
thumbnail, iframe, fetch, prefetch, or connectivity probe belongs in this task.

The catalogue, its seven curated entries, and the ten authored cartridge `exerciseId` fields are
approved product data. Do not change or expand them here.

### 2.2 One shared URL-selection rule

Plan/Library currently resolve an entry and defensively select its first usable resource inside
`ExerciseReferenceLink.jsx`. Today must not create a second, subtly different interpretation.

Prefer extracting a small pure shared resolver in `app/src/data/exerciseCatalogue.js`, with a
clear name such as `getPrimaryExerciseVideoReference(exerciseId)`, which:

- builds on the existing `getExerciseReference(exerciseId)`;
- returns a compact usable reference object or `null`;
- accepts only a non-empty exercise name and a first resource containing non-empty `url` and
  `provider` strings;
- may also preserve the resource's `label` and `type` where useful;
- performs no network work and throws on no missing/malformed input.

Keep `getExerciseReference()` and its existing public behavior intact. Refactor the existing
Plan/Library `ExerciseReferenceLink` to consume the shared resolver without changing its
rendered wording, markup contract, styling, accessibility, or fail-safe behavior.

If a different implementation preserves one shared selection rule more cleanly, explain it in
the report. Do not duplicate URL-selection logic across the two components.

## 3. Binding substitution safety rule

Today substitutions currently store only a free-text performed exercise name keyed by
prescription-slot `item.id`. They do not carry a canonical replacement `exerciseId`.

Therefore:

- prescribed item + usable `item.exerciseId` + no substitution → show the video affordance;
- prescribed item with absent/unknown/malformed reference → show nothing;
- any truthy `substitutedName` → hide the prescribed item's video affordance completely;
- reverting the substitution → allow the prescribed video to reappear automatically;
- never match the free-text replacement name against catalogue names;
- never fuzzy-match, normalize, infer, or invent a replacement `exerciseId`;
- never fall back to the original prescribed video while visually showing a substitute.

This rule is safety-critical: a plausible-looking but incorrect demonstration is worse than no
demonstration.

Do not change the substitution data model, `ChangeExerciseSheet`, Dexie, session drafts, logged
payloads, or history records.

## 4. Today presentation contract

Create a Today-specific presentational component rather than reusing the full Plan/Library
`WATCH DEMO` row. A reasonable location is:

`app/src/components/today/TodayExerciseReferenceLink.jsx`

Its API should remain narrow—for example:

```jsx
<TodayExerciseReferenceLink
  exerciseId={item.exerciseId}
  substitutedName={substitutedName}
/>
```

The exact internal naming may differ, but it must not receive or mutate workout state.

### 4.1 Required interaction behavior

- Render a semantic `<a>`, not a button with scripted navigation.
- Use `target="_blank"` and `rel="noopener noreferrer"`.
- Its accessible name must identify the exercise and provider and state that it opens an
  external site.
- Decorative glyphs must be hidden from assistive technology.
- It must have a real or expanded minimum 48 × 48 CSS-pixel touch target.
- Do not rely on hover to reveal its purpose.
- Do not make the whole exercise name or card clickable.
- Do not add a BottomSheet, modal, confirmation step, tooltip, toast, or local component state.
- Do not reserve an empty row or gap when the component returns `null`.

### 4.2 Compact visual direction

Today is substantially denser than Plan. Use a compact, explicitly understandable micro-control
in the exercise identity/header area—such as a restrained play glyph plus `DEMO` and an external
indicator—rather than copying Plan's wide pill and separate publisher row.

Keep the visual treatment:

- congruent with the accepted dark tactical Plan/Library language;
- readable in a three-second mid-workout glance;
- clearly interactive without becoming a large shaped button;
- subordinate to the exercise name and set-entry controls;
- static and performant, using ordinary CSS only;
- resilient to long exercise names and narrow portrait widths;
- free of looping animation, blur-heavy effects, or layout overlap.

Provider information must remain available to assistive technology through the anchor's
accessible name. It does not need a separate visible publisher label in Today if that harms
density.

This is not permission to restyle exercise cards, set units, actions, progress, tabs, Finish, or
the Today page. The later Kimi experiment owns that larger visual work.

## 5. Renderer coverage

Wire the compact affordance into the existing shared item renderers:

- `PerformedHoldItem` for mobility/cooldown;
- `StrengthItemHeader` for strength/core;
- `PerformedConditioningItem` for conditioning.

Using `StrengthItemHeader` is important because both standalone strength items and
`SupersetGroup` members already render through it. Do not add a second superset-only link path or
render the link once per set/round.

Each exercise should display at most one video affordance, regardless of:

- prescribed set count;
- extra sets;
- PAP/pair rows;
- superset round interleaving;
- history or “Use last values” availability.

The generic capability should work for any block kind carrying `exerciseId`. Current curated
production annotations happen to cover strength/core exercises only. Do not curate warm-up,
mobility, conditioning, cooldown, PAP, or pair references in this task.

## 6. Functional invariants

Preserve all existing behavior and DOM contracts not strictly required for the compact link:

- set kg/reps/RPE/RIR editing and focus behavior;
- add-set and remove-extra-set behavior;
- populated-extra-set confirmation;
- pair/PAP inputs;
- true superset round order and member labels;
- “Use last values” safety rules;
- exercise substitution and revert;
- focused note editor behavior;
- block expand/collapse state;
- session activity tags;
- local draft persistence and autosave;
- Finish flow, completeness, and logging;
- the accepted Today clipping correction;
- Plan/Library video-link behavior and accepted visual polish.

Do not reinterpret or touch `%1RM`/e1RM logic.

## 7. Allowed files

Claude may create or edit only:

- `app/src/data/exerciseCatalogue.js`
- `app/src/components/ExerciseReferenceLink.jsx`
- `app/src/components/ExerciseReferenceLink.test.jsx`
- `app/src/components/today/TodayExerciseReferenceLink.jsx` (new)
- `app/src/components/today/TodayExerciseReferenceLink.test.jsx` (new)
- `app/src/components/today/PerformedHoldItem.jsx`
- `app/src/components/today/PerformedStrengthItem.jsx`
- `app/src/components/today/PerformedConditioningItem.jsx`
- `app/src/index.css`
- `archive/agents-answers-for-review/sonnet-a11-today-reference-layer.md`

If integration coverage genuinely requires one focused new test file for the existing Today
renderers, stop and name the proposed path and reason before creating it. Do not expand into
`TodayBlock.jsx` or `SupersetGroup.jsx` unless a verified structural blocker makes the shared
header path impossible; if so, stop and report rather than silently broadening scope.

## 8. Explicitly forbidden

Do not touch:

- canonical or bundled catalogue JSON;
- any canonical or bundled cartridge JSON;
- `ProgramOverview.jsx` or other Plan/Library layout markup;
- `TodayBlock.jsx`, `CartridgeToday.jsx`, `SupersetGroup.jsx`, `ChangeExerciseSheet.jsx`,
  `FocusedNoteEditor.jsx`, `BottomSheet.jsx`, or navigation;
- set-state, completeness, last-performance, session-draft, or substitution utilities;
- `cartridgeSessionPayload.js`, `cartridgeLogInput.js`, payload schemas, logging, sync, or history;
- Supabase code, live Supabase, migrations, RLS, authentication, or environment variables;
- Dexie schemas, stores, migrations, or persistence ownership;
- the webhook/Google Sheets contract or `scripts/webhook.gs`;
- `%1RM`/e1RM math, `playbook.csv`, or generated `app/src/data/playbook.js`;
- PWA configuration, service workers, Workbox, manifest, install/update behavior, or assets;
- dependencies, package files, lockfiles, build configuration, or test configuration;
- the broader Today visual redesign or new gamification/progress features;
- `ROADMAP.md`, `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md`, or `ICEBOX.md`;
- `.env.local`, the intentional `app/.env.example` deletion, `.gitignore`, or `.claude/`;
- Git staging, commits, pushes, merges, branches, or PRs;
- subagents, AgentSwarm, or delegated workers.

If the task seems to require a forbidden file, database/schema decision, or persistence change,
stop and report the evidence. Do not work around the boundary.

## 9. Required tests

At minimum, pin:

1. known prescribed `exerciseId` renders exactly one compact external anchor;
2. absent, empty, and unknown IDs render nothing;
3. malformed catalogue entry/resource renders nothing without throwing;
4. truthy `substitutedName` hides an otherwise valid prescribed reference;
5. absent/empty substitution permits the prescribed reference;
6. rendered `href`, `target`, and `rel` are correct;
7. accessible naming includes exercise, provider, and external-site meaning;
8. decorative glyphs are hidden from assistive technology;
9. no iframe, video, image/thumbnail, fetch, or embedded media is introduced;
10. the existing Plan/Library link output and fail-safe cases remain unchanged;
11. each renderer integration places at most one affordance per exercise header, including the
    shared strength header used by supersets.

Follow the repository's existing `renderToStaticMarkup` test convention; do not add a testing
dependency merely for this slice.

Run from the repository root:

```text
npm.cmd --prefix app test
npm.cmd --prefix app run build
git diff --check
git status --short
```

If the platform shell uses `npm` rather than `npm.cmd`, use the equivalent command and record it
accurately.

## 10. Preflight and repository hygiene

Before editing, record:

```text
git branch --show-current
git log -1 --oneline
git status --short
```

Known pre-existing out-of-scope state may include:

```text
 M .gitignore
 D app/.env.example
?? .claude/
?? docs/planning/rebuild/PILOT-COACHING-DATA-ARCHITECTURE-DIAGNOSTIC.md
?? docs/planning/rebuild/PILOT-ONBOARDING-PACK-DRAFT.md
?? docs/planning/rebuild/PILOT-ONBOARDING-PACK-GROK-PLAN.md
```

Treat the live preflight as authority. Preserve all unrelated state exactly. Do not restore,
delete, stage, inspect, or include `.env.local` or any environment secret.

Before stopping, inspect the complete task diff and confirm:

- only allowed files changed;
- no catalogue/cartridge content changed;
- no persistence, payload, database, webhook, PWA, or workout-math file changed;
- Plan/Library output remains behaviorally unchanged;
- nothing is staged or committed.

## 11. Handoff report

Write:

`archive/agents-answers-for-review/sonnet-a11-today-reference-layer.md`

Include:

1. preflight branch, HEAD, and status;
2. exact files changed;
3. final shared resolution contract;
4. substitution safety behavior;
5. compact affordance placement and accessibility contract;
6. coverage across block kinds and supersets;
7. proof protected areas remained untouched;
8. test, build, and `git diff --check` results;
9. final `git status --short`;
10. any assumptions or remaining on-device acceptance checks.

Do not claim Android/iOS acceptance from browser tests. The developer will verify at minimum:

- narrow portrait layout with a long exercise name;
- prescribed referenced exercise;
- unreferenced exercise;
- substitute then revert;
- multiple set rows and an extra set;
- last exercise in an expanded block;
- external navigation and return to the installed PWA.

Then stop with exactly:

`READY FOR CODEX REVIEW — NOTHING STAGED OR COMMITTED`
