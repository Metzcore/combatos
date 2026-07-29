# Combat OS — A7b Android Acceptance Remediation Plan

_Approved scope: 2026-07-29. This is a bounded corrective continuation of A7b, not A7c and not
an app-wide visual redesign._

## 0. Authority, base, and roadmap fit

This task closes concrete Android acceptance findings from the A7b interactive Today renderer.
It remains inside `ROADMAP.md` Track A / A7 / A7b:

- A7a's payload, validation, analytics, draft persistence, and reader compatibility remain
  complete and untouched.
- A7b's Today renderer is implemented and merged locally through `9780602` (PR #61 merge commit
  in the local history), but physical Android acceptance found the issues recorded below.
- A7c remains separate and later. This task does not adopt `FocusedNoteEditor` anywhere outside
  the already-existing cartridge Today surfaces.
- A future app-wide visual-system diagnostic may decide how much of the Training-mode language
  extends to Timer and how the quieter Log / Checklist / Settings surfaces relate to it. That is
  not decided or implemented here.

**Implementation worker:** Kimi Code, preferably `kimi-k2.7-code`.

**Human/Codex-owned work:** any database, Dexie, payload, Supabase, webhook, service-worker,
schema, authentication, sync, or other protected/architectural change. None is expected. If the
worker believes one is required, it must stop and report; it may not attempt that work.

## 1. Source evidence

The worker may use these two images as visual evidence:

- Current Android state:
  `archive/Snippets-for-review/A7b Android acceptance feedback snippets/main-issues-today-train-tab.jpeg`
- Approved directional reference:
  `archive/design-explorations/train-tab-near-future-mockup-2026-07-29.png`

The directional image is inspiration, not a literal specification. In particular, it accidentally
duplicates the phase context in both an eyebrow and a top-right pill. The implementation must render
the phase context exactly once.

The intended visual language is:

> A realistic near-future Training mode: an obsidian canvas, restrained emerald reflection,
> tactile dark surfaces, recessed input wells, amber deliberate actions, and minimal static
> holographic detail. It must remain a credible mobile workout interface, not a game HUD,
> spaceship cockpit, or separate product.

## 2. User-observed acceptance findings

### Finding A — phase / programme badge

The current `phaseBlock.label` is rendered by `TodayHeader.jsx` inside the shared
`.badge.badge-dim` pill. A long label such as “Phase 1 — Foundation (4 weeks)” forces the pill
around wrapped text and competes with the workout-day title.

### Finding B — extra sets cannot be removed

`CartridgeToday.jsx` can append an empty performed set through `onAddSet`, and the payload and
completeness logic already tolerate extra performed sets. There is no inverse UI action, so an
accidental extra set permanently clutters the active draft.

### Finding C — the note preview does not look interactive

`FocusedNoteEditor` works and preserves its controlled/autosaved state correctly. Its closed
preview is visually flat: “NOTE / Optional” does not clearly communicate that it opens a focused
editor.

### Finding D — Today is visually too wireframe-like

The screen relies on many thin borders over near-black surfaces. Cards, inputs, and secondary
buttons do not have enough material hierarchy or tactile depth. The desired correction is a
scoped Training-mode surface pass, not a new information architecture.

## 3. Binding product and interaction rulings

### 3.1 Phase context

- Render phase context once, above the workout-day title, left-aligned.
- Use a compact eyebrow treatment rather than a filled pill.
- Preserve the factual `phaseBlock.label` source. Presentation may shorten only redundant
  duration punctuation if that can be done without inventing programme facts; otherwise render
  the existing label faithfully in the new eyebrow.
- Do not add a second programme or phase label elsewhere.
- Day title remains the primary element; progress and local save status retain their meanings.

### 3.2 Removing extra sets

- Only an index at or beyond the item's authored/prescribed set count is removable.
- Prescribed sets must never display a Remove action and must never be removed by the mutator,
  even if a caller passes an invalid index.
