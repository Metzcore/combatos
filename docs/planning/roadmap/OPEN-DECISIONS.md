# Deliverable 4 — Open Decisions (yours, not mine)
_Each of these has more than one reasonable answer. Where the code has already picked one by default, that's noted — a default is not a decision until you ratify it._

> **2026-07-10 — DEVELOPER RULINGS RECORDED.** All seven decisions were answered in the same session. Each section below now carries a **RULED:** line. Roadmap impacts are listed in the addendum at the bottom of `ROADMAP.md`.

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
**Not ruled — do not default silently.**
