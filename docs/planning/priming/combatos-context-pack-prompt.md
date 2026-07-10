# CombatOS — Context Pack (Priming Prompt 1 of 3)

**Instructions for the User:** Paste this as the first message to Fable 5 in Claude Code, running in the Combat OS (Fight-Camp) project directory with local file access. Send Prompt 2 (the brief) and Prompt 3 (the goal statement) as follow-ups in the same session, in order.

--------------------------------------------------------------------------------

You're being primed for an architect-tier planning session on the Combat OS project. This is message 1 of 3 — a context pack. Message 2 will be a product/feature brief. Message 3 will define exactly what output is expected of you. Don't start planning or proposing anything yet — just absorb this and confirm you've read it.

## The single most important instruction in this whole priming sequence

**Nothing in this context pack is a requirement, a decision, or a spec.** It's historical signal — evidence of what was tried, planned, half-finished, or abandoned, at various points, by a developer who is a vibe-coder in the middle of leveling up their practices. Some of it is stale. `docs/planning/CHECKLIST.md`, in particular, has known-unchecked items that may no longer reflect current priority — treat every unchecked box as "was once intended," not "is currently wanted." Where this pack and the brief (message 2) disagree, or where either seems to conflict with the actual state of the repo, **say so explicitly rather than silently reconciling it.** Flagging a contradiction is more valuable to this developer than smoothing one over.

## What to do with this pack

1. Read everything below.
2. Use your local file access to verify anything you can — read the actual current files, don't just trust these descriptions of them. If something here doesn't match what you find in the repo, that's exactly the kind of thing to flag.
3. Do not propose a plan yet. Confirm you've absorbed this and wait for message 2.

## Files to read directly from the local repo (you have file access — use it)

- `README.md`, `AGENTS.md`, `ARCHITECTURE.md` — current, accurate as of this writing
- `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md` — the live session-continuity system; check these for the most recent state, since they may be more current than this pack
- `docs/planning/CHECKLIST.md` — Project A (hardening) is genuinely complete and shipped. Project B (Apex Protocol/brother rebrand) is planned but not started. Neither backport described below appears in it yet — they're newer than this file.
- `archive/combat-os-backport-kit/AGENT_PROMPT.md` — a scoped, ready-to-execute prompt for a **visual/UI backport** from Apex Protocol: Timer view overhaul (phase-based colors, pulsing bell indicator, color-shifting pause button), a "tactical amber" palette replacing cyan, an audio volume fix, and iOS PWA meta tags. Explicit guardrails: do not touch `%1RM`/e1RM logic, schemas, webhooks, or any Apex-specific content (the "Apex tab" is philosophy content for the brother, not for this app). (Note: this backport has since shipped — the kit is now archived, not active, at `archive/combat-os-backport-kit/`.)
- `archive/combat-os-backport-kit/MIGRATION_GUIDE.md` — the human process for running the above: copy the backport kit in, run the prompt, review the plan, approve, test, deploy.
- `archive/combat-os-backport-kit/FEATURE_BACKPORT_DIAGNOSTIC_PROMPT.md` — a **diagnostic-first** (no code changes) prompt for a second, separate backport: "Delete Last Logged Day" (undo last log, local + webhook) and a "Next Day" HUD indicator. This one is NOT ready to execute — it explicitly requires understanding CombatOS's day structure first, because Apex's simple `lastLoggedDay + 1` wrap doesn't account for CombatOS mixing training days with rest/fight-gym days. Also surfaces an unresolved design fork: Apex's delete is soft (status column, audit trail); CombatOS's current webhook already implements delete, but as a hard row deletion. This fork is not yet decided.
- `dev_files/REVAMP/` (six files: directory trees, file listings, reference-file contents) — the raw output of an earlier exploration pass. Denser and more granular than anything summarized above; useful if you need to verify a specific detail, not meant to be read start-to-finish.
- `METZCORE_RUNBOOK.md` (if present in project knowledge, not the repo itself) — infrastructure reference for the developer's self-hosted n8n + Hermes agent setup. One hard rule from it carries directly into this project: **never disrupt the n8n stack.** Treat n8n as a fixed, protected dependency in anything involving the webhook or a future migration.

## Known facts already extracted from the above (so you don't have to re-derive them)

- Local sync architecture: Dexie (`sessions`, `syncQueue`, `settings`) → queued webhook → `scripts/webhook.gs` (v2) → Google Sheet `FightLog` tab. `app/src/sync/` exists but is empty — a planned refactor (move sync logic into `src/sync/syncQueue.js`) was started and abandoned mid-way, per `webhook.gs`'s own comments.
- `fighters-os.gs`, `fighters-os-lite.gs`, `build_sheet.py`, `fighters-os.xlsx` are a fully-superseded lineage (v1.0 Apps Script → Python-generated spreadsheet → the current PWA). Duplicate `.gs` copies exist at repo root and in `scripts/` — byte-identical.
- The Google Sheet this all feeds has never been opened or reviewed by the developer. Months of session data exist with zero feedback loop back to the user.
- Apex Protocol stores its workout plan as JSON, not CSV — a real architectural divergence from CombatOS, not just styling.

Confirm you've read this, then wait for message 2.
