# Deliverable 4 — Open Decisions (yours, not mine)
_Each of these has more than one reasonable answer. Where the code has already picked one by default, that's noted — a default is not a decision until you ratify it._

> **2026-07-10 — DEVELOPER RULINGS RECORDED.** The original seven decisions (D1–D7) were answered in the same session. Each section below carries a **RULED:** line. Roadmap impacts are listed in the addendum at the bottom of `ROADMAP.md`. Later decisions (D8–D10) were added as the work uncovered them: **D8, D9, and D10 are ruled.**

## Status index
_Quick reference for current decision status. Each section's **RULED:** / **Not ruled** line records the decision itself; its surrounding "current state," context and options are historical snapshots from when that decision was captured and may not describe today's implementation._

| Decision | Topic | Status |
|----------|-------|--------|
| D1 | Delete semantics (hard vs soft) | **Ruled** — soft delete (W17) |
| D2 | "Next day" semantics | **Ruled** — sequential + Day 7 |
| D3 | Navigation IA | **Ruled** — layered-nav paradigm |
| D4 | Notepad/capture + Hermes connector | **Ruled** — build notepad; connector deferred |
| D5 | Planning layer visible on GitHub | **Ruled** — move durable docs into tracked tree |
| D6 | Recover vs regenerate README/AGENTS/ARCHITECTURE | **Ruled** — regenerate fresh |
| D7 | Supabase migration | **Ruled** — go; now live in production |
| D8 | W24 tracking (standalone vs counted) | **Ruled** — counted tasks |
| D9 | Off-programme activity logging | **Ruled (2026-07-31)** — solved by the existing D10 custom-day mechanism; no new machinery |
| D10 | Cartridge weekly structure | **Ruled** — flexible pool + suggested order |
| D11 | A7 permanent cartridge-session payload lock | **Ruled (revised, corrective pass)** — versioned `blocks[]` payload with `sessionActivities`, strength/core-only completeness |
| D12 | A7 multi-phase cartridge execution | **OPEN — not yet ruled** |
| D13 | Checklist/Notes owner-scoping for a unified/cross-device Log view | **OPEN — not yet ruled** |

## D1 — Delete Last Logged Day: hard vs. soft delete
**Current state (shipped, by default not by decision):** hard delete on both ends — local Dexie record removed, `webhook.gs` removes the Sheet row entirely (`deleteRow`, with a code comment justifying it as avoiding formatting-inheritance bugs). The commit message and webhook header both *say* soft/strikethrough, which is wrong.
**Options:** (a) Ratify hard delete — simplest, matches "undo a mistake" intent; you lose the audit trail. (b) Adopt Apex's soft delete — status column set to CANCELLED, row kept; costs a webhook.gs redeploy (W17) and a schema column. Soft matters more if the Sheet is a long-term record you'll analyze (see 0.2) or if Supabase migration will want clean history.
**Blocks:** W17 only.
**RULED (2026-07-10): Option B — soft delete.** W17 is now ungated and active. Webhook.gs v3 + status column + local-tombstone question go through W17's diagnostic as written.

## D2 — "Next Day" semantics
**Current state (shipped, by default):** `(lastLoggedDay % 6) + 1` — counts every day including fight-gym days 2 and 4. The brief said this "cannot be a naive port" and must skip to the next *training* day — but fight-gym days ARE loggable sessions in CombatOS, so the naive wrap is defensible, not broken.
**The actual question:** when you finish Day 1, do you want the HUD to say "NEXT: DAY 2" (fight gym — current behavior, treats the plan as a strict 6-day sequence) or "NEXT: DAY 3" (next S&C day, treating fight-gym days as self-scheduling)?
**Blocks:** W16 only.
**RULED (2026-07-10): keep sequential counting — fight days count as days (current behavior ratified) — PLUS a scope addition:** extend the cycle to include a **Day 7**: an optional/custom gym day (cardio, mobility, whatever was done) with a free-text notes field describing what was done. This is bigger than the original W16: it changes the day structure (6→7), the wrap math, `usePlaybook` day synthesis, and possibly completeness/phase-unlock counting. W16 must be re-scoped as a diagnostic-first day-structure extension, not the "skip days" rework originally drafted.

