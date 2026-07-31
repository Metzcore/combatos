# Claude Opus 5 — Plan / TRAIN visual directions and standalone mockups

## Role

Act as the independent senior mobile product designer and frontend architect for Combat OS.
You are responsible for the design reasoning **and for producing your own visual mockups**.

This is an isolated visual exploration. Do not modify application code.

## Mission

Compare:

1. the current Combat OS Train → Plan interface; and
2. Codex's first visual-polish mockup.

Explain what Codex was trying to achieve, identify where its proposal succeeds or remains too
close to the current design, then develop a stronger visual direction of your own.

The developer wants a premium, modern, purposeful experience with convincing material depth,
controlled lighting, excellent hierarchy, and a strong desire to keep using the product. It
must avoid both a visually uniform/flat treatment and an over-designed fantasy interface.

Codex's mockup is evidence, not a style guide. Do not default to its palette, accents, surface
treatment, or aesthetic references. You have permission to reinterpret the colour balance,
typography emphasis, borders, surfaces, lighting, spacing, and visual hierarchy. The point of
this exercise is to generate genuinely new design thinking, not another variant of Codex's
answer.

Do not begin with a named style, fixed palette, automotive reference, science-fiction reference,
or predefined combination of colours. Derive your recommendation from the product, its use
context, the current UI, and your own judgment.

## Evidence to inspect

Read only what is necessary:

1. `AGENTS.md`
2. `.agents/skills/mobile-interaction-ux/SKILL.md`
3. `.agents/skills/combatos-conventions/SKILL.md`
4. Current-state screenshot:
   `archive/Snippets-for-review/plan-item-long-name-current.png`
5. Codex proposal:
   `archive/design-explorations/plan-train-minimal-polish-mockup-2026-07-30.png`
6. Current Plan/TRAIN presentation:
   - `app/src/components/PlanViewer.jsx`
   - `app/src/components/ProgramOverview.jsx`
   - `app/src/components/ExerciseReferenceLink.jsx`
   - `app/src/components/TrainHub.jsx`
   - `app/src/components/TopTabs.jsx`
7. Relevant styling only:
   - design tokens near the top of `app/src/index.css`
   - `.library-*`
   - `.cartridge-day*`
   - `.cartridge-block*`
   - `.cartridge-item*`
   - `.exercise-ref*`
   - `.top-tabs*`
   - `.hub-tabs-bar`

Do not inspect databases, Supabase, persistence, payloads, webhook code, generated program data,
or unrelated screens.

### Current-state caveat

The current-state screenshot predates the visible Watch Demo control. The source is authoritative
for its current geometry:

- compact, self-width link with a minimum 48 × 48 CSS-pixel target;
- separate visible publisher attribution on the right of the same row;
- no empty row when an item has no reference.

The component supports mobility/warm-up, cooldown, strength, core, and conditioning items. The
current generic warm-up routine has not yet been assigned an `exerciseId`, so it currently hides
the link. That is a data-annotation state, not a UI limitation.

## Product and feasibility constraints

The selected direction must be realistically implementable as a small, targeted frontend pass
on the present application.

Preserve:

- Today / Plan / Library top tabs;
- the Plan information architecture and content order;
- collapsible day cards and exercise blocks;
- readable long names without truncation;
- Watch Demo plus separate publisher attribution;
- absence of the entire reference row for unreferenced items;
- five-slot bottom navigation;
- portrait safe areas;
- at least 48px interactive targets;
- strong phone contrast and glanceability.

The direction should be achievable mostly through ordinary performant CSS and, at most, tiny
presentational class additions. It must not rely on:

- new component architecture or navigation;
- WebGL, canvas, video backgrounds, or continuous animation;
- large image assets, external UI libraries, or new runtime dependencies;
- blur-heavy or GPU-expensive effects;
- hover-only interaction;
- changes to application data, schemas, authentication, persistence, PWA behaviour, or workout
  functionality.

These constraints define implementation reality, not the visual answer. Within them, explore
freely.

## Required analysis

### 1. Current-state diagnosis

Briefly identify:

- what already works visually;
- what creates the flat or overly uniform impression;
- which hierarchy, density, contrast, or material cues could improve;
- any accessibility or Android/iOS concern visible in the evidence.

Ground important claims in the screenshot or exact selectors/tokens.

### 2. Reverse-engineer Codex's proposal

Explain the intent behind Codex's mockup:

