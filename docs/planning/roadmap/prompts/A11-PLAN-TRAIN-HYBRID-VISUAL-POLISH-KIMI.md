# Kimi K3 High — A11 Plan / TRAIN hybrid visual polish implementation

## Authority and operating mode

You are the sole implementation worker for one narrowly bounded, frontend-only Combat OS visual
polish slice. The diagnostic and visual exploration have already been completed and approved by
the developer. Implement the approved hybrid direction, verify it, write a handoff report, then
stop.

You have creative latitude **inside the visual and file boundaries below**. That latitude does
not extend to functionality, data, persistence, backend systems, navigation structure, or
unapproved application areas.

Do not stage, commit, push, merge, deploy, delete, or rename files.

## Binding baseline

- Repository/worktree:
  `C:\Users\jmfg9\Documents\Fitness\Fight-Camp-kimi-trial`
- Expected branch: `codex/kimi-trial-1`
- Expected HEAD:
  `ad8a8cc feat(plan): add exercise demonstration links`

Before editing:

1. Read `AGENTS.md` in full.
2. Read `.agents/skills/combatos-conventions/SKILL.md` in full.
3. Read `.agents/skills/mobile-interaction-ux/SKILL.md` in full.
4. Read `docs/engineering/AI-WORKFLOW.md`, especially the one-writer and evidence rules.
5. Confirm the branch and exact HEAD.
6. Run `git status --short` and record the pre-existing state.
7. Confirm the four-file A11 Watch Demo commit is present.

Expected unrelated state may include:

- modified `.gitignore`;
- intentional deleted `app/.env.example`;
- untracked `.claude/`;
- untracked `docs/planning/rebuild/` documents;
- untracked visual-planning prompt documents;
- ignored files under `archive/`.

Preserve all of it. Do not stage it, clean it, restore it, delete it, or absorb it into this task.
Never read, print, modify, copy, rename, or delete `.env.local` or any environment file.

If the branch or HEAD does not match, the A11 UI commit is absent, or the permitted application
files contain unexpected pre-existing changes, stop and ask the developer before editing.

## Objective

Implement a small, production-realistic hybrid between Claude's:

- **Direction 1 — Strata:** raised day slab, recessed block wells, stronger exercise hierarchy;
- **Direction 2 — Signal Spine:** a full-height semantic colour rail that makes each training
  block easy to identify and visually follow.

Do not reproduce either mockup literally. Use them as visual evidence, then improve the real
application with your own frontend judgment while respecting the approved direction and the
existing design language.

The outcome should feel more premium, modern, tactile, and intentional without becoming flashy,
fantastical, heavily animated, or structurally redesigned.

## Read-first evidence

Read only the files needed for this frontend slice:

### Current implementation

- `app/src/components/TrainHub.jsx`
- `app/src/components/TopTabs.jsx`
- `app/src/components/PlanViewer.jsx`
- `app/src/components/ProgramOverview.jsx`
- `app/src/components/ExerciseReferenceLink.jsx`
- the relevant current sections of `app/src/index.css`:
  - root design tokens;
  - `.library-*`;
  - `.cartridge-day*`;
  - `.cartridge-block*`;
  - `.cartridge-item*`;
  - `.exercise-ref*`;
  - `.top-tabs*`;
  - `.hub-tabs-bar`;
  - the later `.today-active .cartridge-block` override, to prove Today will not regress.

### Visual evidence

- Current-state screenshot:
  `archive/Snippets-for-review/plan-item-long-name-current.png`
- Codex visual proposal:
  `archive/design-explorations/plan-train-minimal-polish-mockup-2026-07-30.png`
- Claude Strata:
  - `archive/design-explorations/claude-a11-plan-train/direction-1.png`
  - `archive/design-explorations/claude-a11-plan-train/direction-1.html`
- Claude Signal Spine:
  - `archive/design-explorations/claude-a11-plan-train/direction-2.png`
  - `archive/design-explorations/claude-a11-plan-train/direction-2.html`
