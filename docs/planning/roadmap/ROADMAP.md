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

## Phase 2 — Structural debt — ✅ COMPLETE 2026-07-10 (PRs #6, #7, #9)
- [x] W7 · **IMPL** · Test bootstrap: Vitest + fake-indexeddb; 25 unit tests (next-day calc, playbook lookup/hip-routing, syncQueue mechanics); test step added to CI. _Shipped in PR #6 (Sonnet)._
- [x] W8 · **IMPL**, then **REVIEW** · Sync refactor completed: queue/sync logic extracted to `app/src/sync/syncQueue.js`, zero behavior change, tests passed unmodified. _Shipped in PR #7 (Sonnet, diagnostic reviewed+approved by Fable, TDZ hardening added in review)._
- [x] **CI incident (post-#6):** two "passes-locally, fails-on-Linux" bugs — Windows-generated lockfile missing Linux-only optional deps (broke `npm ci` on CI AND Cloudflare deploys), and a Node-20 `navigator` crash in the test stub. Fixed in PR #9 (lockfile regenerated from scratch; `vi.stubGlobal`). **Standing policy going forward: agents install deps via `npm ci`; lockfile-changing installs require a from-scratch lockfile regen + clean `npm ci` verification; browser globals in tests via `vi.stubGlobal`.**

## Phase 3 — Close the feedback loop — ✅ COMPLETE 2026-07-10 (PR #8)
- [x] W9 · **IMPL**, then **REVIEW** · Weekly-stats view in the Log tab: `[Log|Stats]` toggle, 8-week cards (S&C/Fight split, S&C-only completeness avg, hip-score dots, day/phase coverage, honest empty weeks), 35 new unit tests. _Shipped in PR #8 (Sonnet, math reviewed by Fable); verified on-device by the developer._

## Phase 4 — UX feature work (one surgical change per session; any order within phase)
- [x] W10 · **IMPL**, then **REVIEW** · HUD visual hierarchy + collapsible bag-work and core/accessory blocks (auto-expand when logged). Diagnostic-first — HUD is the largest, most-used component. → `prompts/W10-hud-hierarchy.md` _Shipped in PRs #21 + #23 (Sonnet; reviewed by Fable), 2026-07-17 — the W10.1 follow-up extended collapse to all HUD blocks (mob/str/clr default open)._
- [ ] W11 · **IMPL** · Playbook tab overhaul: collapse/group by phase→day→block. ⚠️ _Per the W19 proposal, this is absorbed into the Playbook rebuild inside the Train hub — run AFTER W20, using a revised prompt; the standalone `prompts/W11-playbook-overhaul.md` is superseded pending W19 sign-off._
- [ ] W12 · **IMPL**, then **REVIEW** · Reusable exercise picker: save custom core/accessory/cooldown exercises once, pick from dropdown after (new Dexie store — schema version bump, handle with care). → `prompts/W12-exercise-picker.md`
- [ ] W13 · **IMPL** · Mobility upgrades: per-exercise YouTube link (opens new tab) + Settings-level injury/mobility profile with a global toggle to hide the mobility block. → `prompts/W13-mobility-profile.md`
- [ ] W14 · **FAST** · Phase lock/unlock signaling: make the existing unlock logic legible in the UI (what unlocks next, why, how close). No logic changes. → `prompts/W14-phase-signaling.md`
- [ ] W15 · **IMPL** · Timers page: drag-and-drop reordering of stopwatch/rest-timer blocks, order persisted in settings. → `prompts/W15-timer-reorder.md`
- [x] W16 · **IMPL**, then **REVIEW** · Day-7 cycle extension (re-scoped per D2 ruling): keep sequential day counting, extend the cycle 6→7 with Day 7 as an optional/custom gym day (cardio/mobility/free-form notes — `FightGymDay.jsx` already supports these session types). Diagnostic-first. → `prompts/W16-next-day-semantics.md` (rewritten 2026-07-10) _Shipped in PR #18 (Sonnet; reviewed by Fable), 2026-07-17._
- [x] W17 · **IMPL**, then **REVIEW** · ⛔ gated on **D1** · Delete semantics rework (only if D1 = soft delete): webhook.gs v3 with status column + local tombstone. The one item where the "do not touch webhooks" guardrail is deliberately lifted. → `prompts/W17-soft-delete.md` _Shipped in PR #22 (Sonnet; reviewed by Fable), 2026-07-17 — final design: Status column only (col 66/BN), NO local tombstone (local hard delete ratified); Apps Script v3 redeployed + verified on-device._

## Phase 4.5 — Navigation redesign (per decision D3; see `W19-NAV-IA-PROPOSAL.md`)
- [x] W19 · **ARCH** · Nav-IA redesign proposal written (Fable, 2026-07-10) and **SIGNED OFF same day (evening)** — rulings in the proposal's §6, informed by live study of the TRW native Android app (`docs/reference/therealworld-app-references/android-app-observations.md`). Final shape: 5 hubs **Train / Timer / Log / Checklist / Settings**; Playbook moves inside Train; **slot 4 = Checklist hub** (habit-tracker; Notes deferred); pinned quick-add input instead of a FAB; streaks in v1.
- [x] W20 · **IMPL**, then **REVIEW** · Nav shell restructure shipped (PR #13, 2026-07-10): shared TopTabs component, Playbook → Train top tab, Checklist placeholder in slot 4. → `prompts/W20-nav-shell.md`
- [x] W21 · **IMPL**, then **REVIEW** · Checklist hub v1 shipped (PR #14, 2026-07-11): groups, daily-recurring tasks, derived streaks, pinned quick-add, bottom-sheet actions, shared BottomSheet primitive, Dexie v2 (additive, upgrade-tested), connector-ready `exportChecklist()`. → `prompts/W21-checklist-hub.md`
- [x] W22 · **IMPL**, then **REVIEW** · Checklist v1.1 polish shipped (PR #15, 2026-07-12): group `…` action sheet (all `prompt()` removed), configurable reset time + "RESETS IN" countdown, Share→JSON export, Import→paste-text. → `prompts/W22-checklist-polish.md`
- [x] W23.5 · **IMPL** (small) · **Runs BEFORE W23** · Data durability quickwin (2026-07-12 dialogue ruling: NO new Sheets tabs/Apps Script — Sheets stays the append-only workout log; Supabase is the eventual backend; the backup JSON doubles as its migration seed): `navigator.storage.persist()` + Settings "Export full backup" (dynamic `db.tables`, share/download) + "last backup" hint. Export-only; restore is Supabase-era. → `prompts/W23.5-data-durability.md`
- [x] W23 · **IMPL**, then **REVIEW** · ⛔ gated on W23.5 · Notes v1 as the second top tab in the Checklist hub (D4, re-ruled 2026-07-12 after the brainstorm dialogue — `docs/reference/checklist-ideas/brainstorm-summary.md`): groups, plain-text notes with tappable `- [ ]` inline checklists, **tags + pin (5-star retired)**, on-demand daily note on the logical day with an EDITABLE template, substring search, quick capture, Dexie v3 additive, `exportNotes()`. Ruled OUT: rich text, backlinks/graph, per-note themes, Initiatives surfaces, media. → `prompts/W23-notes-hub.md`
- [x] W24 · **IMPL** (small) · Counted tasks — gate opened + re-scoped 2026-07-17 (D8, usage validation): the standalone Tracking system is DEFERRED; instead, an optional +1 tally on existing checklist tasks (`counted` flag + `count` on completions, both non-indexed → no Dexie bump; streaks unchanged by construction; local-only). → `prompts/W24-counted-tasks.md` _Shipped in PRs #29 + #30 (Fable direct, diagnostic approved by developer), 2026-07-18 — verified on-device same day; the day-one strikethrough bug on counted rows was caught by real use and fixed in #30._
- [x] W25 · **IMPL** (tiny, parallel-safe) · Notes export button: `exportNotes()` (W23 deliverable) had no UI caller — wired a Share control into the Notes toolbar mirroring the checklist's Share (share-or-download path, delivered-vs-cancelled discipline). → `prompts/W25-notes-export.md` _Shipped in PR #32 (Sonnet, reviewed by coordinator), 2026-07-19 — verified on-device._
- [ ] W26 · **ARCH** · ⛔ gated on living with W24 counted tasks · Log hub redesign research: one proposal for surfacing BOTH data families in the Log hub — workout weeks (W9 cards) + checklist/habit streak data (+ counted-task counts, notes presence) on their two distinct day-axes (calendar vs logical). Includes a modern-apps reference pass; diagnostic/proposal only, with an explicit adopted/rejected list. Absorbs D8's deferred reduction-vs-growth target semantics. **Per-day tally history surfacing is a VALIDATED requirement** (2026-07-18: the developer's day-one W24 use showed the per-date data is already stored — the gap is visibility, not storage). → `prompts/W26-log-hub-research.md` (research brief written, PR #34, 2026-07-19; being run as a separate parallel research session — implementation plan follows the developer's rulings).
- [ ] W27 · **IMPL** · Phase logging integrity (Workout/HUD): fixes a real mislogging risk the developer hit after a gym change. Touch A gates the phase `<select>` (unearned phases disabled; new pure `highestUnlockedPhase`/`isPhaseSelectable` helpers in `phaseUnlock.js`, no-lockout-trap proven in tests); Touch B surfaces the phase that WILL be logged in the "Next up" box (`NEXT: PHASE n · DAY m`); Touch C a gentle stale-phase mismatch badge (last-logged ≠ selected). UI-only — logging path/webhook/Playbook untouched (Playbook stays browsable per W14). → `prompts/W27-phase-logging-integrity.md` _Built 2026-07-20 (Sonnet, reviewed by coordinator); PR open, awaiting merge + on-device check._

## Phase 5 — Gated / deferred (no prompts yet, on purpose)
- [ ] W28 · **candidate, unruled** · Data-layer phase guard (belt-and-suspenders follow-up to W27): reject an ineligible phase inside `logSession` (`db/index.jsx`) by comparing `sessionData.phase` against `highestUnlockedPhase(sessionCount)` before persisting, so even a direct Dexie/webhook write or a future bug can't record an unearned phase. Deliberately NOT bundled into W27 (UI-scoped) because it touches the logging path — near the frozen webhook contract (AGENTS.md rule 2), so it needs its own diagnostic. Also the natural home for self-healing a pre-W27 corrupted `currentPhase`. Decide whether the UI gate is sufficient before scoping.
- [x] W18 · **ARCH** · Custom Claude skills shipped at the 4-skill hard cap: `combatos-conventions` (PR #25), then `pwa-offline-first` + `mobile-interaction-ux` + `personal-analytics-viz` (PR #27, 2026-07-17), all in `.agents/skills/`, facts derived from live code. → `prompts/W18-custom-skills.md`
- [ ] ⛔ **Supabase migration** — gated on: research prompt 3 results (free-tier pausing), the 0.2 data review, and W9 proving what feedback matters. n8n keep-alive is the working theory for the pause guardrail; n8n stack itself is untouchable. Decision D7.
- [ ] ⛔ **Audio-ducking bug** — gated on research prompt 3 results (Android audio focus / Media Session API). Reproducible, documented, not urgent.
- [ ] ⛔ **Hermes connector** — the notepad half of D4 is now ACTIVE as W23 (Phase 4.5, re-ruled 2026-07-12: tags+pin replaced 5-star). The connector half stays deferred: `exportChecklist()`/`exportNotes()`/the W23.5 full backup are its designed inputs, wired up in the Supabase era or via Personal-OS, whichever comes first.
- [ ] ⛔ **Project B (Apex Protocol kickoff)** — downstream of this roadmap stabilizing, per STATUS.md. Sequencing lives in `docs/planning/CHECKLIST.md` Project B section.
- [ ] ⛔ **Sell-as-product** — parked by the developer; demand validation deliberately deferred. Nothing to do.

---

## Track A / Stage-2 — Train + Playbook cartridge rebuild (ACTIVE — main line since 2026-07-21)
The Train tab (incl. Playbook) becomes a universal player over a **cartridge** — one person's
program as JSON, per `docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md` (v2, block-composable).
Backend (Supabase) already live. Stage 0 (patch `playbook.csv`) skipped — the rebuild and the
gym-change fix are the same work (decisions 2026-07-21 #3/#4).

- [x] **A1 · Program Authoring Kit** (model-agnostic docs) — `docs/authoring/`: `INTAKE-SCHEMA.md`,
      `COACH-PROMPT.md`, `REVIEWER-CHECKLIST.md` (Part A structural / Part B coaching-sanity),
      `README.md`. Plain files so a future self-hosted model (Hermes) runs the same process with no
      rework. Built + proven on the developer's own program; updated to v2 (block model) doctrine
      once A4 landed. _2026-07-22._
- [x] **A2 · First cartridges** — `cartridges/combatos-foundation-2026.json` (Phase 1, 4-wk
      corrective/spine-friendly, run FIRST — developer under active chiropractic care) +
      `cartridges/combatos-operator-2026.json` (Phase 2, heavy strength). Periodization =
      cartridge-swap. Authored from `intake-developer-program.md`, validated. _2026-07-22._
- [x] **A3 · `validateCartridge()`** — `app/src/utils/validateCartridge.js` implements reviewer
      Part A; reworked alongside A4 for the block model (day.blocks[] → kind + items, kind-specific
      shape checks, optional per-item prescription). Tested (318 total suite tests incl. a
      permanent regression guard over every authored cartridge); W26-independent throughout. _2026-07-22._
- [x] **A4 · Block-composable cartridge schema v2** — reading a SECOND real program (Apex Protocol)
      surfaced that the v1 flat exercise list underserved both real users (Combat OS's own legacy
      `playbook.csv` already used a block taxonomy the fresh spec had dropped). Redesigned as
      `day.blocks[] → kind + items` (5 seed kinds: mobility/strength/conditioning/cooldown/core),
      hand-proven against Apex's richest day before touching code (`BLOCK-MODEL-DRAFT.md`), then
      promoted into `PROGRAM-CARTRIDGE-SPEC.md` v2. One composable engine, not two apps — a
      "segment" (combat vs. generalist) is a curated block-kind bundle + theme, not a fork.
      _2026-07-22._
- [x] **A5 · Apex cartridge** (2nd person) — `cartridges/apex-protocol-phase1.json`, adapted from
      his existing `playbook.csv`: 4 training days, all 5 block kinds, PAP pairing, round-structured
      bag work, 49 items. The stress test that proved A4 before promotion. Not yet assigned to his
      Supabase profile (assignment mechanism doesn't exist yet). _2026-07-22._
- [x] **A6 · Cartridge Viewer (read-only render path)** — new "Cartridges" tab in the Train hub;
      browses all 3 real cartridges with a renderer per block kind. Read-only, zero touch to
      HUD.jsx/db/webhook — needs nothing from the payload-shape gate below. **Shipped, merged, LIVE
      in production** — first real on-device review done. _2026-07-22._
- [ ] **A7 · Interactive (logging) renderer** — the half of A6 that WRITES a session from a
      cartridge; inline per-session exercise substitution (decision 2026-07-21 #2). ⛔ gated on the
      payload-shape lock below.
- [ ] **A8 · Cartridge Viewer UX/UI pass** — from first on-device review: description text
      readability + copy quality, collapsible exercise blocks, section-header visual redesign
      (reads "dated/noisy" to a new user).
- [ ] **A9 · Cartridge tagging + select/activate** — group cartridges by category as the library
      grows (e.g. `25`, `ufcgymd1`; `em`/`fulltransformation` to clarify) + a real way to pick which
      cartridge is "active" (browse-only today).
- [ ] **A10 · Train hub discoverability** — the 3 top tabs aren't obvious to a new user at first
      glance; needs a real UX solution.
- [ ] **Lock logging payload shape** (per-session vs per-set; carry prescribed+performed+substituted)
      — open, gated on W26; blocks A7 only — A6 is unaffected and already live.

**Also queued, separate & bigger scope (not a Track A item):** Playbook + Log tab full UX/UI
redesign — dark/light mode, color system, best-in-class UX bar. Own design session; see
`docs/handoff.md` Pending.

New decision this track: **D10** (cartridge weekly structure = pool of day-templates + suggested
order, not a fixed rotation; overlaps D9) — see OPEN-DECISIONS.md.

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