- Remove the exact selected extra entry, preserving the order and values of all other entries.
- A blank extra set removes immediately.
- A populated extra set opens the existing `BottomSheet` primitive with explicit Cancel and
  Remove actions before any state is discarded.
- A value of numeric `0` counts as populated. Empty string, `null`, and `undefined` do not.
- Removal is valid for an ungrouped item or one member of a superset. Existing A7b behaviour
  already supports asymmetric extra work; removing one member's extra must not remove another
  member's set.
- Removal updates only the existing `itemStateById[itemId].sets` array and calls the existing
  immediate-draft tick convention after the accepted removal.
- Do not change completeness rules: completion remains capped at prescribed sets.
- Do not change the session payload shape or validator. The eventual payload simply reflects the
  remaining performed sets, as it already does.

### 3.3 Note affordance

- Preserve `FocusedNoteEditor`'s controlled state, synchronous `onChange`, visual-viewport
  handling, full-screen editor, and existing parent autosave path exactly.
- Improve only the compact preview:
  - clear leading note/edit icon;
  - label plus “Add a note” when empty;
  - existing first-line preview when populated;
  - trailing chevron or equivalent directional affordance;
  - minimum 44px touch target and visible pressed/focus state.
- Keep plain text. Add no editor package, debounce, database access, or second persistence writer.
- The improved preview may apply consistently to the existing Today item-note and session-note
  uses. It must not expand into Checklist or Notes; that remains A7c.

### 3.4 Training-mode visual treatment

The worker has bounded visual discretion inside the existing Today execution surface. It may
improve hierarchy and polish beyond the literal mockup, but it must preserve function, content
order, and interaction meaning.

Required direction:

- Keep the global Combat OS tokens and their semantics:
  - `--bg`, `--panel`, `--input`, `--header`, `--divider`;
  - `--primary` for the strongest green execution state;
  - `--accent` for tactical amber deliberate actions/special state;
  - `--text`, `--dim`, and `--label` for hierarchy.
- Do not edit `:root` token values and do not add fresh hard-coded hex colours.
- Scoped `color-mix()`, transparency, gradients, inset shadows, outer shadows, and pseudo-elements
  may derive from existing tokens.
- Use surface depth rather than outlining every rectangle:
  - Today exercise/set cards: subtly raised dark surfaces;
  - numeric inputs: recessed wells with restrained inner depth;
  - Add set: amber, tactile, and clearly actionable;
  - Change exercise: quieter secondary utility control;
  - Note: obviously interactive but subordinate to workout completion;
  - Finish: the strongest emerald action with restrained edge illumination and inner reflection.
- Static holographic detail is allowed only as subtle reflection, a partial edge/corner light, or
  faint low-contrast technical linework in empty surface space.
- No looping animations, scanning effects, moving gradients, pulsing glow, glassmorphism wash,
  dense HUD frames, fake telemetry, or decorative text.
- Maintain contrast and legibility at three-second-glance distance.
- Maintain every existing 44px minimum touch target.
- Maintain the current sticky Today header, `.today-safe-actions` geometry, content spacer,
  bottom-nav clearance, safe areas, focused-note modal layering, and keyboard behaviour.
- Do not redesign icons or bottom navigation in this task.

## 4. Implementation architecture

### 4.1 Pure removal helpers

Create one small pure helper module, suggested path:

`app/src/utils/extraSetState.js`

It should expose narrowly named functions equivalent to:

- `hasMeaningfulSetValue(entry)` — determines blank versus populated for confirmation;
- `removeExtraSetAtIndex(sets, prescribedSets, index)` — returns a non-mutating result and refuses
  prescribed/out-of-range removal.

The exact API may vary if a clearer pure design emerges, but the safety invariant must live in
testable code outside the UI event handler. Do not generalize this into a new workout-state system.

### 4.2 Existing state path only

In `CartridgeToday.jsx`, add a removal mutator beside `onAddSet`:

