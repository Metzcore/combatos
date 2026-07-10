# CombatOS — Brainstorm Brief for Architect-Tier Review (v2)

**Purpose of this document:** Raw, structured input from the app's sole developer/user, compiled to give an architect-tier model everything needed to think clearly about next steps — **without** pre-deciding implementation. Where a direction is implied, it's marked as a working theory, not a decision. Open questions are marked explicitly and should be treated as genuinely open.

**This supersedes v1.** Substantial new context surfaced after v1 was written — a companion document exists (`combatos-backport-context-pack.md`) with the raw historical material this brief draws conclusions from. Read that too; this brief states what we now know, the context pack shows the trail that got us there and is explicitly marked as historical signal, not spec.

The developer is a vibe-coder actively leveling up toward junior-developer practices (git workflow, tests, CI/CD), working across Antigravity IDE, Claude Code, and Cowork, with a multi-model worker pool available.

---

## 0. Current Technical Snapshot

Verified directly from the repository (`github.com/Metzcore/combatos`):

- **Stack:** React 18 + Vite, `vite-plugin-pwa` (installable PWA, installed on an Android phone), `dexie` (IndexedDB) for local storage, `papaparse` for CSV handling. Fully client-side, no backend.
- **Deploy:** Cloudflare Pages (`app/public/_headers`).
- **Workout math model:** `%1RM / e1RM` — do not remove or alter this without explicit instruction; it's load-bearing for how sessions are logged and interpreted.
- **Data pipeline:** `playbook.csv` is the source of truth → `scripts/csv_to_js.py` compiles it into `src/data/playbook.js` (generated, checked into source, never hand-edit). `scripts/audit_playbook.py` is a live dev utility that sanity-checks the CSV (missing Phase/Day combos, exercise-variant coverage) before compilation — run it before touching the CSV.
- **Sync architecture:** local Dexie tables are `sessions` (source of truth), `syncQueue` (pending pushes, with retry `attempts`), and `settings` (incl. `currentPhase`, `webhookUrl`). Sessions push via a queued webhook to `scripts/webhook.gs` (Google Apps Script, "v2"), which writes to the `FightLog` tab of a Google Sheet. **`app/src/sync/` exists but is empty** — `webhook.gs`'s own comments already name `src/sync/syncQueue.js` as the intended home for this logic, meaning a refactor was planned and started but never finished. Treat this as a real, half-done target, not abandoned scaffolding.
- **The data has never been reviewed.** Months of granular session data (kg/reps/phase/hip-score/completeness%) exist in the Sheet, and the developer has never opened it. This is a genuine feedback-loop gap, not just a backend question — relevant to any Supabase migration discussion (see Section 6).
- **Key components:** `AppShell`, `HUD` (largest, most-used, most-in-need-of-work), `PlaybookViewer` (stale), `RoundsTimer`, `BasicTimer`, `Timer`, `BagBlock`, `CoreBlock`, `CooldownBlock`, `MobilityBlock`, `StrengthBlock`, `FightGymDay`, `Calendar`, `Settings`, `BottomNav`, `DailyIgnition`, `PhaseUnlockBanner`, `CompletenessBar`.
- **Bottom nav is at capacity:** 6 tabs already in use — no resolution yet on how new surfaces fit.
- **Tooling already connected:** a GitHub connector is wired into the IDE. A `mcps/` folder locally holds cached tool schemas for GitHub, Google Calendar, and a task service, confirming this isn't aspirational.
- **Legacy lineage identified:** `fighters-os.gs` (v1.0, pure Apps Script, builds a spreadsheet HUD from scratch) → `build_sheet.py` + `fighters-os.xlsx` + `fighters-os-lite.gs` (a Python-generated styled sheet with a lighter Apps Script layer) → the current live system (React PWA + `webhook.gs` v2). The first two are fully superseded. Duplicate copies of `fighters-os.gs`/`fighters-os-lite.gs` exist at repo root and inside `scripts/` — byte-identical, safe to consolidate.
- **Documentation now exists** (created since v1 of this brief): `README.md`, `AGENTS.md` (agent operating rules), `ARCHITECTURE.md` at repo root. `.gitignore` has been corrected (personal scratch files excluded, stray `build_error.log` addressed).
- **Session-continuity system is live**: two skills, `combatos-sunshine` (session open, reads `STATUS.md` / `docs/handoff.md` / `docs/decision_log.md`, treats their contents as signal to verify against the user's stated goal, not as unquestioned spec) and `combatos-goodnight` (session close, updates the same three files), installed at `.agents/skills/` in this repo. `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md` now exist and are the current session-tracking layer. `CHECKLIST.md` remains the longer-arc, project-level sequencing document (Project A / Project B) and is explicitly **not** touched by these skills.

---

## 1. Core Identity

CombatOS is a **fitness + combat tracker** and **also a daily-use tool** (quick notes, checklists) — but it is explicitly **not** meant to become a general life-admin hub.

**Apex Protocol, clarified:** Apex Protocol is a real, actively-developed sibling app — CombatOS repurposed for the developer's brother, deliberately broadened for "more of a catch-all type of person" rather than staying this-developer-specific. It has its own component set (`ApexTab.jsx`, `RpeTag.jsx`, `ExerciseBlock.jsx`, `useApexPlaybook`), stores its workout plan as JSON rather than CSV (a real architectural divergence from CombatOS, not just a skin), and already has built-out nutrition/cooking content. **This is also where the "maybe I could sell this" idea originated** — building a broader version for a real second user made the idea concrete. It is explicitly *not* the same fork as "sell CombatOS to strangers"; see Section 8.

**Content boundary, explicit:** the "Apex tab" and its sub-components (Maintenance, Regla Cero, etc.) are fitness-philosophy content written for the brother specifically — they are NOT to be imported into CombatOS. This is a hard boundary, not a style preference.

The developer already runs a separate system for personal life-admin: a **Personal-OS** built as Cowork plugins (calendar, finance, project/initiative tracking, weekly review), backed by a self-hosted **n8n** instance and a self-hosted **Hermes** agent (Nous Research, open source) on a Hetzner VPS. This infrastructure is confirmed live — not hypothetical (see Section 3).

Working theory (not finalized): **CombatOS is the capture point, an optional connector is the handoff, Personal-OS is the processor.** See Section 8 for the tension this creates.

---

## 2. Tracking Scope

**Core, always visible:**
- Strength & conditioning sessions: lifts, sets, reps, weight (`%1RM/e1RM` model)
- Combat/bag-work sessions
- Phase/day progression, hip score
- Session completeness %

**Optional, hideable extras:**
- Body fat %
- Sleep
- Nutrition / meal timing / calorie intake — note that Apex Protocol already has real nutrition/cooking content built for a different purpose (coaching the brother); it exists, is not automatically appropriate to reuse verbatim in CombatOS, but is worth knowing about rather than starting from zero if this is ever pursued.

**The feedback-loop gap (see Section 0):** logged data is currently never surfaced back to the user in any form. Any backend migration (Section 6) is an opportunity to close this, not just move the storage layer.

---

## 3. Personal Integration Layer

A **single connector point** in the app — not deep integration — intended as the "tailored to this specific developer" layer, distinct from the sellable core product.

**Infrastructure confirmed live, not hypothetical:** self-hosted n8n at a stable domain (production automation, live 6+ weeks) and a self-hosted Hermes agent reachable via Telegram and a private dashboard. **Hard rule carried over from the infrastructure's own runbook: never disrupt the n8n stack** (no rebuild/down) — any integration work must treat it as a fixed, protected dependency.

Purpose of the connector:
- Keeps CombatOS's core data model clean and product-agnostic
- Acts as a security boundary — no other install touches this developer's VPS/Hermes/n8n stack
- Optional by construction
- Intended use case: notes captured in CombatOS about Personal-OS initiatives, picked up by Hermes and routed into Personal-OS

---

## 4. Workout-Tracking Improvements

- **AI-assisted exercise substitution:** natural-language query routed through the Hermes connector — e.g. "check Thursday, phase 2, day 3, find exercise X, give me 3 alternatives." Requires workout data exposed in an agent-queryable way.
- General ability to easily edit workout logic / swap exercises directly, not just via AI.
- **"Next Day" indicator — already scoped, partially specified:** a banner in the HUD (e.g. "▶ NEXT: DAY 3"), derived from the last logged session. Apex Protocol's version does a naive `lastLoggedDay + 1` wrap. **CombatOS's day structure is more complex** — it mixes actual training days with non-training days (fight-gym, rest, recovery) — so the CombatOS version cannot be a naive port; it needs to skip to the next real *training* day. This needs the day-plan data model understood in detail before implementation (see the context pack's diagnostic prompt for the specific questions already identified).
- **Phase lock/unlock clarity:** phases lock/unlock based on tracked history; the logic isn't legible in the UI. Wants better signaling, not full instructions.
- **Reusable exercise picker:** save a custom exercise once (core/accessories, cooldown/stretches), select from a dropdown thereafter instead of retyping.
- **Mobility exercise video links:** attach a YouTube link per exercise, opening in a new tab.
- **Injury/mobility profile:** the mobility/injury-prep block should be toggle-able off entirely; injury/mobility needs set at the Settings level as a list-based profile (not exercise-level detail).
- **"Delete Last Logged Day" — already scoped, one open design fork:** an undo button in Settings that removes the local record and sends a delete payload to the webhook. **Open fork, not yet decided:** Apex Protocol's version does a *soft* delete (sets a status column to "CANCELLED," keeps the row for audit trail). CombatOS's current `webhook.gs` (v2) already handles an `action: 'delete'` payload, but does a *hard* delete (removes the row entirely). Whether to keep CombatOS's hard-delete or adopt Apex's soft-delete pattern is a real decision Fable 5 should surface explicitly, not silently pick.

---

## 5. UX / Quality Bar

**A visual/UI backport already exists, fully scoped and guardrailed, ready to execute** (full spec and reference files in the context pack): phase-based Timer colors (red/work, green/rest, grey/prep) with a pulsing "⚡ BELL IN Xs" indicator and color-shifting pause button; a "tactical amber" (`#E8A020`) palette replacing the current cyan; an explicit audio volume fix (`audioRef.current.volume = 1.0`); and iOS PWA meta tags for proper "Add to Home Screen" behavior. Explicit guardrails already defined: do not touch `%1RM`/e1RM logic, schemas, webhooks, or import any Apex-specific content (see Section 1).

Remaining UX items, not yet backed by an existing spec:

- **Timers page:** drag-and-drop reordering of the stopwatch/rest-timer blocks — user-controlled layout, currently fixed order.
- **Fight-log tab:** scope undefined; candidate idea is a weekly-stats view — connects directly to the feedback-loop gap in Section 2.
- **Playbook tab:** stale, needs a real UX overhaul — collapsing/grouping instead of the current flat layout.
- **HUD exercise blocks:** headings/subheadings need clearer visual hierarchy; superset/PAP blocks need a stronger visual treatment than current color-coding alone; bag-work and core/accessories blocks should be collapsible, auto-expanding only when something's actually logged.
- **Navigation bar capacity:** already at 6 tabs — open question on how new surfaces fit (merge Playbook into HUD? push into Settings?).
- **Known audio-ducking bug (separate from the volume fix above):** opening Spotify before CombatOS causes Spotify to duck when CombatOS's alarm plays; the reverse order doesn't duck CombatOS's alarm against Spotify. Order-dependent, asymmetric, reproducible.
- **Daily Ignition:** working well as-is — no changes wanted.

---

## 6. Housekeeping

**Already done since v1 of this brief:**
- `README.md`, `AGENTS.md`, `ARCHITECTURE.md` created and accurate as of this writing
- `.gitignore` corrected (personal scratch notes excluded properly)
- Session-continuity system (`sunshine`/`goodnight`) installed and verified working
- GitHub starter kit drafted: issue templates (bug/feature), PR template, a minimal CI build-check workflow (`npm run build` on push/PR) — drafted, not yet placed in the actual repo

**Drafted, not yet executed — needs sequencing into the roadmap:**
- Legacy spreadsheet system archive: `git mv` `fighters-os.gs`, `fighters-os-lite.gs`, `build_sheet.py`, `fighters-os.xlsx` into `archive/legacy-spreadsheet-system/`; remove the duplicate `.gs` files in `scripts/`. Exact commands already drafted in the context pack.
- A diagnostic-first local directory reorganization prompt exists (context pack) — proposes a target structure (docs/ folder for handoff.md/decision_log.md, archive/ for legacy files, clarified dev_files/ contents) but has not been run.
- Placing the GitHub starter kit files into the actual `.github/` folder.

**Not yet started:**
- No tests, no formal CI beyond the drafted build-check workflow.
- Google Sheets/Apps Script → Supabase migration: known constraint is Supabase free-tier projects pause after ~1 week of inactivity; daily use makes this unlikely to trigger, but a guardrail (scheduled keep-alive, plausibly via the existing n8n instance) is wanted regardless. This migration is the natural point to also close the feedback-loop gap (Section 0/2) with real in-app stats/charts.
- General performance pass — no specifics identified yet.
- Custom Claude skills for standardizing judgment across the multi-model worker pool: candidates are PWA/offline-first architecture, mobile interaction design & UX psychology, personal-analytics data visualization, and CombatOS-specific conventions. Not started — 3-4 skills max, deliberately not a large taxonomy.

**Multi-model orchestration setup:** developer has access via Antigravity IDE to Composer 2.5, Gemini 3.5 Flash (low/med/high), Gemini 3.1 Pro (low/high), Claude Sonnet 4.6 (thinking), Claude Opus 4.6 (thinking), and GPT-OSS 120B, plus an architect tier (Fable 5). Working split by tier, not finalized: architect writes plans into GitHub issues; a default implementer tier executes; a fast/cheap tier handles boilerplate; a review tier does pre-merge passes.

---

## 7. What's Genuinely Proven vs. What's Aspirational

Worth stating plainly, since the developer raised this directly: **`CHECKLIST.md` and other historical planning docs in the context pack are not commitments.** Project A (hardening: state-management fix, PWA/installability fix, HUD scroll restore, timer upgrade, Daily Ignition) is genuinely done, shipped, and verified — that part is fact. Anything marked pending or unchecked, anywhere in any historical doc, is a past intention that may no longer reflect current priorities. Treat it as a starting hypothesis to verify against the live repo and against what the developer says they want now, not as scope.

---

## 8. Open Forks — explicitly unresolved, not blocking

- **"Sell this as a product" ambition.** Originated from building Apex Protocol for a real second user (Section 1), not from CombatOS itself. The developer has explicitly identified their own bias here (built-it-for-myself-therefore-others-want-it) and has deliberately parked demand validation for later. Not a current requirement.
- **"Track my habits" / "some project management tool."** Explicitly described by the developer as vague and not yet understood by them. Closest concrete shape so far: a notepad for on-the-go capture + a checklist/task feature with daily rescheduling, timezone handling, editable title/description/emoji fields.
- **Tension between Section 1 (Core Identity) and the notepad/checklist/habit requests.** Working theory (capture → connector → Personal-OS, Section 3) is offered as a resolution but has not been validated or committed to.
- **Navigation bar IA.** No resolution yet on how new surfaces fit at 6-tab capacity.
- **Hard-delete vs. soft-delete** on the "Delete Last Logged Day" feature (Section 4) — needs an explicit decision, not a silent default.

---

## 9. Research Prompts (for external deep research — Gemini Deep Research / Perplexity, run by the developer, results brought back)

**Prompt 1 — Comparable app UX patterns**
> Research UX patterns used by strength-training and combat-sports workout-logging apps (both mainstream fitness apps and niche combat-sports-specific trackers). Focus specifically on: (1) how apps let users save and reuse custom exercises instead of retyping them each session, (2) collapsible/expandable workout block patterns for optional content (e.g. accessory work, bag work) that's only sometimes logged, (3) visual treatment of supersets or paired/grouped exercises so they don't get visually lost among regular sets, (4) UX patterns for reference/playbook-style content (technique libraries, combo lists) inside a workout app. Identify 3-5 concrete, named examples per point where possible.

**Prompt 2 — Exercise substitution taxonomy**
> Research frameworks for classifying strength and combat-conditioning exercises by movement pattern and muscle group equivalence, suitable for building a "suggest 3 alternatives for this exercise" substitution feature. Cover: existing taxonomies used in S&C coaching (e.g. push/pull/hinge/squat/carry/rotate pattern models), how equipment constraints (bodyweight vs. barbell vs. machine) factor into substitution logic, and any existing open-source or published exercise-database schemas that already encode this kind of equivalence data.

**Prompt 3 — Technical: Supabase free-tier behavior and PWA audio ducking**
> Research two independent technical topics. (1) Supabase free-tier project pausing behavior: exact inactivity threshold, what counts as "activity" for reset purposes, and reliable low-effort methods (e.g. scheduled pings, cron-triggered API calls) to prevent a project from pausing, suitable for being run from a self-hosted n8n instance. (2) PWA/mobile web audio-ducking behavior on Android: why an installed PWA's audio might get ducked by another app's audio when that app was opened second, but not when opened first — covering the Web Audio API, Media Session API, and Android's audio focus system, with any known workarounds for consistent behavior regardless of app launch order.

---

*End of brief. No implementation plan is included by design. Section 7 exists specifically so this document's own contents — and everything in the accompanying context pack — get the same scrutiny as any other historical material.*
