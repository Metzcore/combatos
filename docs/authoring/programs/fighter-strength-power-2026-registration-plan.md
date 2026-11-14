# Fighter Strength & Power - app-registration diagnostic

Date: 2026-11-14. Status: approved; implemented in local source, tests and build passed.
Authoring began on `feat/foundation-conditioning-demo-links`, HEAD `97df6e7`.
Registration uses `codex/fighter-strength-power`, based on verified remote main
`2e508dccdd0198e51175ca091e5212f4798fd26e`. GitHub's live branch matches the local origin/main ref.
The prior feature is already merged in PR #110; no unrelated feature diff is included.

## Reviewable candidate

- [Full prescription](fighter-strength-power-2026.md)
- [Candidate JSON](candidates/fighter-strength-power-2026.json)
- Candidate ID: `fighter-strength-power-2026`, version `1.0.0`, schema `3`.
- Exact raw-byte SHA-256:
  `12e5be8ba76bd59cd18df39f831843b7519d13601b63a1a480034471ff7c251f`.
- The user approved this exact candidate and registration plan in chat on 2026-11-14.
  The candidate, canonical file and app mirror retain this hash.
- The owner approved the four-week structure in chat and then requested final prescription/
  cartridge preparation. This document makes the separate app-source changes concrete.

## Approved bounded implementation

Use an appropriate `codex/` branch for the new program rather than accidentally publishing
unrelated work on the current feature branch. Recheck base and worktree status first.

1. Copy the candidate's exact bytes to `cartridges/fighter-strength-power-2026.json`.
2. Copy those same bytes to `app/src/data/cartridges/fighter-strength-power-2026.json`.
3. Add exactly one import/entry in `app/src/data/cartridges/index.js`.
4. Add the filename once in each explicit canonical/integrity list:
   `app/src/utils/validateCartridge.test.js` and
   `app/src/utils/exerciseCatalogueIntegrity.test.js`.
   Pin this candidate's line endings in `.gitattributes` so its approved byte hash also survives
   checkout alongside the canonical and bundled files; no global text policy changes.
5. Run focused checks, the full app test suite and the production build.
6. Prepare the source change for developer review. Do not infer merge, deployment or account
   assignment authorization from this registration approval alone.

Guide exception for the PR description: this adds assigned program data using existing
screens and controls; it introduces no new app behaviour or Guide instructions. The program's
specific four-week instructions belong in its own description and cues, rather than a global
Guide/What's new announcement. If implementation actually changes app behaviour, revisit this
exception and update the matching Guide article plus dated What's new entry in the same PR.

## Deliberately unaffected

Logging schema, webhook envelope/Sheets integration, session-payload code, e1RM/%1RM math,
generated playbook, Dexie/PWA behaviour, infrastructure, Supabase schema/auth/access rows and
all existing cartridge content. The candidate contains no account identity, raw intake,
health history, catalogue IDs, invented resource links or reproduced paid course material.

## Observed validation

- Candidate structural validation: no errors.
- Registration preflight: ready; LF-only candidate and matching SHA-256.
- Existing canonical/app mirrors: five cartridge pairs match and are registered.
- Candidate passes 14 pure local payload checks through the production input builder, payload
  builder and validator: every day at both base and added-set doses.
- The added third sets survive logging; custom-day content survives; bag/bike actual work is
  recorded in notes, not invented per-round fields.
- Focused tests after registration: five files, 196 tests passed.
- Full suite after registration: 73 files, 1,374 tests passed. Production build passed.
  Vite reports its bundle-size advisory; no build failure. On-device verification has not been performed.

Local evidence: `dev_files/cartridge-preflight/fighter-strength-power-2026.md` and
`dev_files/cartridge-candidates/fighter-strength-power-2026/validation-results.json`.
These are disposable verification outputs; the reviewable prescription and candidate are stored
durably under `docs/authoring/programs/`.

## Risks and limitations for review

- Two sets are the static prescription. Third sets in weeks 2-3 are added manually where marked;
  completion remains capped at the two-set base. There is no automatic week/phase switch.
- Monday/Wednesday/Friday/Sunday retain custom logging. Saturday combines loaded work and
  read-only bag guidance, with actual course/round details in notes.
- Time budgets include rest/transitions but cannot guarantee availability in a crowded gym;
  optional bike is the first cut, and Saturday bag volume has an explicit cap.
- Power needs a clear permitted area. No plyo box, wall throwing station or dip belt is assumed.
- A conventional loaded hinge is omitted to honor the earlier preference; the limited optional
  supplemental aerobic dose is intentional for the first block. Both are explicit review flags.
- The coaching review is the author's self-review, not an independent coach audit or proof of
  individual training response. Review the actual response after four weeks from the start.

## Approval recorded

The exact candidate and bounded registration are approved. Deployment and protected assignment
to the intended account remain separate actions, as stated in the approved scope.
