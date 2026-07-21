# cartridges/

Authored **program cartridges** — one JSON per person's program, conforming to
[`docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`](../docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md).

- These are **data**, not app code. The rebuilt Train tab (Stage 2) will render them directly.
- This folder is the **authored library + test fixtures** for now. Production cartridges will
  eventually live in Supabase, assigned to accounts — this folder stays useful as the source of
  truth for authored examples and the developer's own program.
- Authoring inputs (the reusable kit) live in [`docs/authoring/`](../docs/authoring/).

_First cartridge: the developer's own UFC-Gym program (in progress — see the intake in
`docs/authoring/`). Second: Apex (brother's program, adapted from his current workout)._
