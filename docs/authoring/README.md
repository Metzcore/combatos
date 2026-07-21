# docs/authoring/ — the Program Authoring Kit

The reusable, **model-agnostic** process for turning a person into a training **cartridge**. These
are plain files on purpose: they work in Claude today and a self-hosted model (e.g. Hermes on a
VPS) later, with no tooling and no rework. The kit is the durable asset; a Claude Code skill (if we
build one) will be a thin wrapper over these same files.

## The pieces

| File | Role |
|------|------|
| [`INTAKE-SCHEMA.md`](INTAKE-SCHEMA.md) | What to learn about a person before authoring. `[GATES]` fields must be answered first. |
| [`COACH-PROMPT.md`](COACH-PROMPT.md) | The versioned authoring system prompt. Carries the coaching doctrine inline; paste into any capable LLM. |
| [`REVIEWER-CHECKLIST.md`](REVIEWER-CHECKLIST.md) | The gate before shipping. **Part A** structural (automatable → future code); **Part B** coaching-sanity (LLM/human). |
| [`../planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`](../planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md) | The output contract — the cartridge JSON format. Not in this folder, but part of the kit. |

Output cartridges live in [`../../cartridges/`](../../cartridges/).

## The process
1. **Intake** — copy `INTAKE-SCHEMA.md`'s sections into a working file; the person fills it (or the
   coach interviews to fill the `[GATES]`).
2. **Author** — hand the filled intake + the cartridge spec + `COACH-PROMPT.md` to an LLM. It emits
   a cartridge JSON, a plain-English rationale, the suggested next phase, and any equipment gaps.
3. **Review** — run Part A (mechanical), then Part B (coaching sanity). Resolve or consciously
   accept every flag.
4. **Assign** — a developer/agent attaches the cartridge to the person's account. (Long-term:
   Supabase, per account; for now, files in `cartridges/`.)

## Key design principles (why it's built this way)
- **Model-agnostic core** — the prompt/schema/reviewer are portable text, never locked into one
  vendor's format. This is the single decision that keeps a future self-hosted onboarding flow cheap.
- **The cartridge is the clean interface** — whoever runs the interview (Claude now, a self-hosted
  model later, a form UI eventually) is swappable as long as the cartridge contract holds.
- **Automate structure, keep judgment human** — Part A of the reviewer becomes code; Part B stays a
  coaching call. Designed so unattended onboarding only needs a model for the judgment half.
- **A program is a sequence of cartridges** — periodise by swapping phases, not by editing one file.
- **Prove on a real person first** — this kit was distilled from authoring two real cartridges
  (Foundation + Operator), not from theory. Extend it only when a real run needs it.

## Proven examples
- `cartridges/combatos-foundation-2026.json` — Phase 1, a 4-week corrective/foundation block.
- `cartridges/combatos-operator-2026.json` — Phase 2, a heavy strength block.
Both authored from `intake-developer-program.md` and validated against Part A + Part B.
