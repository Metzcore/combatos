# docs/authoring/ — the Program Authoring Kit

The reusable, **model-agnostic** process for turning a person into a training **cartridge**. These
are plain files on purpose: they work in Claude today and a self-hosted model (e.g. Hermes on a
VPS) later, with no tooling and no rework. The kit is the durable asset; a Claude Code skill (if we
build one) will be a thin wrapper over these same files.

**v3 (2026-07-22):** the cartridge remains **block-composable** (`day.blocks[] → kind + items`) and
now includes structured Library metadata: version compatibility, an outcome-led summary, visible
benefits, normalized tags and real equipment requirements. All kit files below are current for v3.

## The pieces

| File | Role |
|------|------|
| [`INTAKE-SCHEMA.md`](INTAKE-SCHEMA.md) | What to learn about a person before authoring. `[GATES]` fields must be answered first. |
| [`COACH-PROMPT.md`](COACH-PROMPT.md) | The versioned authoring system prompt. Carries the coaching doctrine inline, incl. block selection and per-item prescription; paste into any capable LLM. |
| [`REVIEWER-CHECKLIST.md`](REVIEWER-CHECKLIST.md) | The gate before shipping. **Part A** structural (automated — `app/src/utils/validateCartridge.js`); **Part B** coaching-sanity (LLM/human). |
| [`../planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`](../planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md) | The output contract — the block-composable cartridge JSON format. Not in this folder, but part of the kit. |

Output cartridges live in [`../../cartridges/`](../../cartridges/).

## The process
1. **Intake** — copy `INTAKE-SCHEMA.md`'s sections into a working file; the person fills it (or the
   coach interviews to fill the `[GATES]`). If adapting an *existing* program rather than a fresh
   person, the intake still applies — capture the source program's structure in place of a fresh
   interview (see the Apex example below).
2. **Author** — hand the filled intake + the cartridge spec + `COACH-PROMPT.md` to an LLM. It picks
   block kinds per day and emits a cartridge JSON, a plain-English rationale, the suggested next
   phase, and any equipment gaps.
3. **Review** — run Part A (`npm test` / `validateCartridge()` — automated), then Part B (coaching
   sanity). Resolve or consciously accept every flag.
4. **Assign** — a developer/agent attaches the cartridge to the person's account. (Long-term:
   Supabase, per account; for now, files in `cartridges/`.)

## Key design principles (why it's built this way)
- **Model-agnostic core** — the prompt/schema/reviewer are portable text, never locked into one
  vendor's format. This is the single decision that keeps a future self-hosted onboarding flow cheap.
- **The cartridge is the clean interface** — whoever runs the interview (Claude now, a self-hosted
  model later, a form UI eventually) is swappable as long as the cartridge contract holds.
- **One composable engine, not two apps** — a "segment" (e.g. combat-flavored vs. generalist) is a
  curated bundle of block kinds + a theme, not a separate codebase. A simple program is the block
  model's degenerate case (one `strength` block); a rich one uses all five kinds. Same schema,
  same validator, same future renderer for both.
- **Automate structure, keep judgment human** — Part A of the reviewer is executable code
  (`validateCartridge()`); Part B stays a coaching call. Unattended onboarding will only ever need
  a model for the judgment half.
- **A program is a sequence of cartridges** — periodise by swapping phases, not by editing one file.
- **User-facing copy is structured, honest and useful** — summaries and outcomes explain why the
  program matters, while an optional two- or three-paragraph description explains how to use it.
  Author/developer notes stay outside the runtime cartridge and motivation is never manipulative.
- **Prove on real programs first, let the schema follow evidence** — the block model itself exists
  because authoring a *second* real program (Apex) proved the first schema underserved both real
  users. Extend the format only when a real cartridge needs it, never speculatively.

## Proven examples
- `cartridges/combatos-foundation-2026.json` — Phase 1, a 4-week corrective/foundation block.
- `cartridges/combatos-operator-2026.json` — Phase 2, a heavy strength block.
- `cartridges/apex-protocol-phase1.json` — a second person's existing program, adapted (not
  freshly interviewed): 4 training days, all 5 block kinds, PAP pairing, round-structured bag work.
  The stress test that proved the block model before it was promoted to the spec.

All three authored/adapted per this kit and validated against Part A + Part B.