## D3 — Navigation IA
**Corrected fact:** the nav has **5 tabs**, not 6 — one conventional slot is still free. The question is what earns it (or whether nothing does): weekly stats could live inside the existing Log tab (W9 assumes this — zero nav cost); a future notepad/capture surface (D4) would be the strongest claimant for slot 6; Playbook could merge into HUD to free another slot if ever needed.
**Recommendation embedded in the roadmap:** W9 goes inside Log; slot 6 stays open until D4 resolves. Overrule if you want stats as a top-level tab.
**RULED (2026-07-10): open to a layered-nav redesign, guided by the TRW/Discord paradigm** documented in `docs/reference/therealworld-app-references/mobile_app_architecture_spec.md` (max-5 bottom hubs → swipeable top tabs within a hub → bottom sheets for actions, FAB for the primary action, accordions for lists). 6 flat tabs was tried before and felt cluttered. This does NOT green-light an immediate rebuild: it creates a new ARCH-tier design item (nav-IA redesign proposal) that must land BEFORE the notepad (D4) gets a surface, and it reframes W10/W11 as candidates for absorption into the redesign rather than standalone tweaks. Adopt the paradigm, keep CombatOS's tactical-amber identity (the spec's navy/gold palette describes the reference platform, not a requirement — flag if unsure).
**CLARIFIED (2026-07-10): confirmed explicitly — take navigation/interaction PARADIGMS from the TRW specs (layered hubs, top tabs, bottom sheets, FAB, accordions), NOT the styling.** No copying of palettes or visual identity; CombatOS keeps and develops its own unique high-level design language. What exactly gets adopted vs. left is a stated output of the nav-IA redesign proposal (the new ARCH item) — it must include an explicit "adopted / rejected" list against the specs.
**SIGNED OFF (2026-07-10 evening): the W19 proposal's §5 decisions are ruled — see `W19-NAV-IA-PROPOSAL.md` §6.** Playbook→Train approved; slot 4 = **CHECKLIST hub** (not Notes — changed after studying the live TRW Android app, `docs/reference/therealworld-app-references/android-app-observations.md`); pinned quick-add input supersedes the FAB; streaks in v1. W20/W21 prompts written; W20 ungated.

