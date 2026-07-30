# Combat OS — A11a Exercise Reference Foundation

_Approved scope: 2026-07-30. This is the data-contract and validation foundation for A11. It does
not curate real exercise links and does not add a Watch demo control._

## 0. Authority, base, and roadmap fit

A11 establishes a canonical exercise identity and a curated, bundled external-resource catalogue
before A12 may propose any Academy / Exercise Guides information architecture.

The approved Phase 1 evidence is preserved at
`archive/agents-answers-for-review/sonnet-a11-exercise-reference-diagnostic.md`. Its Option B
recommendation is adopted with two binding architecture corrections:

1. The canonical field is named **`exerciseId`**, not `refId`, because it identifies an exercise.
   Existing cartridge `item.id` and logged `itemId` remain prescription-slot identities.
2. Every authored `exerciseId` must resolve through a deterministic catalogue-consistency test.
   Runtime lookup still fails safely, but an unknown authored ID must not silently ship.

**Implementation worker:** Kimi Code, using the model selected by the developer.

**Human/Codex-owned work:** selection of real exercises and links, Plan/Today UX, Android
acceptance, any database/Dexie/Supabase/payload/webhook/PWA/schema-version decision, and final Git
commit. None of those is part of A11a.

## 1. Mission and stop condition

Implement the smallest file-backed foundation that later A11 slices can safely consume:

- document optional cartridge-item `exerciseId`;
- add an empty canonical exercise catalogue and an identical app-bundled mirror;
- add a pure catalogue validator;
- add a small fail-safe runtime registry/resolver;
- validate optional `exerciseId` syntax in training cartridges;
- add deterministic tests for catalogue structure, mirror equality, and cartridge-to-catalogue
  reference integrity.

Then run the required verification, write the handoff report, and stop. Do not stage or commit.

## 2. Binding identity and storage contract

### 2.1 Two identities with different jobs

- `item.id` / session-payload `itemId`: existing prescription-slot identity, unique only within one
  cartridge. Do not rename, reinterpret, transform, or globally validate it.
- `exerciseId`: optional canonical exercise identity, stable across cartridges when a human has
  deliberately ruled two items to represent the same exercise.

Never derive `exerciseId` from `item.id`, item position, or normalized display name. Never use
fuzzy matching. Never add it to a logged session payload.

### 2.2 Catalogue location

Canonical authored source:

`catalogue/exercise-catalogue.json`

App-bundled mirror:

`app/src/data/exerciseCatalogue.json`

The two parsed JSON documents must remain equal, enforced by a regression test. The app must import
the bundled mirror as a module; it must not fetch the root file at runtime.

### 2.3 Catalogue v1 shape

Create the initial foundation exactly as:

```json
{
  "catalogueVersion": "1.0.0",
  "exercises": []
}
```

A future curated entry will have this contract:

```json
{
  "exerciseId": "barbell-back-squat",
  "name": "Barbell Back Squat",
  "resources": [
    {
      "type": "video",
      "provider": "YouTube",
      "label": "Watch demo",
      "url": "https://example.com/demo"
    }
  ]
}
```

A11a must not add this example or any other real entry to the production catalogue. Examples belong
only in documentation or test fixtures. Kimi must not browse for, invent, or curate URLs.

The catalogue is source-controlled read-only product content. It does not belong in Dexie or
Supabase. Direct module import keeps its metadata available offline through the existing JavaScript
bundle; do not change `vite.config.js`, Workbox, the manifest, or runtime caching.

## 3. Deterministic validation contract

Add a pure `validateExerciseCatalogue(catalogue)` function returning an array of human-readable
error strings, following the established `validateCartridge()` convention.

Validate:

- root value is a plain object;
- root keys/shape contain a valid semantic `catalogueVersion` and an `exercises` array;
- an empty `exercises` array is valid for the A11a foundation;
- every entry is a plain object;
- `exerciseId` is a non-empty lowercase-kebab string;
- `exerciseId` values are unique;
- `name` is a non-empty, single-line string;
- `resources` is a non-empty array for every real entry;
- every resource is a plain object;
- v1 `type` is exactly `video`;
- `provider` and `label` are non-empty, single-line strings;
- `url` parses successfully and uses exactly the `https:` protocol.

Duplicate URLs across different exercises are allowed. One curated demonstration can legitimately
cover more than one movement; do not reject or warn on that condition in the validator.

Do not perform network requests, HEAD checks, provider allowlisting, link-rot checks, or live URL
verification.

## 4. Cartridge validation and cross-reference integrity

In `validateCartridge.js`, validate optional `exerciseId` on every training item kind:

- absent is valid;
- present must be a string matching the existing lowercase-kebab convention;
- it remains optional and additive to cartridge schema v3;
- do not bump `schemaVersion`;
- do not add `exerciseId` to content cartridges in A11a.

Keep `validateCartridge()` independent of the catalogue. It validates one cartridge's own
structure; it must not import product data.

Add a separate deterministic integrity test that loads:

- all three canonical root cartridges;
- the canonical root exercise catalogue;

and asserts that every authored training-item `exerciseId`, when present, resolves to exactly one
catalogue entry. The present real cartridges contain no `exerciseId`, so the initial production
audit is valid but empty. Use explicit test fixtures to prove both a resolving ID and an unknown ID.

Runtime resolution must also be fail-safe:

