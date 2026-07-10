# COMBAT OS — SEQUENCED ROADMAP
_Deliverable 2 of the Fable 5 architect session, 2026-07-10. Same format and role as `docs/planning/CHECKLIST.md` (which this supersedes for sequencing — CHECKLIST.md remains the record of Project A). Small/safe/high-value first; bigger or riskier later; gated items explicitly gated._

**How to run this:** each `W##` item has a matching prompt in `docs/planning/roadmap/prompts/`. Copy the prompt into a fresh session with the assigned worker tier, review its plan/diagnostic, approve, test, check the box. One item per session. Diagnostic before modification wherever the change isn't trivially safe.

**Worker tiers** (from the brief): **ARCH** = Fable 5 (plans only) · **IMPL** = Sonnet 4.6 thinking / Gemini 3.1 Pro high · **FAST** = Gemini 3.5 Flash / Composer 2.5 / GPT-OSS · **REVIEW** = Opus 4.6 thinking (pre-merge pass).

---

## Phase 0 — Truth-up (no code; do first)
- [x] 0.1 **HUMAN:** Read `OPEN-DECISIONS.md` and rule on D1 (delete semantics) and D2 (next-day semantics). _Done 2026-07-10 — all seven decisions ruled; see the RULED lines in OPEN-DECISIONS.md._
- [x] 0.2 **HUMAN:** Open the Google Sheet for the first time. Sanity-check the FightLog tab against `docs/reference/fight-log-schema.md`. _Done 2026-07-10 — developer reviewed the Sheet; data confirmed present and well-formed._
- [~] 0.3 Update `STATUS.md` / `docs/handoff.md` / `docs/planning/CHECKLIST.md` to record that both backports shipped in `3caf4ca`. _CHECKLIST addendum done in this commit; STATUS/handoff handled by the goodnight skill at session close._

## Phase 1 — Repo hygiene (small, safe, high value) — ✅ COMPLETE 2026-07-10 (PRs #1–#4)
- [x] W1 · **FAST** · Git hygiene: `.gitignore` fix, untrack `app/build_error.log`, remove unused `papaparse`. _Shipped in PR #2 (Haiku batch)._
- [x] W2 · **FAST** · Legacy consolidation into `archive/legacy-spreadsheet-system/`; duplicate `.gs` and redundant `playbook.csv` removed. _Shipped in PR #2 (Haiku batch)._
- [x] W3 · **FAST** · Stale-comment truth-up in `webhook.gs` and `usePlaybook.js` headers. _Shipped in PR #2 (Haiku batch)._
- [x] W4 · **IMPL**, then **REVIEW** · `README.md`, `AGENTS.md`, `ARCHITECTURE.md` created from the live repo. _Shipped in PR #4 (Sonnet; reviewed by Fable)._
- [x] W5 · **FAST** · GitHub starter kit: `.github/` templates + CI build-check workflow. _Shipped in PR #1 (Haiku)._
- [x] W6 · **IMPL** (read-only) · Directory-reorg diagnostic → report at `W06-REORG-REPORT.md`; executed as the D5 reorg in PR #3 (Sonnet).

## Phase 2 — Structural debt (ordered so tests protect the refactor)
- [~] W7 · **IMPL** · Test bootstrap: Vitest + fake-indexeddb; first unit tests around pure logic (next-day calc, playbook key lookup / hip-routing, syncQueue enqueue behavior). Small, permanent safety net — deliberately BEFORE the sync refactor. → `prompts/W07-test-bootstrap.md` _In progress 2026-07-10 (Sonnet, branch `chore/test-bootstrap`)._
- [ ] W8 · **IMPL**, then **REVIEW** · Finish the half-done sync refactor: extract queue/sync logic from `db/index.jsx` into `app/src/sync/syncQueue.js` with zero payload/behavior change. Diagnostic-first. → `prompts/W08-sync-refactor.md`

## Phase 3 — Close the feedback loop (biggest identified value gap)
- [ ] W9 · **IMPL**, then **REVIEW** · Weekly-stats view inside the existing Log tab (sessions/week, completeness trend, phase/day coverage, hip-score trend — from local Dexie, no backend). Diagnostic-first. Deliberately BEFORE any Supabase talk: proves what feedback is actually wanted. → `prompts/W09-weekly-stats.md`