- Claude analysis:
  `archive/agents-answers-for-review/claude-a11-plan-train-visual-direction.md`

The standalone Claude HTML files are design references only. Never import or copy them wholesale
into the application.

Do not explore databases, Supabase, authentication, Dexie, payloads, webhooks, generated program
data, service workers, or unrelated screens. This task has no backend requirement.

## Approved hybrid — binding outcomes

### 1. Raised day slab

An expanded Plan/Library day card should read as a containing slab above the canvas:

- restrained static surface variation or gradient;
- softened edge;
- a narrow top/rim reflection;
- one subtle ambient shadow;
- no heavy neumorphism or bright glow.

The card must remain recognisably the existing collapsible day component. Preserve its geometry,
toggle behavior, summary pill, chevron, title wrapping, and 48px minimum target.

### 2. Recessed block wells

Warm-up, strength, core, conditioning, and cooldown blocks should read as content wells recessed
inside the day slab:

- visually darker or quieter than the day surface;
- restrained inset depth;
- still visibly contained as sections;
- exercise items remain flat content rows within the well.

Do **not** adopt Direction 2's borderless blocks wholesale. The developer wants Direction 1's
contained depth combined with Direction 2's rail.

### 3. Full-height semantic section spine

Each read-only Plan/Library training block gets a full-height narrow colour spine spanning the
block, not merely the existing short marker beside the block label.

The spine communicates **block type and section continuity**, not interactive open state:

- mobility/warm-up uses its existing semantic family;
- strength/core uses tactical amber;
- conditioning/cooldown retain their existing semantic distinction;
- do not make every block amber;
- do not add a spine to unscoped application surfaces.

Plan's inner blocks are not independently collapsible. Do not introduce block open/closed state
or imply that tapping the spine changes anything.

### 4. Exercise hierarchy

Exercise names should become the clearest, strongest text inside each block:

- modest type-scale/weight refinement is allowed;
- long names must wrap naturally and remain fully visible;
- metadata stays quieter but must meet accessible normal-text contrast;
- cues remain supportive rather than competing with names;
- amber may be used strategically for high-value prescription information when achievable
  without brittle selectors or unnecessary markup.

Do not truncate names, reduce readable line height, or create a desktop-oriented multi-column
layout that fails at narrow portrait widths.

### 5. Watch Demo treatment

Retain the accepted component and interaction contract:

- real external `<a>`;
- fixed visible `WATCH DEMO` wording;
- minimum 48 × 48 CSS-pixel target;
- separate visible publisher attribution;
- provider announced only once to assistive technology;
- no row at all for absent, unknown, or malformed references;
- no media, thumbnails, embeds, runtime fetches, or new state.

Visually refine it so it feels integrated, premium, and clearly tappable. You may improve the
surface, border, static reflection, typography, glyph emphasis, focus-visible state, and pressed
feedback. Keep it self-width; do not turn it into a full-width action.

### 6. Overall TRAIN tab refinement

You may make a restrained improvement to the Train-specific Today / Plan / Library top-tab rail:

- preserve three equal slots, labels, selection behavior, and at least 48px targets;
- keep the active state immediately legible;
- preserve safe-area behavior;
- do not alter shared Checklist, Timer, or Log tab styling accidentally;
- do not alter the five-slot bottom navigation.

Add one Train-specific class hook in `TrainHub.jsx` if required for safe scoping. Do not invent a
new navigation component or structure.

### 7. Creative latitude

Within the rules above, use your own judgment to improve:

- colour balance;
- static lighting and reflection;
- border softness;
- typography emphasis;
- small spacing relationships;
- divider treatment;
- cohesion between Plan header, top tabs, day card, block wells, and Watch Demo.

The visual references are not pixel specifications. If a reference choice looks worse in the
real DOM, replace it with a better small-pass solution and explain why in the report.

Use existing design tokens and token-derived `color-mix()` values. Do not rewrite global root
tokens for the whole application and do not introduce an unrelated palette of fresh hex values.

## Scoping contract

### Permitted application files