- update the targeted item's existing `sets` array through `setItemStateById`;
- use the pure helper to enforce the prescribed-set boundary;
- preserve all other fields on the item and all other item IDs;
- call `bumpImmediate()` only when an accepted removal changes state.

No new DBProvider field is required. Do not edit `app/src/db/index.jsx`.

Thread the callback through the existing component path:

`CartridgeToday` → `TodayBlock` → `PerformedStrengthItem` / `SupersetGroup` → `StrengthSetRow`.

`StrengthSetRow` already knows `index`, `prescribedSets`, and the current `entry`; it may own the
small confirmation-sheet open/closed presentation state. Reuse `BottomSheet.jsx` unchanged.

### 4.3 Presentation updates

- `TodayHeader.jsx`: replace the current generic badge placement with a Today-specific phase
  eyebrow class and a single title stack.
- `FocusedNoteEditor.jsx`: add the compact-preview affordance markup without changing the open
  editor or data behaviour.
- `PerformedStrengthItem.jsx`: expose Remove only on extra set units and provide the populated-set
  confirmation through `BottomSheet`.
- `index.css`: add or revise only Today/FocusedNote scoped selectors needed for the approved visual
  direction. Do not restyle shared `.card`, `.btn-*`, `.bottom-nav`, `.sheet`, or global tokens in a
  way that changes other hubs.

## 5. Allowed implementation files

Kimi may modify only:

- `app/src/components/today/CartridgeToday.jsx`
- `app/src/components/today/TodayBlock.jsx`
- `app/src/components/today/PerformedStrengthItem.jsx`
- `app/src/components/today/SupersetGroup.jsx`
- `app/src/components/today/TodayHeader.jsx`
- `app/src/components/FocusedNoteEditor.jsx`
- `app/src/index.css`
- `app/src/utils/extraSetState.js` (new, if used)
- `app/src/utils/extraSetState.test.js` (new, if used)
- `app/src/components/today/SupersetGroup.test.js`

Kimi may read, but must not modify:

- `AGENTS.md`
- `.agents/skills/combatos-conventions/SKILL.md`
- `.agents/skills/mobile-interaction-ux/SKILL.md`
- this plan
- `docs/engineering/KIMI-CODE-OPERATING-GUIDE.md`
- `app/src/components/BottomSheet.jsx`
- the two visual evidence files in §1
- `app/package.json`

If an implementation genuinely needs a file outside the allowed list, stop and ask before
editing it. Do not silently broaden the list.

## 6. Explicitly forbidden scope

No modification to:

- `app/src/db/index.jsx`, Dexie schemas, draft-controller persistence, or database versions;
- `app/src/utils/cartridgeSessionPayload.js`, payload builders/validators, completeness logic,
  analytics fields, or logging readers;
- Supabase code, migrations, Auth, RLS, assignments, or production data;
- `scripts/webhook.gs`, webhook envelopes, FightLog/Google Sheets layout, or sync logic;
- `%1RM` / e1RM math, `useHistory`, or any training-load calculation;
- `playbook.csv` or generated `app/src/data/playbook.js`;
- PWA/service-worker/manifest/update configuration;
- n8n;
- Timer, Log, Checklist, Settings, Plan, Library, legacy HUD, or shared navigation;
- A7c adoption work;
- dependencies, lockfiles, fonts, or icon packages;
- `Agent` or `AgentSwarm` delegation during this first implementation trial;
- Git commits, pushes, merges, branch deletion, PR creation, or external mutation.

No real-account browser verification, live Supabase authentication, remote sync, or production
write is permitted.

## 7. Required tests

### Pure removal tests

Cover at minimum:

1. blank extra entry is recognized as blank;
2. any supported field with a real value is populated;
3. numeric zero is populated;
4. prescribed index removal is refused;
5. negative, non-integer, and out-of-range indexes are refused;
6. the exact selected extra entry is removed;
7. other entries and unrelated fields remain unchanged;
8. the input array and entries are not mutated;
9. multiple extras may be removed one at a time;
10. a removed superset member extra reduces only that member's generated extra round.