## Phase 4 — UX feature work (one surgical change per session; any order within phase)
- [ ] W10 · **IMPL**, then **REVIEW** · HUD visual hierarchy + collapsible bag-work and core/accessory blocks (auto-expand when logged). Diagnostic-first — HUD is the largest, most-used component. → `prompts/W10-hud-hierarchy.md`
- [ ] W11 · **IMPL** · Playbook tab overhaul: collapse/group by phase→day→block instead of flat layout. → `prompts/W11-playbook-overhaul.md`
- [ ] W12 · **IMPL**, then **REVIEW** · Reusable exercise picker: save custom core/accessory/cooldown exercises once, pick from dropdown after (new Dexie store — schema version bump, handle with care). → `prompts/W12-exercise-picker.md`
- [ ] W13 · **IMPL** · Mobility upgrades: per-exercise YouTube link (opens new tab) + Settings-level injury/mobility profile with a global toggle to hide the mobility block. → `prompts/W13-mobility-profile.md`
- [ ] W14 · **FAST** · Phase lock/unlock signaling: make the existing unlock logic legible in the UI (what unlocks next, why, how close). No logic changes. → `prompts/W14-phase-signaling.md`
- [ ] W15 · **IMPL** · Timers page: drag-and-drop reordering of stopwatch/rest-timer blocks, order persisted in settings. → `prompts/W15-timer-reorder.md`
- [ ] W16 · **IMPL**, then **REVIEW** · Day-7 cycle extension (re-scoped per D2 ruling): keep sequential day counting, extend the cycle 6→7 with Day 7 as an optional/custom gym day (cardio/mobility/free-form notes — `FightGymDay.jsx` already supports these session types). Diagnostic-first. → `prompts/W16-next-day-semantics.md` (rewritten 2026-07-10)
- [ ] W17 · **IMPL**, then **REVIEW** · ⛔ gated on **D1** · Delete semantics rework (only if D1 = soft delete): webhook.gs v3 with status column + local tombstone. The one item where the "do not touch webhooks" guardrail is deliberately lifted. → `prompts/W17-soft-delete.md`

## Phase 5 — Gated / deferred (no prompts yet, on purpose)
- [ ] W18 · **ARCH** · Custom Claude skills (3–4 max: PWA/offline-first, mobile UX, personal-analytics viz, CombatOS conventions). Low risk, can run parallel to Phase 4 whenever wanted. → `prompts/W18-custom-skills.md`
- [ ] ⛔ **Supabase migration** — gated on: research prompt 3 results (free-tier pausing), the 0.2 data review, and W9 proving what feedback matters. n8n keep-alive is the working theory for the pause guardrail; n8n stack itself is untouchable. Decision D7.
- [ ] ⛔ **Audio-ducking bug** — gated on research prompt 3 results (Android audio focus / Media Session API). Reproducible, documented, not urgent.
- [ ] ⛔ **Notepad/capture + Hermes connector** — gated on decision D4. Architecture theory (capture → connector → Personal-OS) is unvalidated by the developer's own admission.
- [ ] ⛔ **Project B (Apex Protocol kickoff)** — downstream of this roadmap stabilizing, per STATUS.md. Sequencing lives in `docs/planning/CHECKLIST.md` Project B section.
- [ ] ⛔ **Sell-as-product** — parked by the developer; demand validation deliberately deferred. Nothing to do.

---

## Addendum — 2026-07-10 developer rulings (see OPEN-DECISIONS.md for full text)
All seven decisions were ruled the same day the roadmap was produced. Gate/scope changes, not yet re-sequenced into the phases above:
- **W17 UNGATED** (D1 = soft delete). Runs as written.
- **W16 RE-SCOPE NEEDED** (D2): current sequential behavior ratified, but the cycle extends to a new **Day 7** — optional/custom gym day with free-text notes. The drafted W16 prompt (skip-days rework) is void; a replacement diagnostic-first prompt is needed (day-structure 6→7 touches wrap math, `usePlaybook` synthesis, completeness/unlock counting).
- **NEW ARCH ITEM (D3): nav-IA redesign proposal** based on the layered TRW/Discord paradigm (`docs/reference/therealworld-app-references/mobile_app_architecture_spec.md`): ≤5 bottom hubs, swipeable top tabs inside hubs, bottom sheets, FAB, accordions. Design doc first, no code. W10/W11 should be reviewed for absorption into it before being run standalone.
- **NEW FEATURE ITEM (D4): notepad/idea-organizer** — folders, tags, 5-star rating, connector-ready data layer; UI reference `docs/reference/therealworld-app-references/checklist_ui_specification.md`. Sequenced AFTER the D3 redesign proposal decides where it lives. Hermes connector stays deferred (own tab, later).
- **W6 MANDATE STRENGTHENED** (D5): propose real moves, tracked homes for durable docs (the TRW specs being "lost" in dev_files/ is the proof case — historical description, accurate as of when this was written).
- **W4/W5 SIMPLIFIED** (D6): no drafts exist to recover — generate fresh; skip the "find drafts" step.
- **D7 (Supabase): leaning go, gates unchanged.**
- **Process ruling:** adopt proper branch workflow (feature branches + PRs to main) as part of working "the GitHub way" — W5's CI and templates support this; batch prompts should create a branch per batch.

## Standing guardrails (apply to every item)
1. Never touch `%1RM`/e1RM logic without explicit instruction.
2. Never alter webhook payload shapes or the Sheets integration (exception: W17, explicitly).
3. Never import Apex-specific content (Apex tab, Maintenance, Regla Cero, RPE components).
4. Never hand-edit `app/src/data/playbook.js`; CSV changes go through `audit_playbook.py` → `csv_to_js.py`.
5. Never disrupt the n8n stack — fixed, protected dependency.
6. Diagnostic before modification; one change per session; commit per item.
