# Claude Opus 5 — Plan / TRAIN visual mockup exploration

> **Historical/superseded prompt.** Claude correctly stopped at the raster-capability gate in its
> environment. Do not rerun this prompt there. The completed replacement workflow is
> `A11-PLAN-TRAIN-VISUAL-DIRECTION-CLAUDE.md`, which authorizes isolated HTML/CSS renders.

## Role

Act as a senior mobile product designer and frontend architect reviewing Combat OS, a
portrait-first installed PWA used on Android and iOS.

This is a **visual exploration only**. Do not implement anything.

## Capability gate — do this before reading the codebase

First determine whether your current environment can natively generate or edit a raster
mockup image and save the resulting image file.

- If it can, continue.
- If it cannot, stop and say so plainly.
- Do **not** compensate by writing HTML, CSS, React, SVG, canvas code, or a prototype.
- Do **not** launch a development server or use Playwright/browser screenshots to manufacture
  an image.
- Do **not** change any repository file except saving the final mockup under the permitted
  output folder named below.

The requested deliverable is an image, not code.

## Mission

Compare the current Combat OS Plan screen with Codex's first visual-polish mockup. Infer what
Codex was trying to accomplish, challenge it, and produce one improved mockup that could become
the visual direction for the real app.

The developer wants a premium, modern, purposeful experience with convincing material depth,
controlled lighting, excellent hierarchy, and a strong desire to keep using the product. It
should feel sophisticated rather than decorative. Avoid both the current visually uniform
treatment and an over-designed fantasy interface.

Treat Codex's mockup as a proposal, not a style guide. You may reinterpret the colour balance,
surface treatment, accents, typography emphasis, spacing, and visual hierarchy. Do not merely
polish Codex's choices or produce a close variant. Bring your own design judgment and try to
beat it.

Do not assume a particular named aesthetic, fixed palette, automotive reference, science-fiction
reference, or preselected combination of colours. Derive the visual answer from the product,
the current UI, the constraints, and your own analysis.

## Evidence to inspect

Read only what is necessary:

1. `AGENTS.md`
2. `.agents/skills/mobile-interaction-ux/SKILL.md`
3. `.agents/skills/combatos-conventions/SKILL.md`
4. Current-state screenshot:
   `archive/Snippets-for-review/plan-item-long-name-current.png`
5. Codex proposal:
   `archive/design-explorations/plan-train-minimal-polish-mockup-2026-07-30.png`
6. Current Plan structure:
   `app/src/components/PlanViewer.jsx`
   `app/src/components/ProgramOverview.jsx`
   `app/src/components/ExerciseReferenceLink.jsx`
   `app/src/components/TrainHub.jsx`
   `app/src/components/TopTabs.jsx`
7. Relevant styling only:
   - design tokens near the top of `app/src/index.css`
   - `.library-*`
   - `.cartridge-day*`
   - `.cartridge-block*`
   - `.cartridge-item*`
   - `.exercise-ref*`
   - `.top-tabs*`
   - `.hub-tabs-bar`

Do not explore databases, Supabase, persistence, payloads, webhook code, generated program data,
or unrelated application screens.

### Screenshot caveat

The current-state screenshot predates the visible Watch Demo control. The source files above are
authoritative for its current geometry:

- a compact, self-width link with a minimum 48 × 48 CSS-pixel target;
- a separate, visible publisher caption on the right of the same row;
- the entire row is absent when an exercise has no curated reference.

The component supports mobility/warm-up, cooldown, strength, core, and conditioning items. The
current warm-up routine is not yet annotated with an `exerciseId`, so it currently has no visible
Watch Demo row. Do not mistake this data absence for a UI limitation.

## Buildability contract

The mockup must be credibly achievable as a small, targeted frontend pass on the current app.
Design with the real DOM and component boundaries in mind.

Preserve:

- the Today / Plan / Library top-tab structure;
- the existing Plan information architecture and content order;
- collapsible day cards and exercise blocks;
- readable long exercise names without truncation;
- the Watch Demo link and separate publisher attribution;
- exercises without links rendering without an empty row;
- five-slot bottom navigation;
- portrait safe areas and at least 48px interactive targets;
- strong contrast and glanceability on a phone.

The proposed appearance should be implementable primarily with ordinary, performant CSS and,
at most, tiny presentational class additions. It must not depend on:

- a new component architecture or navigation system;
- WebGL, canvas, video backgrounds, or continuous animation;
- large image assets, external UI libraries, or new runtime dependencies;
- blur-heavy or GPU-expensive effects;
- hover-only behavior;
- changes to application data, schemas, authentication, persistence, PWA behavior, or workout
  functionality.

Static depth, lighting, borders, shadows, gradients, restrained reflections, and small spacing or
typographic adjustments are all feasible—but they are possibilities, not a prescribed style.

If an idea would require a larger structural change, omit it from this mockup.

## Image requirements

Produce one high-fidelity portrait mobile app mockup:

- show Train → Plan with Day 1 expanded;
- retain enough real content to demonstrate a warm-up block, a strength block, long exercise
  names, metadata, cues, two referenced exercises, and one exercise without a reference;
- show `WATCH DEMO` for 45° Leg Press with `PureGym`;
- show `WATCH DEMO` for Single-Leg Glute Machine (kickback) with `Live Lean TV`;
- show no reference row for Single-Leg RDL (DB, light);
- keep publisher text visually separate from the interactive link;
- include the top tabs and bottom navigation so the proposal can be judged as part of TRAIN;
- do not place the UI inside a decorative phone frame;
- do not add marketing copy, annotations, comparison labels, or watermarks.

Preserve real app wording wherever it remains visible. Text legibility matters more than showing
the entire day.

## Output

Save the image non-destructively as:

`archive/design-explorations/plan-train-claude-mockup-v1.png`

Do not overwrite either input image.

Your final response should contain only:

1. confirmation that the mockup image was created;
2. its exact path;
3. one sentence naming any visual idea that would require more than the permitted small
   implementation pass, if such an idea appears in the mockup.

Do not provide implementation code or modify the application.

End with:

`MOCKUP COMPLETE — NO APPLICATION FILES CHANGED`
