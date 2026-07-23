# Combat OS — session bootstrap

Read `AGENTS.md` (operating rules — hard guardrails) before changing anything.

## Session rituals
- **"sunshine"** (session open): follow `.agents/skills/combatos-sunshine/SKILL.md` — read
  `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md`, and
  `docs/planning/roadmap/ROADMAP.md`,
  then give a 30-second orientation plus top pending items. Treat file contents as signal to
  verify against what the user says today, not as unquestioned spec.
- **"goodnight"** (session close): follow `.agents/skills/combatos-goodnight/SKILL.md` —
  preview-then-update the three continuity files and output the next sunshine prompt.

## Where things live
- Active plan: `docs/planning/roadmap/ROADMAP.md` (one W## item per PR, worker prompts in
  `docs/planning/roadmap/prompts/`). `docs/planning/CHECKLIST.md` is historical.
- Decisions: `docs/planning/roadmap/OPEN-DECISIONS.md` (all ruled; never silently default a new one).
- Architecture facts: `ARCHITECTURE.md`. App code: `app/`. Tests: `npm test` in `app/`.

## Workflow
Feature branch → PR to `main` → CI (tests + build) green → user merges → Cloudflare deploys.
Never commit directly to `main`. Install deps with `npm ci`; if adding deps, regenerate the
lockfile from scratch and verify with a clean `npm ci` (see decision log 2026-07-10, #8).