1. `app/src/index.css`
2. `app/src/components/TrainHub.jsx` — only for an additive Train-specific presentation class
3. `app/src/components/ProgramOverview.jsx` — only if an additive presentational class hook is
   genuinely necessary
4. One directly related existing test file only if a permitted JSX class hook requires its
   expectation to change

Prefer CSS-only work plus the single Train-specific hook. Do not modify JSX simply to make the
mockup easier to copy.

### Permitted report

Write:

`archive/agents-answers-for-review/kimi-a11-plan-train-hybrid-visual-polish.md`

### Forbidden

Do not modify:

- `ExerciseReferenceLink.jsx` or its behavior/tests;
- catalogue or cartridge JSON and their mirrors;
- validators, registries, assignment/access logic, or plan state;
- Today workout components or functionality;
- BottomNav;
- global navigation state;
- Dexie, Supabase, authentication, schemas, migrations, payloads, webhooks, Google Sheets, n8n;
- PWA configuration, manifest, service worker behavior, dependencies, or lockfiles;
- global root design-token values;
- `ROADMAP.md`, `STATUS.md`, handoff/decision logs, `ICEBOX.md`, or other planning files;
- environment files;
- unrelated worktree state.

If your proposed visual solution requires any forbidden file or a change outside the permitted
files, stop and ask rather than expanding scope.

## Performance and interaction limits

- No looping or decorative animation.
- No `backdrop-filter`.
- No blur-heavy filter effects.
- No WebGL, canvas, background video, large images, or external assets.
- No new dependency.
- Keep shadows static, restrained, and bounded.
- Do not increase vertical density materially or add new visible rows.
- Preserve smooth scrolling on mid-range Android and iOS devices.
- Preserve focus-visible accessibility.
- Do not add hover-only information.

## Shared-surface safety

`ProgramOverview` is shared by Plan and Library preview. A coherent visual result on both is
desirable.

Today reuses some `.cartridge-*` classes but has later scoped `.today-active` rules and different
interaction requirements. Inspect selector reach and specificity before editing. The Today
workout surface must remain visually and functionally unchanged in this slice.

The Train top-tab component is also shared elsewhere. Any top-tab refinement must be scoped to
Train so Checklist/Timer/Log do not change.

## Implementation method

1. Complete preflight and read-first evidence.
2. State a concise internal implementation intent and exact selectors/files you expect to touch.
3. Implement the smallest coherent hybrid.
4. Re-read the final diff for selector leakage, specificity conflicts, and accidental global
   changes.
5. Verify every forbidden area remains untouched.
6. Run the required verification.
7. Write the handoff report.
8. Stop with nothing staged or committed.

Do not pause for routine stylistic choices inside the approved hybrid. Ask only if a required
change would cross a file/scope boundary or materially alter functionality.

## Required verification

Run and report exact results:

1. `npm.cmd --prefix app test`
2. `npm.cmd --prefix app run build`
3. `git diff --check`
4. `git status --short`
5. Inspect the final changed-file list and confirm it is within the permitted set.
6. Confirm no dependency, lockfile, PWA, backend, data, environment, or Today component changed.

No localhost screenshot is required. The developer will perform authenticated visual acceptance
after Codex reviews the diff.

## Handoff report requirements

The report must include:

1. preflight branch/HEAD/status;
2. exact files and selectors changed;
3. explanation of how Strata and Signal Spine were combined;
4. design decisions where you intentionally improved or rejected a mockup detail;
5. scoping proof for Plan, Library preview, Today, and shared top tabs;
6. accessibility and contrast notes, including any measured relevant ratios;
7. performance rationale;
8. exact test/build/diff-check results;
9. complete remaining Android/iOS acceptance checklist;
10. up to five larger visual/product opportunities you noticed.

The larger opportunities are **report-only ICEBOX candidates**. Do not implement them and do not
edit `ICEBOX.md`.

End the report and final response with:

`READY FOR CODEX REVIEW — NOTHING STAGED OR COMMITTED`