Because the repository has no DOM render-test infrastructure, do not add a testing library for
this task. Test extracted pure behaviour and preserve/extend `SupersetGroup.test.js`; verify the
confirmation sheet and visual affordances manually.

### Regression checks

Run from `app/`:

```text
npm test
npm run build
```

Then from the repository root:

```text
git diff --check
```

Also perform an explicit zero-diff audit against protected areas named in §6. Do not infer safety
only from passing tests.

## 8. Local visual verification

Kimi may run the local Vite app using isolated/local data only if the environment already supports
it. It must not authenticate a real account or allow sync to drain.

Verify at a narrow Android-like portrait viewport:

- phase label appears once and does not squeeze/wrap inside a pill;
- prescribed sets have no Remove control;
- blank extra removes immediately;
- populated extra asks before removal;
- Cancel preserves all values;
- accepted removal survives Today → Plan → Today and local draft restore;
- note preview is unmistakably tappable and the keyboard-open editor remains unchanged;
- Add set, Change exercise, Note, Remove, and Finish meet thumb-target expectations;
- set inputs remain legible with the keyboard open;
- Finish and content remain above the bottom nav with correct spacer/safe-area behaviour;
- no text or controls are hidden by decorative pseudo-elements;
- no visual change leaks into Timer, Log, Checklist, Settings, Plan, Library, or legacy HUD.

The worker's local screenshot is implementation evidence only. It does not replace the developer's
physical Android acceptance.

## 9. Developer Android acceptance

After independent review, the developer verifies on the installed Android PWA:

1. Add two extra sets, remove a blank one, and confirm the remaining row/order is correct.
2. Populate an extra, tap Remove, cancel, and confirm values remain.
3. Remove the populated extra and confirm it disappears after navigation, lock/reopen, and offline
   reopen.
4. Confirm progress/completeness does not decrease when only an extra is removed.
5. Open, type, close, navigate away, and reopen an item note; no text is lost.
6. Check the header at the longest real phase label.
7. Check the full Train Today surface for glare, contrast, three-second glanceability, keyboard
   overlap, and bottom safe-area clearance.
8. Confirm other hubs have not changed visually.

A7b acceptance is not complete until this physical review passes.

## 10. Kimi execution protocol

The user will start a fresh Kimi Code chat.

Before acting:

1. Run `/status`; confirm the requested provider/model, working directory, and permission mode.
2. Read `AGENTS.md`, the two allowed skills in §5, this plan, and the Kimi operating guide.
3. Read only the allowed implementation files and the two evidence images before exploring
   anything else.
4. Inspect `git status` and preserve the clean approved baseline. Stop if unrelated changes exist.

Execution order:

1. implement and test pure extra-set removal;
2. wire removal through the existing Today component path;
3. improve note and header affordances;
4. implement the scoped Training-mode CSS pass;
5. run focused tests, full tests, build, diff check, protected-file audit, and isolated visual check;
6. report changed files, verification results, remaining risks, and Android acceptance steps.

Kimi may make ordinary visual judgments inside §3.4 without asking. It must ask only when a stop
condition is met or a choice would exceed the approved scope.

## 11. Stop conditions

Stop without attempting a workaround if:

- a DB/Dexie/schema/payload/completeness/logging/Supabase/webhook/sync change seems necessary;
- a global token or shared-navigation change seems necessary;
- a dependency or new testing framework seems necessary;
- removing an extra set cannot be implemented through the existing `itemStateById` state path;
- the worker needs to edit a file outside §5;
- protected or unrelated dirty work overlaps the task;
- local visual verification requires real authentication or external mutation;
- tests reveal a pre-existing failure unrelated to this task;
- the visual direction compromises contrast, touch targets, keyboard use, or safe-area behaviour;
- the work begins to spread into Timer or the other hubs.

Report the evidence and wait for Codex/developer direction. Do not redesign around a guardrail.