- absent ID returns `null`;
- unknown ID returns `null`;
- known ID returns the catalogue entry;
- no render or app path may throw because a reference is absent or unknown.

## 5. Documentation contract

Update only the relevant parts of:

- `docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`
  - document optional `exerciseId`;
  - state that it is canonical exercise identity, not prescription-slot `item.id`;
  - state that it is additive schema-v3 metadata and never logged;
  - document the separate catalogue relationship.
- `docs/authoring/COACH-PROMPT.md`
  - instruct authoring models never to invent `exerciseId` values or external URLs;
  - omit the field unless a later human-curation pass supplies it.
- `docs/authoring/REVIEWER-CHECKLIST.md`
  - add deterministic syntax and catalogue-resolution checks;
  - add the human semantic check that an assigned identity actually matches the exercise.

Do not change `docs/authoring/INTAKE-SCHEMA.md`; exercise-resource curation is not part of the
programme interview.

## 6. Runtime registry

Add a small module at `app/src/data/exerciseCatalogue.js` that imports the app-bundled JSON and
exports:

- the parsed catalogue;
- a map keyed by `exerciseId`;
- a pure resolver returning the entry or `null`.

Use clear names such as `EXERCISE_CATALOGUE`, `EXERCISE_BY_ID`, and
`getExerciseReference(exerciseId)`. Do not wire the resolver into Plan or Today in A11a.

If validation of the bundled production catalogue is performed at module load, it must fail
developer builds clearly without introducing a user-facing runtime crash. Prefer keeping
production validation in deterministic tests unless the existing cartridge registry establishes a
different proven convention.

## 7. Allowed files

Kimi may create or edit only:

- `catalogue/exercise-catalogue.json` (new)
- `app/src/data/exerciseCatalogue.json` (new mirror)
- `app/src/data/exerciseCatalogue.js` (new)
- `app/src/utils/validateExerciseCatalogue.js` (new)
- `app/src/utils/validateExerciseCatalogue.test.js` (new)
- `app/src/utils/exerciseCatalogueIntegrity.test.js` (new, if kept separate)
- `app/src/utils/validateCartridge.js`
- `app/src/utils/validateCartridge.test.js`
- `docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`
- `docs/authoring/COACH-PROMPT.md`
- `docs/authoring/REVIEWER-CHECKLIST.md`
- `archive/agents-answers-for-review/kimi-a11a-exercise-reference-foundation.md` (handoff report)

If a necessary test fits more cleanly into one of the listed test files, do not create an additional
test file merely to match the suggested layout.

## 8. Explicitly forbidden

Do not touch:

- any `cartridges/*.json` file or its existing app-bundled mirror;
- `ProgramOverview.jsx`, `PlanViewer.jsx`, any Today component, or `index.css`;
- `cartridgeSessionPayload.js`, `cartridgeLogInput.js`, completeness, last-performance, draft, or
  workout math;
- the locked session payload, webhook/Sheets contract, `scripts/webhook.gs`, or sync code;
- Dexie schemas, migrations, Supabase files or live Supabase;
- `playbook.csv`, generated `app/src/data/playbook.js`, or its generation pipeline;
- `vite.config.js`, service workers, Workbox, the manifest, install/update behavior, or assets;
- navigation, A12/Academy UI, dependencies, package files, or lockfiles;
- `.env.local` or the intentional pre-existing deletion of `app/.env.example`;
- `ROADMAP.md`, `STATUS.md`, `docs/handoff.md`, or `docs/decision_log.md`;
- Git staging, commits, pushes, merges, branches, or PRs;
- Agent/AgentSwarm delegation.

If the implementation appears to require any forbidden file or a schema/payload/database decision,
stop and report the reason. Do not improvise around the boundary.

## 9. Required tests

At minimum cover:

1. valid empty foundation catalogue;
2. valid one-entry fixture;
3. invalid root/object/array shapes;
4. invalid and duplicate `exerciseId`;
5. empty/multiline name, provider, or label;
6. missing/empty resources;
7. invalid resource type;
8. malformed, non-HTTPS, or relative URL;
9. duplicate URLs explicitly accepted;
10. optional cartridge `exerciseId` absent and valid;
11. invalid cartridge `exerciseId`;
12. canonical/bundled catalogue equality;
13. all authored cartridge references resolve;
14. known/unknown/absent runtime resolver behavior.

Run from `app/`:

```text
npm test
npm run build
```

Also run from the repo root:

```text
git diff --check
git status --short
```

No Android acceptance is required because A11a has no UI.

## 10. Preflight, evidence, and handoff

Before editing, record:

```text
git branch --show-current
git log -1 --oneline
git status --short
```

Expected intentional out-of-scope state may include:

```text
 D app/.env.example
?? archive/agents-answers-for-review/
```

Do not restore, delete, stage, or include that state. Do not read `.env.local`.

After implementation, write
`archive/agents-answers-for-review/kimi-a11a-exercise-reference-foundation.md` with:

1. preflight;
2. exact files changed;
3. final catalogue and `exerciseId` contract;
4. validation and integrity rules;
5. proof protected files remained untouched;
6. test/build/diff-check results;
7. final `git status --short`;
8. unresolved blockers or assumptions.

Then stop with:

`READY FOR CODEX REVIEW — NOTHING STAGED OR COMMITTED`
