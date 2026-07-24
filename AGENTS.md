# AGENTS.md — Operating Rules for AI Agents in Combat OS

This file governs how any AI agent (Claude Code, a Cowork session, an architect-tier planning
model, etc.) should behave while working in this repo. It exists because this codebase is
worked on almost entirely by AI agents across many separate sessions, for a single developer,
with no team around to catch drift. Read this before making any change.

These are hard rules, not suggestions. If a task seems to require breaking one, stop and ask
rather than proceeding.

For *how* agents collaborate — source-of-truth hierarchy, provider/model roles, evidence
discipline, and the persistence/PWA risk gates — see `docs/engineering/AI-WORKFLOW.md`. This file
is the hard-rule authority; where the two overlap, this file wins.

## Hard rules

1. **Never modify %1RM / e1RM workout math without explicit instruction.** This is training-load
   calculation logic the developer relies on directly. If a task touches anything that looks
   like one-rep-max or estimated-one-rep-max math, treat it as off-limits unless the task
   explicitly names it.

2. **Never alter webhook payload shapes, the logging schema, or the Google Sheets integration —
   unless the task explicitly lifts this restriction.** As of this writing, only roadmap item
   **W17** does (see `docs/planning/roadmap/ROADMAP.md` and
   `docs/planning/roadmap/OPEN-DECISIONS.md`, decision D1). That means: do not change the shape
   of the JSON envelope sent to `scripts/webhook.gs` (`{ action, sessionId, payload }`), do not
   change the row-column layout it writes to the `FightLog` Google Sheet tab (documented in
   `docs/reference/fight-log-schema.md`), and do not touch `scripts/webhook.gs`'s logic outside
   of an explicitly scoped task. `webhook.gs` is manually deployed through the Google Apps
   Script editor — a code change in this repo does not take effect until someone redeploys it by
   hand, so any change here has a real, separate deployment step attached.

3. **Never leak Apex-specific UI or features into Combat OS.** Apex Protocol is a program for a
   different user (referenced as "Project B" in `archive/CHECKLIST.md`). Do not bring an Apex
   *tab*, "Maintenance" features, "Regla Cero" content, RPE (rate-of-perceived-exertion) UI
   components, or any other Apex/Emmanuel-specific *interface or feature* into Combat OS. **The one
   deliberate exception is the universal Apex training cartridge** (`cartridges/apex-protocol-phase1.json`,
   shipped by A5): the cartridge system is one player over portable program data, so an assigned
   Apex cartridge rendering through the shared engine is by design — that is program *data*, not an
   Apex-specific app surface. If a task references any of these terms, confirm scope before
   touching anything.

4. **Never hand-edit `app/src/data/playbook.js`.** It is generated output — the file itself is
   marked "Auto-generated from playbook.csv — do not edit directly." All program-data changes
   must go: edit `playbook.csv` (repo root) → run `python audit_playbook.py` (repo root, checks
   for missing Phase-Day combos, HA-variant coverage, strength slot counts) → run
   `python scripts/csv_to_js.py` to regenerate `app/src/data/playbook.js`. If you find yourself
   about to edit `playbook.js` directly, stop.

5. **Never disrupt the developer's self-hosted n8n stack.** It is described in the project's own
   roadmap as a "fixed, protected dependency" (see `docs/planning/roadmap/ROADMAP.md`,
   standing guardrail 5, and decision D7 in `OPEN-DECISIONS.md`, which notes n8n as the working
   keep-alive theory for the Supabase backend — now live in production, not a future migration).
   This repo does not currently
   contain n8n configuration, but if a task ever touches infrastructure adjacent to it, treat it
   as untouchable without explicit instruction.

6. **Diagnostic before modification; one surgical change per session/PR.** For anything beyond a
   trivially safe edit, produce a diagnostic or plan first (what will change, what won't, what
   the risks are) and get it approved before editing code. This mirrors how the roadmap prompts
   in `docs/planning/roadmap/prompts/` are written — most non-trivial `W##` items have an
   explicit "PHASE 1 — DIAGNOSTIC (report, then stop for approval)" step before implementation.
   Keep each session/PR scoped to one roadmap item or one clearly-bounded fix — don't bundle
   unrelated changes.

7. **Session continuity: read signal, don't treat it as spec.** Sessions in this repo open with
   the `combatos-sunshine` skill and close with `combatos-goodnight`
   (`.agents/skills/combatos-sunshine/SKILL.md`, `.agents/skills/combatos-goodnight/SKILL.md`).
   These read and write three files:
   - `STATUS.md` (repo root) — 30-second human-facing orientation, rewritten in full on close.
   - `docs/handoff.md` — the Pending section is the canonical cross-session carry-forward list,
     rewritten (not appended) on each close.
   - `docs/decision_log.md` — append-only log of actual decisions (rule/convention changes), not
     a log of routine activity.
   Both skills explicitly warn that pending items and roadmap entries can go stale: **treat their
   contents as signal to verify against the user's stated goal for the current session, not as
   a spec to blindly execute.** If what a file says is "next" contradicts what the user just
   asked for, say so and ask which takes priority — don't silently follow the file.

8. **Check the active roadmap before inventing new work; log open questions properly.** The
   authoritative list of planned work is `docs/planning/roadmap/ROADMAP.md`, with one detailed
   prompt per item under `docs/planning/roadmap/prompts/` (e.g. `W07-test-bootstrap.md`,
   `W08-sync-refactor.md`, `W17-soft-delete.md`). Before proposing new feature work, check
   whether it's already scoped there — either as an active item, a gated one, or something
   already ruled out. Genuinely open decisions (multiple reasonable answers, no ruling yet)
   belong in `docs/planning/roadmap/OPEN-DECISIONS.md` — **never silently default one and move
   on.** Most decisions there are ruled (D1–D8 and D10), but **D9 (off-programme activity
   logging) is still open** — inspect each decision's own ruling line before assuming a question
   is settled.

## Other things worth knowing while working here

- `archive/CHECKLIST.md` is an older, longer-arc tracking document (Project A / Project B
  framing) that predates `ROADMAP.md` and was moved into `archive/` on 2026-07-22. `ROADMAP.md`
  supersedes it for sequencing; `CHECKLIST.md` remains a historical record and is not touched by
  the sunshine/goodnight skills.
- `archive/` holds retired systems (a legacy spreadsheet-based predecessor, a completed
  feature-backport kit) kept for reference — do not treat code there as live or import from it
  without checking why it was archived.
- `dev_files/` is local scratch space, gitignored by design — nothing durable should be expected
  to live there permanently (see decision D5 in `OPEN-DECISIONS.md` for the history of planning
  docs almost being lost there).
- This file describes constraints, not a to-do list — the active work queue lives in
  `docs/planning/roadmap/ROADMAP.md`.