- what visual problems it attempted to solve;
- which choices are effective;
- which choices feel generic, too conservative, too decorative, or too close to the existing
  interface;
- anything that appears difficult or risky to reproduce faithfully in the real app.

Do not defer to Codex. Challenge the proposal where appropriate.

### 3. Independent directions

Develop **three genuinely distinct visual directions** that satisfy the same product goal and
feasibility contract.

For each direction provide:

- its core visual idea in plain language;
- how it treats the canvas, navigation, day card, block surfaces, exercise hierarchy, metadata,
  cues, Watch Demo control, and publisher attribution;
- why it suits Combat OS;
- the likely implementation cost and mobile-performance risk;
- what makes it meaningfully different from both the current UI and Codex's mockup.

Do not constrain all three directions to one palette family or one material treatment.

### 4. Select a winner

Choose the strongest direction. Reconcile any useful element from the other two only when doing
so produces one coherent system rather than a collage.

State:

- why it wins;
- what should remain unchanged from the real app;
- what the rendered mockups must emphasize;
- what the rendered mockups must avoid;
- which details are visual concept only versus safely implementable in the small pass.

### 5. Produce three visual mockups

Create one high-fidelity portrait mockup for each of the three directions.

You are explicitly permitted to create standalone HTML/CSS presentation files and render them
to PNG with an already-available browser or Playwright installation. This exception exists only
for the isolated design exploration. It does **not** authorize edits to the real app.

Each mockup must:

- identify the current screenshot as the structural reference;
- identify Codex's mockup as comparison evidence, not mandatory style;
- show Train → Plan with Day 1 expanded;
- retain enough real content to show warm-up, strength, long names, metadata, cues, two referenced
  exercises, and one unreferenced exercise;
- show `WATCH DEMO` for 45° Leg Press with separate publisher `PureGym`;
- show `WATCH DEMO` for Single-Leg Glute Machine (kickback) with separate publisher
  `Live Lean TV`;
- show no reference row for Single-Leg RDL (DB, light);
- include the top tabs and five-slot bottom navigation;
- preserve realistic portrait density and real wording;
- avoid a decorative phone frame, marketing annotations, and watermarks;
- visibly satisfy the feasibility contract above;
- be rendered at one consistent portrait viewport so the three directions can be compared fairly.

Use the real layout and component boundaries as a feasibility guide, but recreate only the
minimum static markup needed for the design images. Do not import or modify application
components.

The standalone mockup files themselves are useful implementation references, so keep them tidy
and understandable. They are not production code and must never be imported into the app.

### 6. Rendering isolation and tooling rules

All mockup source and image files must remain inside:

`archive/design-explorations/claude-a11-plan-train/`

You may:

- create standalone HTML and CSS within that folder;
- use an already-installed local browser or Playwright solely to render those standalone files;
- start a temporary local server scoped to that folder if file-based rendering is insufficient;
- save portrait PNG screenshots in that folder.

You must:

- use no network resources;
- use no externally hosted fonts, icons, images, scripts, or styles;
- install no package or dependency;
- avoid reading or printing environment files;
- terminate any temporary server you start;
- leave all real application, configuration, test, data, and dependency files untouched.

If an already-installed rendering tool is unavailable, still complete the written diagnostic and
report the exact tooling limitation. Do not install anything.

### 7. Final comparison

After rendering, compare the three actual images rather than judging only the written concepts.
Select the winner and state:

- which image won and why;
- whether the rendered result exposed any feasibility, density, contrast, or hierarchy problem
  not obvious during planning;
- which parts could be implemented in the small pass;
- which visible detail, if any, should be removed because it would exceed the small-pass boundary.

## Output

Write the complete diagnostic, direction specifications, and final comparison to:

`archive/agents-answers-for-review/claude-a11-plan-train-visual-direction.md`

Save the three mockups as:

- `archive/design-explorations/claude-a11-plan-train/direction-1.png`
- `archive/design-explorations/claude-a11-plan-train/direction-2.png`
- `archive/design-explorations/claude-a11-plan-train/direction-3.png`

Keep any standalone rendering source in that same folder.

Do not modify either reference image, any application file, or any planning/continuity file.

Your final response should contain:

1. the report path;
2. all three image paths;
3. the name of the winning direction;
4. a maximum five-line summary;
5. confirmation that no application files changed and that any temporary renderer was stopped.

End with:

`READY FOR CODEX/DESIGNER REVIEW — NO APPLICATION FILES CHANGED`