## D4 — Notepad/capture + Hermes connector: build, park, or drop
Your own brief calls the habit/PM ideas "vague and not yet understood" and the capture→connector→Personal-OS theory unvalidated. Nothing else in the roadmap depends on it. Cheapest validation if you want one: capture notes in ANY existing tool routed to Personal-OS for two weeks; if the habit sticks, the in-app surface earns its nav slot.
**Blocks:** the Phase 5 connector item only.
**RULED (2026-07-10): build a notepad / idea-organizer — no longer vague.** Concrete shape: notes grouped into folders; folders renamable/editable/taggable; 5-star importance rating; longer-term ambition of lightweight node-connectors between notes (Miro-like, but solo-dev scale). Output should be structured so Personal-OS can consume it later. The Hermes connector comes LATER under its own dedicated tab — not now, but the notepad's data layer should be designed so a webhook/export integration bolts on without rework. `docs/reference/therealworld-app-references/checklist_ui_specification.md` (group cards, task rows, recurrence/streak metadata, JSON data model) is the closest UI/data reference. Gated behind the D3 nav-redesign proposal, which decides where this surface lives.
**RE-SEQUENCED (2026-07-10 evening, W19 sign-off):** the nav slot D4 was expected to claim went to the **Checklist hub** instead (developer's call — no genuine reference app exists for the notepad/PM tool, and the checklist is closer to the daily loop). The notepad is **deferred, not dropped**: shape above unchanged; it will land either as a second top tab in the Checklist hub or behind a TRW-style "More" overflow, decided when it's actually built — same treatment as the future Hermes integration.

## D5 — Should the planning layer be visible on GitHub?
**Original state (pre-reorg):** `.gitignore` excluded ALL of `dev_files/` — CHECKLIST.md, backport kits, priming prompts, and this roadmap existed only on this machine. That directly conflicted with the intended workflow ("architect writes plans into GitHub issues; workers execute"), and meant a lost laptop lost the plan.
**Options:** (a) Move durable planning docs (CHECKLIST, roadmap, prompts) into tracked `docs/planning/`, keep only scratch ignored. (b) Keep files local and make GitHub issues the canonical plan (requires actually creating the issues). (c) Status quo — fine only while you're the sole worker on this machine.
**Feeds:** W6 (reorg diagnostic) will propose a concrete layout; this decision picks the principle.
**RULED (2026-07-10): yes — move files to where they belong**, including within the local tree. W6 proceeds with a mandate to propose real moves, not just a report. Live example already found: the two TRW spec docs sat in `dev_files/therealworld-app-references/` while the developer believed they were in `docs/` — durable references belong somewhere findable and (per this ruling) tracked. **Executed:** see `docs/planning/roadmap/W06-REORG-REPORT.md` for the completed move; the specs now live at `docs/reference/therealworld-app-references/`.

## D6 — README/AGENTS/ARCHITECTURE + GitHub starter kit: recover or regenerate?
Both were reported "drafted/created" but neither exists in the repo. If the drafts exist somewhere (Cowork session, another machine), recovering them is cheaper and preserves your intent; if not, W4/W5 regenerate from the live repo. Five minutes of looking before running W4/W5 is worth it.
**RULED (2026-07-10): they were never created.** No recovery step — W4 and W5 generate everything fresh from the live repo. The "find drafts first" instruction in both prompts is void; skip straight to the agent prompt.

## D7 — Supabase migration: go/no-go and when
Explicitly deferred by the roadmap until (1) you've actually looked at the Sheet data (0.2), (2) research prompt 3 answers the free-tier pausing question, (3) W9 shows what feedback you actually use. The migration is real but is currently a solution ahead of its evidence. No action now — just don't let it jump the queue.
**RULED (2026-07-10): leaning go** — given the scope now on the table (notepad data layer, day-structure extension, future Hermes connector), a real backend probably becomes necessary. Developer can create the Supabase project and hold env keys locally at any point. Still gated behind the three conditions above; the gates stand, the direction is noted.

## D8 — W24 Tracking: standalone system vs. counted tasks
**Context (2026-07-17):** the W24 gate ("living with Notes") was evaluated against 5 days of real
usage plus the developer's checklist export. Evidence: all Checklist/Notes features in honest
daily use and staying; **zero organic tracking workarounds appeared** (no counts written as text
anywhere — the strongest available signal); the developer's own first tracker-shaped task
("Tracking Money") was created 07-11 and deleted 07-16; the want-to-track list (water, sleep,
wake time, weight, time wasted, gym/commute time, outreach, "list goes on") is aspirational
breadth of exactly the kind that populates tracker graveyards, and most items fail the ~2-tap
mid-day friction test (they're end-of-day estimations, already served by the daily note).
**Options:** (a) build the brainstorm's standalone Track system (items/occurrences/quantities,
own surface, stats); (b) minimal shape — optional +1 tally on existing checklist tasks, no new
tables/tab/webhook; (c) drop tracking entirely.
**RULED (2026-07-17): Option B — counted tasks.** W24 re-scoped accordingly
(`prompts/W24-counted-tasks.md`); the standalone Track system is **deferred, not dropped** —
revisit only if counted tasks see heavy sustained use. Reduction-vs-growth target semantics
(pouches-down vs pages-up) are deferred with it, to the stats era (W26 Log-hub redesign), since
direction only pays off where numbers are judged. Also re-affirmed in the same session: the
"export checklist/notes to a new Sheets tab" idea stays RULED OUT under the 2026-07-12 data
policy (Sheets = append-only workout log; Supabase D7 is the mutable-data destination; the
full-backup JSON is its seed).

## D9 — Off-programme activity logging (OPEN — not yet ruled)
**Context:** developer idea captured in the app's own "App improvements" checklist group
(2026-07-17): some days include real physical activity outside the 7-day programme (any sport,
ad-hoc sessions); today those days look like rest in the Log, skewing the picture. Day 7
(optional/custom gym day) partially covers this, but only as the day the cycle assigns.
**The actual question:** should off-programme activity be loggable, and if so where does it
live — (a) a session-type/toggle inside the existing day structure (touches `sessions` shape
and possibly the frozen webhook row layout — expensive, needs its own W-item with the
AGENTS.md rule-2 restriction explicitly lifted); (b) a counted task ("Workout" habit already
exists in the developer's Daily Habits) + a note, i.e. zero new machinery, surfaced later by
W26's unified Log view; (c) not worth modeling — the Sheet stays a programme log, period.
**Blocks:** nothing. Candidate input to W26's proposal rather than a standalone build.
**RULED (2026-07-31): solved by the existing custom-day mechanism — no new machinery.** D10
already made cartridge days a flexible pool loggable on any date, with a category picker on
custom days — that is Option B's "counted task/note, surfaced by the Log hub" path, now shipped as
the Log hub's History + Overview rebuild (PRs #65–#68). The one true remaining gap — an activity
that matches no day template at all — is narrow and needs a logging-path change, so it stays
deferred rather than built. Full reasoning in `docs/decision_log.md`'s 2026-07-31 "Log hub
rebuilt" entry.

## D10 — Cartridge weekly structure: fixed rotation vs flexible pool
**Context (2026-07-22):** authoring the first real cartridge (developer's own UFC-Gym programme)
surfaced that the spec's fixed numbered day-rotation (`days[]` = 1..dayCount, advance N→N+1) does
not match real usage. The developer's week is a **default of 3 S&C + 3 fight + 1 pick**, but weeks
genuinely reshuffle (2 S&C + 4 fight, or life-driven reordering) and he still wants to log whatever
he actually did on any given date.
**The actual question:** does a cartridge lock the athlete to its numbered day order, or is that
order a suggestion?
**Options:** (a) fixed rotation (spec as written) — the HUD advances day N→N+1; simple but wrong
for a flexible sport schedule; (b) **pool of day-templates + suggested default order** — any
day-template is loggable on any date, off-plan sessions logged freely, the default order is just
the recommended next-up; (c) fully free-form, no default order — loses the guidance value.
**Blocks:** the Stage-2 Train renderer (how it advances/selects days).
**RULED (2026-07-22): Option B.** No schema change — reuses the existing day `type` field; this is
a renderer/UX behavior (let the athlete pick which day-template to log, defaulting to the suggested
next one). **Overlaps D9** (off-programme logging) — the flexible-logging surface should serve both.
Cartridge `combatos-operator-2026` is authored on this assumption (7-day default order, S&C and
fight interleaved).

## D11 — A7 permanent cartridge-session payload lock (revised, corrective pass)
**Context (2026-07-27, first ruling):** A7's diagnostic found no completed W26 research result
checked into the repo and none scheduled, while a small, specific set of questions (day identity,
session categories, prescribed/performed/substituted representation, per-set/per-round granularity,
legacy compatibility, last-performance recall) genuinely blocked locking the permanent cartridge
payload. A first implementation (Stage 0 + A7a + A7b) was built end-to-end in one session, without
stopping at its own required review gates, and was live-verified against the developer's real,
authenticated Supabase account — writing one real test session (Apex Protocol, Day 1) to
**production**. That work is unpushed and unmerged, preserved on the `attempt1/a7-*` branches.
**Context (2026-07-27, corrective pass):** a read-only Phase 0 review of that first attempt found
real defects (RPE/RIR-only sets silently dropped, a completeness denominator that counted
mobility/cooldown/conditioning, a validator that didn't enforce its own substitution/numeric-range/
nested-key invariants, a last-performance recall that could be masked by a newer empty record, an
inconsistent reader discriminator, a new browser `confirm()`, tiny tap targets, dead collapse
state, absent scroll restoration, hardcoded colors, anonymous PAP rows with no superset grouping)
and the developer supplied a further set of binding product rulings correcting the design. This
entry replaces the prior D11 ruling in full; the prior ruling's content is superseded, not deleted
from history (see the `attempt1/*` branches and `A7-FINAL-IMPLEMENTATION-PLAN.md`).
**Full detail:** `docs/reference/session-payload-schema.md` and
`docs/planning/roadmap/prompts/A7-CORRECTIVE-IMPLEMENTATION-PLAN.md`.
**RULED (2026-07-27, corrective):**
1. **Payload version is `payloadVersion: 2`, not `1`.** One real `payloadVersion: 1` row already
   reached production Supabase during the first attempt's verification and its removal is not
   confirmed. Reusing `1` for the corrected shape would let a future reader misinterpret that row.
   `payloadVersion: 1` becomes a permanently tolerated, read-only, never-written-again historical
   variant (schema doc §10); if that specific row is later confirmed removed, this ruling does not
   change — v2 stays v2.
2. **`sessionActivities`** (required array, closed 9-value ID set: `warmup`/`cooldown`/
   `weights`/`bag-workout`/`cardio`/`mobility`/`abs`/`corrective-exercises`/`other`) is a new
   required field on
   every `training`/`custom` cartridge session — `[]` is valid and distinct from the field being
   absent (legacy or pre-this-change rows: unknown, never coerced to "none selected").
   `otherActivity` (trimmed, single-line, ≤120 characters) exists only when `'other'` is selected
   and non-blank. *(Expanded 2026-07-30: `weights` added as an additive allowed-value expansion —
   8-value set becomes 9-value; no payload-structure change, no `payloadVersion` bump, historical
   rows remain valid and unchanged.)*
3. **Completeness counts only strength/core main sets and a prescribed PAP/pair's own sets.**
   Mobility, cooldown, and conditioning are excluded from the denominator entirely (reversing the
   first attempt, which counted all three). Extra performed sets beyond the prescribed count are
   retained in the payload but never inflate completeness past its cap. A conditioning-only or
   mobility-only day legitimately omits completeness.
4. **Mobility/cooldown/conditioning items keep prescribed guidance, substitution, and optional
   notes, but no completion tracking of any kind** — no checkbox, no rounds stepper, no
   `performed.done`/`performed.roundsCompleted` field. What happened on those blocks is recorded
   through `sessionActivities` plus free-text notes, not a per-item control.
5. **Today's save-state indicator reports local draft durability only** (`Saving…` / `Saved on
   device ✓` / `Not saved — Retry`) — no remote-sync signal is shown in the current session's UI.
6. **`FocusedNoteEditor` is controlled UI over the existing centralized draft persistence** — no
   second Dexie writer, no independent debounce/autosave chain. It updates the parent's controlled
   state synchronously on every input change; only `useWorkoutDraftPersistence` debounces
   persistence.
7. **Scroll state is exposed and kept continuously (throttled) current**, not just captured at
   flush time; collapse initialization is transition-safe (first-incomplete-block-open applies once
   at a fresh Start, never on remount, never overrides a manual toggle; Continue always honors the
   persisted collapse map verbatim).
8. **Strict nested payload validation and exact numeric ranges are locked now** (schema doc §5) —
   every nested object (item `prescribed`/`performed`, each `performed.sets[]`/`performed.pair.
   sets[]` entry) is validated against its own closed key set and numeric range, not just checked
   for being "an object."
9. **"Use Last Values" requires the same effective exercise** (today's substitution, if any, must
   match the recalled record's own substitution or prescribed identity) **and never copies beyond
   the current prescribed slot count**, even when history has more sets recorded.
10. **Superset member-count mismatches are communicated via header set counts** (e.g. "A1: 4 sets ·
    A2: 3 sets"), never an absent-round placeholder row.
11. **`AGENTS.md` is not modified.** Rule 2a's exception already reads "a new logged-session payload
    shape for cartridge-driven sessions, exactly as specified in
    `docs/reference/session-payload-schema.md`" — field-agnostic by design. Adding
    `sessionActivities`/`otherActivity` to the schema document is sufficient; enumerating individual
    field names in the rule itself would be redundant and would need re-editing on every future
    additive field.
12. **Branch topology:** the three first-attempt branches are preserved, renamed under `attempt1/`,
    kept until separately authorized for deletion — never rebased or force-rewritten.
13. **Sequencing:** Stage 0 (payload lock, this ruling) → A7a (pure payload builder, validation,
    analytics fields, draft persistence — no Today UI) → A7b (Today UI redesign) → A7c (later,
    separate: adopt `FocusedNoteEditor` app-wide). Each stage stops for independent review before
    the next begins — the first attempt's process failure (building all three stages in one
    session with no review checkpoint) must not repeat.
14. **Performed pair-set UI is reps-only (A7b corrective pass, approved during the
    reconciliation review).** The performed-value UI for a prescribed PAP/pair exposes a reps
    input only — the pair `kg` input is removed from `PerformedStrengthItem.jsx`. Pair inputs
    appear only for authored pair data (`item.pair` present); an item with no pair renders no
    pair/PAP cells at all, unchanged. This is a UI narrowing only: **no frozen payload-schema
    change** — `docs/reference/session-payload-schema.md` §5 still permits `performed.pair.
    sets[].kg` for reading, and existing readers (and any historically-logged pair `kg` value)
    continue to be tolerated verbatim. This ruling was previously implicit only in the corrective
    implementation plan's brief, not recorded here — recorded now so a future session cannot
    re-derive or second-guess the pair `kg` field's removal.
**Blocks:** A7 implementation. **Does not block:** A6, A9, A10 (already shipped and unaffected).

## D12 — A7 multi-phase cartridge execution (OPEN — not yet ruled)
**Context:** `cycle.blocks` (named phases) is currently presentation metadata only — no day in any
of the three shipped cartridges references a phase, and `validateCartridge` never inspects
`cycle.blocks` for content selection. A7 therefore defines Today's behavior only for zero phases
(no phase UI) and exactly one phase (a static, non-interactive context label). None of the three
real cartridges have two or more `cycle.blocks` entries, so this does not block shipping A7.
**The actual question:** if a future cartridge defines two or more phases, does each phase select
different day content, gate on a counter (like the legacy phase-unlock threshold), or something
else — and what does the payload's `phaseId` mean once more than one phase can apply to the same
day template?
**Options:** (a) design a phase-to-day-content mapping and a selection/unlock mechanism before any
multi-phase cartridge is authored; (b) treat multi-phase as permanently out of scope and let a
periodized program stay one-phase-per-cartridge (the pattern Foundation → Operator already uses);
(c) revisit only when a real multi-phase cartridge is actually authored.
**Blocks:** nothing today. A7 ships an explicit "not supported yet" state for `cycle.blocks.length
>= 2` rather than guessing; Plan and Library remain fully functional for such a cartridge.
**Not ruled — do not default silently.**

## D13 — Checklist/Notes owner-scoping for a unified/cross-device Log view (OPEN — not yet ruled)
**Context (2026-07-27):** A7's `sessionActivities` field makes workout sessions analytics-ready for
a future W26 Log-hub view. Checklist and Notes, however, remain device-local and
unauthenticated-to-any-account (`db/checklist.js`, `db/notes.js` carry no owner/user column at all,
unlike `workoutDrafts`' `[ownerUserId+slot]` key or Supabase `sessions.user_id`). A unified Log view
that wants to show workout completeness alongside checklist/habit streaks — as W26's own research
brief anticipates — cannot do so across devices or for more than one account on a shared device
until Checklist/Notes gain some owner-scoping and/or sync story.
**The actual question:** should Checklist/Notes eventually move to Supabase (owner-scoped, synced,
matching `workoutDrafts`/`sessions`), stay device-local forever with only a single-device Log view
supported, or something in between (e.g., export/import without live sync)?
**Options:** (a) migrate Checklist/Notes to Supabase with owner scoping, matching the workout-data
model; (b) keep them device-local permanently and scope any unified Log view to "this device only,"
documented as such; (c) defer the decision entirely until W26 actually needs to answer it.
**Blocks:** nothing today — A7 does not implement any Log-hub UI. This is recorded now because it
was surfaced while designing A7's analytics-readiness plan, not because A7 needs it answered.
**Not ruled — do not default silently.** See
`docs/planning/roadmap/prompts/W26-log-hub-research.md` for where this must be picked back up.
