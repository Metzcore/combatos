# Decision Log

---

## 2026-07-22 (cont'd) · A9a cartridge access foundation live

**Context:** The developer approved the A9 diagnostic's `user_cartridges` model and selected
Foundation as the initial active program for the primary phone account.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Store coach-made-available programs in `user_cartridges`; keep `profiles.assigned_cartridge` as the one-active pointer | Supports several available programs without mixing account access into cartridge JSON |
| 2 | Availability is server-managed; users read only their own rows and may update only their active pointer | Prevents self-assignment and profile-role escalation while still allowing later user activation |
| 3 | Seed primary = both Combat OS/Foundation active; developer = all three/Foundation active; brother = Apex/Apex active | Matches the three real account purposes and gives the developer account full one-at-a-time rendering coverage |

**Implemented:** two live/reproducible migrations, initial assignments, composite active/available
constraint, explicit grants, RLS isolation checks, forbidden-action checks, and advisor rerun. No
Train UI or workout/logging code changed. Next A9 slice is A9b metadata.

---

## 2026-07-22 (cont'd) · Train experience and persistence direction ruled

**Context:** Documentation-only UX/planning session after reviewing the three current Train subtabs,
the Library wireframe, the live cartridge spec, the current in-memory workout state, and Supabase's
live `profiles`/`sessions` tables. No app code, database schema, build, or tests were changed.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Train's subtabs become **Today / Plan / Library**; the five-button main navigation does not grow | Today separates the sweaty-hands execution surface from programme understanding and programme choice |
| 2 | A user can have several coach-made-available cartridges but exactly one active; unassigned bundled cartridges are hidden, not private | Matches the first three users without pretending bundled JSON is secure; another user may legitimately try a different person's programme |
| 3 | Coach controls availability and may set active; v1 user may activate any available cartridge; no separate coach-lock system yet | Covers the real workflow with one active pointer and avoids speculative permissions/UI |
| 4 | Cross-cartridge journeys are part of the next shared cartridge-spec revision for future Checklist work, but are out of Train scope | Keeps the universal format extensible without turning the Train redesign into progression-system work |
| 5 | Unfinished workout drafts stay device-local initially; only deliberate completed logs sync to Supabase | Offline works as the primary path, saves are immediate, and half-finished form state does not create online conflict machinery |
| 6 | Durable draft persistence is **A6.5**, an explicit prerequisite to A7; draft shape remains separate from W26's permanent logged-session payload decision | The interactive renderer must not ship with close/reload data loss, but draft storage must not pre-decide analytics and logging contracts |
| 7 | Same-device account switching is unsupported | Removes multi-account draft merge/partition UI from v1; explicit sign-out still must not expose a previous draft |
| 8 | Ethical attention only: prompts, progress, and defaults must help the user train/recover; no artificial urgency, streak punishment, random rewards, or infinite feeds | The product may guide attention, but only toward user-chosen real-world benefit |
| 9 | Recommended additive metadata: `schemaVersion`, `cartridgeVersion`, short `summary`, normalized `tags`, and structured `requirements.equipment`; assignment/owner/active state stays in Supabase | These fields have a concrete renderer, compatibility, or equipment-fit use; identity and access are account state, not programme content |

**Next:** Claude should read `docs/planning/rebuild/TRAIN-EXPERIENCE-PLAN.md`, then run A9 as a
diagnostic only: proposed assignment table, permissions/RLS, migration, Library states, and exact
spec/validator updates. Stop for approval before code or database changes.

---

## 2026-07-22 (cont'd) · Cartridge Viewer UX pass + dev auth-bypass shipped

**Context:** Continuing the same 2026-07-22 thread (third sitting) after the on-device review
flagged the Cartridge Viewer as "dated/noisy." Closed that out, then unblocked local/agent testing
with a dev-only sign-in, then kicked off research for the next real feature.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Cartridge Viewer redesign: quiet block sub-headers (thin accent + colored label, not full-bleed fill) + collapse whole DAYS (not individual blocks) | Developer's explicit choice between offered options; kills the "stack of loud bars" while keeping a full 7-day week scannable on one screen |
| 2 | Cartridge description split (short user-facing summary vs. long author notes) deferred to ride along with A9's tagging/metadata spec bump, not done in the UX pass | Same file, same spec version bump — doing it twice would be wasted motion; the UX pass instead just collapses the existing description behind an "About this program" disclosure |
| 3 | Dev auth-bypass built as a THIRD option — password sign-in behind `import.meta.env.DEV`, reading creds from gitignored `.env.local` — rather than either candidate floated last session (long-lived local session; Gmail-MCP auto-click) | Real Supabase auth (so RLS/DB/sync behave correctly) without an email round-trip; verified via a prod-bundle grep that the whole path is stripped from production — magic-link-only stays true for real users |
| 4 | `docs/planning/CHECKLIST.md` → `archive/` move (left uncommitted-deliberate since 2026-07-10) committed now as its own tiny PR | Zero-risk, already-decided, disjoint from everything else in flight — no reason to keep carrying it as a loose end |

**Also this session:** a rate-limit scare during dev-user setup (magic link + manual Supabase user
creation both appeared to fail) turned out to be Supabase's free-tier email throttle, confirmed via
the project's own auth logs — no damage to the magic-link feature or to manual user creation.
Flagged a real (low-severity) security loose end: the dev password-login user was created with a
placeholder password, which is a live credential against the production Supabase Auth API, not just
the app's UI — needs rotating.

**Not done / deferred:** A9 (cartridge tagging + select/activate) — two research prompts sent out
(design/UX inspiration; DB-connected codebase/schema grounding) but no reports back yet, no plan
made. A10 (Train hub discoverability) only partially addressed (tab contrast, as a side effect).
Playbook/Log redesign; Checklist/Notes + n8n sync; interactive logging renderer (A7, gated on W26).

**To do next session:** read back both A9 research reports, turn into an implementation plan;
rotate the dev Supabase user's password.

---

## 2026-07-22 (cont'd) · Block model shipped live; first on-device UX review

**Context:** Continuing the same 2026-07-22 session. After promoting the block model to spec v2,
built and shipped a read-only Cartridge Viewer into the Train hub, verified via a temporary local
auth-bypass (App.jsx swap, reverted before commit — the real app has no dev auth bypass), then
reviewed live on the developer's phone after merge.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Cartridge Viewer ships as a THIRD, additive Train-hub tab, read-only, zero touch to HUD.jsx/db/webhook | Real live milestone today without touching the frozen logging contract or waiting on W26, which only blocks the interactive half |
| 2 | Cartridge JSON mirrored into `app/src/data/cartridges/` rather than imported across the Vite project root | Avoids relying on undocumented `fs.allow` dev-server behavior; same precedent as `playbook.csv` → `playbook.js` |
| 3 | On-device review treated as a hard stop before further renderer work — Cartridge Viewer UX/UI becomes its own session, not a tack-on | First real device feedback surfaced multiple real problems (dated/noisy header, unreadable description, no collapse, tab visibility) — worth solving deliberately |
| 4 | Cartridge tagging + a "select/activate" mechanism requested; deferred to the UX session | Good instinct for scale (Apex + future clients), not yet urgent enough to interrupt the UX pass |
| 5 | Playbook + Log tab redesign scoped as its OWN, bigger design session | Different altitude: colors, dark/light mode, best-in-class UX bar is a deliberate initiative, not a quick fix |
| 6 | Dev auth-bypass for automated browser testing: NOT built tonight; two candidates identified (local-only long-lived Supabase session vs. Gmail-MCP magic-link auto-click) | Auth-adjacent changes warrant explicit discussion first, even for the developer's own account |

**Also this session:** developer floated an **n8n scheduled workflow** (~every 3 days) to sync
Notes/Checklist data, which would double as the Supabase free-tier keep-alive — not scoped or
built. Spotted (not fixed): `PlaybookViewer.jsx` references undefined CSS vars `--red`/`--white`
(harmless fallback; real tokens are `--alert`/`--text`).

**Not done / deferred:** Cartridge Viewer UX/UI pass; cartridge tagging + activation; Train hub
discoverability; Playbook/Log redesign; dev auth-bypass; Checklist/Notes backend + n8n idea; the
interactive (logging) renderer (W26-gated); small housekeeping.

**To do next session:** developer reviews and suggests a model for the UX/UI work — likely the
smaller Cartridge Viewer polish before the bigger Playbook/Log redesign.

---

## 2026-07-22 · Track A/Stage-2 — Program Authoring Kit + first cartridges + cartridge validator

**Context:** First build session on the cartridge rebuild. Built the model-agnostic authoring
framework, proved it by authoring the developer's own two-phase program, and shipped the first
tested module of the rebuild. Design work on Opus 4.8 high (the fork moments); routine writing on
Sonnet 5 high.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Authoring kit = 3 portable markdown files (`INTAKE-SCHEMA` · `COACH-PROMPT` v1 · `REVIEWER-CHECKLIST`) + README in `docs/authoring/`, NOT a Claude skill or agent | Model-agnostic core is the single decision that lets a future self-hosted model (Hermes on the developer's VPS) run the same process with zero rework. A skill would be a thin wrapper LATER, once the manual process is proven; no agents (that's for code delegation) |
| 2 | Reviewer split into Part A (structural, deterministic → automatable) and Part B (coaching-sanity, LLM/human) | So automated onboarding later needs a model only for the judgment half; Part A lifts straight into code (done this session — #6) |
| 3 | A training program = an ordered SEQUENCE of cartridges (phases), swapped over time; the coach authors ONE phase and names the next | Periodization by cartridge-swap, not by editing one file. Surfaced naturally when the developer's post-chiro state needed a corrective phase before a strength phase |
| 4 | Prescription model for the developer = `rpe`/RIR | Autoregulates around sport fatigue without max testing; fits the stated longevity/sustainability ethos. Firm rec; developer deferred the science |
| 5 | Two cartridges authored: Foundation (Phase 1, 4-wk corrective, spine-friendly, run FIRST) → Operator (Phase 2, heavy strength) | Developer under active chiropractic care (cleared to train): a corrective block rebuilds the striking-neglected stabilisers (glutes, deep anti-movement core, cuff, mid/lower traps) while MAINTAINING strength at RPE 7–8 (you don't need RPE 9 to maintain). S&C supports the sport, doesn't duplicate the 3 fight days' conditioning; full-body ×3 for robustness to the flexible/missed-day schedule |
| 6 | `validateCartridge()` built now as the first rebuild module | Crisp contract (spec rules), immediate use (reviewer Part A made executable + guards the two real cartridges), and **W26-independent** — the one renderer-adjacent piece not blocked by the payload-shape gate |

**Also this session:** ruled **D10** (weekly structure = pool of day-templates + suggested order,
flexible off-plan logging; no schema change; overlaps D9) — in OPEN-DECISIONS.md. Equipment reality
corrected (no hip-thrust → single-leg glute machine; face-pull/cuff flagged as a personal weak
point). **Spec finding:** the five prescription models have no clean power/velocity axis — power
work encoded as far-from-failure (`rir`) + explicit cue, flagged as a known limitation in the coach
prompt. Cartridges will attach to the primary phone account once assignment is built.

**Not done / deferred:** the Train/Playbook renderer (A4 — logging half gated on W26); the Apex
cartridge (A5); the payload-shape lock; goodnight continuity close.

**To do next session:** the renderer's read/render path (W26-independent), or the Apex cartridge as
a second test of the kit; lock the payload shape when W26 lands.

---

## 2026-07-21 · Go-live (Supabase → production) + Track A/Stage-2 planning kickoff

**Context:** Second 07-21 session. Cut Supabase over to production (merge + operator config +
phone verify), shipped the free-tier keep-alive, then opened the Train-tab/cartridge rebuild and
ruled a batch of design decisions.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Go-live ordering is a hard rule: set Cloudflare Production env vars + Supabase redirect **before** the merge builds | Vite bakes `VITE_*` at build time; an env-less Production build renders a dead sign-in wall (`isSupabaseConfigured=false` → a `<SignIn/>` that can't send a link) — bricks the live app |
| 2 | Exercise substitution = **inline per-session override**; the log stores BOTH prescribed (cartridge) + performed (user edit) + a `substituted` flag; per-session only to start (sticky deferred) | Matches real gym UX; no exercise-library to build; captures truth for stats; the swap data seeds a future library. Resolves the exercise-swap fork with no engine |
| 3 | First cartridge = the developer's own new-gym program; **Stage 0 (patch `playbook.csv`) is skipped** | The gym-change fix and the rebuild become the SAME work; no investment in the transitional CSV format |
| 4 | **CSV Program Authoring Kit killed** as a durable deliverable | `playbook.csv` is transitional; the cartridge format supersedes it. Program *content* migrates; only the CSV wrapper is throwaway |
| 5 | Habit / "mental side" = a **checklist cartridge** (curated daily-reset bundles), extending the shipped Checklist hub — not a new system | The hub already has groups/streaks/reset-time (W21/W22); "TRW campus checklist" = a curated bundle. Compete on authoring rigor + results, not on out-featuring Trainerize/Everfit |
| 6 | Coach CRM = **structured data + versioned prompts now, dashboard deferred**; clients in Supabase `profiles`; AI Projects as the working surface | A CRM UI for 2–3 clients is a premature-engine trap; the manual process is the spec; a dashboard earns itself at ~5–10+ clients. The foundation is the data model, not the UI |
| 7 | AI authoring framework = 4 artifacts (intake schema · versioned "coach" prompt that **adapts proven templates, doesn't free-invent** · coaching-sanity reviewer · data feedback loop). Build 1–3 as docs, prove on self; #4 deferred | Program quality is capped by intake quality; adapting proven templates is safer + how real coaches work; re-authoring-from-data needs the rebuilt app + real logs first |
| 8 | Medical/AI disclaimer = one subtle Settings line (not app-wide); **open-source deferred → business path** | Health guidance carries responsibility regardless of licence; results are the current asset; keep the OSS option cheap to exercise |

**Also this session:** resolved a stranded 07-20 goodnight doc-merge (kept the newer 07-21
continuity, dropped the obsolete "rescued" note); shipped the keep-alive Action
(`.github/workflows/supabase-keepalive.yml`) + OPERATIONS notes; noted the staging reshuffle —
Track B (Supabase) shipped *before* the Stage-2 rebuild (out of §8 order), which de-risks it.

**Not done / deferred:** the Train/Playbook renderer build; the authoring-framework docs; the
logging payload shape (gated on W26); the habit checklist-cartridge; the coach dashboard; D9; W26;
the Settings disclaimer; branch cleanup.

**To do next session:** start the Stage-2 build (or the authoring-framework docs), proven on the
developer's own program first; lock the payload shape when W26 lands.

---

## 2026-07-10 · Housekeeping — Session-continuity system established

**Context:** First-ever Combat OS session using structured tracking files.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Adopted sunshine/goodnight skill pattern for session continuity | Ensures each session opens from a position of certainty; mirrors Life-OS session-close pattern scoped to this project |
| 2 | Skills installed at `.agents/skills/` (project-scoped, not global) | These skills are specific to Combat OS; project-scoped keeps them portable with the repo |

**Not done / deferred:** No feature work this session.

**To do next session:** Architect-tier planning for Project B.

---

## 2026-07-10 · Architect session (Fable 5) — roadmap, rulings, Phases 0–3 executed

_(Restored 2026-07-12: this entry was originally committed on the `chore/session-close` branch,
which never got merged to main — rescued into this file during the W23 goodnight.)_

**Context:** The planned priming session, which continued straight into delegated execution.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | D1: soft delete (Apex pattern) replaces shipped hard delete — via W17 | Audit trail; Sheet is the long-term record |
| 2 | D2: day counting stays sequential incl. fight days; cycle extends to Day 7 (custom gym day, free-form) | Matches real training week; FightGymDay machinery reusable |
| 3 | D3: adopt TRW/Discord layered-nav PARADIGM, never the styling — CombatOS keeps tactical-amber identity | 6 flat tabs failed before; paradigm scales, skin stays ours |
| 4 | D4: notepad is concrete (folders/tags/5-star, connector-ready); Hermes connector later, own tab | Capture habit first, integration second |
| 5 | D5: planning layer moved into tracked docs/planning + docs/reference (executed, PR #3) | Plans must survive the laptop and be visible to workers |
| 6 | Adopted branch + PR + CI workflow; merges to main = production deploys | Learning proper practice; CI proved itself same-day |
| 7 | Delegation model: FAST/IMPL agents execute; Fable approves technical diagnostics; developer rules product decisions | Token economics + keeps judgment where it belongs |
| 8 | Policy: deps installed via `npm ci`; lockfile changes need from-scratch regen + clean `npm ci` check; browser globals in tests via `vi.stubGlobal` | Two Windows-vs-Linux CI failures traced to exactly these |
| 9 | CHECKLIST.md declared historical (status note added); ROADMAP.md is the active sequencing doc | Was misread as active plan mid-session |

**Not done / deferred:** W19 sign-off (developer's 5 calls); W16/W17/W10 ready but not run;
Supabase still gated (leaning go); audio-ducking + sell-as-product unchanged.

**To do next session:** W19 §5 rulings → W20/W21 prompts; delegate W16/W17/W10.

---

## 2026-07-10→12 · Delegated feature marathon — W19 sign-off through W23 Notes v1 (PRs #12–#17)

**Context:** One long session: developer ruled on W19 §5, then six items were built by IMPL
workers (diagnostic-first, Fable review pre-merge, developer merging + on-device verification).

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | W19 §6: slot 4 = CHECKLIST hub; Notes = second top tab (became W23); pinned quick-add replaces the FAB; streaks in v1 | The live TRW Android app proved the 5-slot bottom bar + pinned-input patterns; checklist is closer to the daily loop than a notepad |
| 2 | Tags + pin replace D4's 5-star, as the app-wide convention: normalized lowercase-kebab, Dexie multiEntry `*tags`, tag universe always derived (no tags table) | Categorization beats star-granularity nobody uses solo; derived data can't go stale |
| 3 | Data policy: NO new Google Sheets tabs or Apps Script for mutable data, ever. Sheets = append-only workout log; Supabase (D7) = eventual backend; the W23.5 full-backup JSON doubles as its migration seed; `combatos-backup-*.json` gitignored | Mutable documents don't fit append-only Sheets; no throwaway sync plumbing on the most brittle layer |
| 4 | The checklist's configurable reset time is THE logical-day clock for the whole hub — Notes' daily note reuses it | One definition of "today" across habits and journaling |
| 5 | Editor policy: plain text only (rich text/editor libs ruled out as the #1 solo scope trap); inline checklists = tappable `- [ ]` lines; editor is a screen, not a sheet; debounced autosave with visibilitychange/unmount flush; no empty notes ever | 80% of the value at ~5% of the risk; long journal entries must not be losable |
| 6 | Process: interrupted workers get resumed with a done/remaining file inventory, never restarted; the coordinator finishes small remainders directly when re-delegation costs more than the work | Two usage-limit kills (W21, W23) proved the pattern with zero duplicated work |
| 7 | Tests must never hardcode current-schema facts (`verno === 2`) — capture-before/assert-unchanged or `>=` floors | The v3 bump broke 3 such tests; premise-proof assertions end the whack-a-mole |

**Not done / deferred:** W16/W17/W10 (prompts ready, undelegated). W24 Tracking gated on Notes
usage. Initiatives stays an ordinary notes-group until usage proves more is needed. Supabase
gates unchanged; backup restore/import deliberately deferred to the Supabase era.

**To do next session:** delegate W16 (W10 in parallel if desired); W17 when the developer can do
the Apps Script redeploy; tick W23.5/W23 in ROADMAP.md.

---

## 2026-07-16→17 · Delegated feature session — W16/W10/W10.1/W17 (PRs #18–#23)

**Context:** Cleared the whole pending delegation queue (Sonnet workers, Fable review,
developer rulings + on-device verification); one usage-limit kill mid-W10.1 recovered
via inventory-and-resume with zero rework.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | W17 final shape: Status column only (col 66 = BN; blank = active, CANCELLED = deleted); NO local tombstone — local hard delete stays | The audit trail D1 wanted lives on the Sheet; a tombstone would force filters onto 5 read sites for no asked-for benefit; matches shipped Settings copy |
| 2 | webhook.gs v3 uses fixed STATUS_COL=66 plus a grid-width guard (auto-widen before write) | getLastColumn()+1 drifts once the column exists; the guard makes deletes order-independent of the manual header step |
| 3 | Superset/PAP treatment: gym-standard A1/A2 badges + shared left-edge accent bar (Option C) | Strongest at-a-glance pairing signal with zero new wrapper structure |
| 4 | Collapse-state convention: UI-only fields in DBProvider (the hudScrollY pattern), reset per session; mob/str/clr default OPEN, bag/core default COLLAPSED with transition-guarded auto-expand; daily-focus label stays outside the collapse | Survives HUD unmounts; provably can't reach the payload; the day's core work stays visible by default |
| 5 | Day-7 quirk accepted won't-fix: after logging while staying on day 7, session type resets to Combat (the Cardio default only fires on the transition in) | Reviewed post-deploy; next action is switching days; documented in ARCHITECTURE.md |
| 6 | Process: no gh CLI on this machine — agents push branches, developer creates PRs from the web link; the IDE Commit button is never used for agent work-in-progress | The PR page shows CI checks; a panel commit would capture half-finished worker state |

**Not done / deferred:** W24 (gated, prompt unwritten), W18 (parallel-safe, unscheduled),
Supabase gates unchanged, backup-JSON move still on the developer.

**To do next session:** write the W24 prompt once Notes usage is validated; W18 whenever wanted.

---

## 2026-07-17 (evening) · Housekeeping + W18 partial — conventions skill, PR-#11 cleanup (PRs #24–#26)

_(Rescued 2026-07-20: this entry was originally committed on `docs/goodnight-2026-07-17-pm`,
which was never merged to main — so its decisions, and the fact that the full-backup JSON move
was already DONE, were lost. A later session re-opened "confirm backup location" as a pending
item because this record was stranded. Rescued into main during the W15 branch-prune sweep;
verified on disk before restoring: `C:\Users\jmfg9\Documents\CombatOS-backups\` holds
`combatos-backup-2026-07-12 (1).json`.)_

**Context:** Fable session direct (no workers): W18 skill authoring plus a repo-hygiene
sweep triggered by two developer observations (goodnight docs unmerged; stale conflicted PR #11).

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | W18 scope ruled: only combatos-conventions gets written; the other three candidates stay optional/unscheduled | Highest-value one first; a skill nobody asked for yet is speculative documentation |
| 2 | Stale superseded PRs are closed, never conflict-resolved; unique content is rescued onto a fresh branch off main (PR #11 → CLAUDE.md via PR #26) | Resolving conflicts on a week-old close would have regressed all three continuity docs |
| 3 | Branch hygiene convention: remote branches are deleted once fully merged (verified via `git branch -r --merged`); GitHub's Restore button covers resurrection | 16 stale branches had accumulated; merged-branch refs carry zero unique content |
| 4 | CLAUDE.md session bootstrap is live at repo root — new agent sessions auto-load it and get pointed at AGENTS.md + the rituals | The 07-10 orphaned commit's only content main actually lacked |

**Not done / deferred:** W24 (gate unchanged), W18 remainder, Sheets strikethrough rule.
The backup-JSON move is DONE (now at C:\Users\jmfg9\Documents\CombatOS-backups\).

**To do next session:** write the W24 prompt once Notes usage is validated; W18 remainder whenever wanted.

---

## 2026-07-18 · Hygiene + W18 close-out + W24 ruled/built/shipped (PRs #27–#30)

**Context:** one session, start to finish: hygiene items → W18 remainder skills →
ARCHITECTURE.md refresh → W24 gate evaluation → D8 ruling → prompt → implementation →
on-device validation → day-one fix.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | D8: standalone Track system DEFERRED; W24 = counted tasks (`counted`/`count` as non-indexed fields on existing rows — NO Dexie bump; +1 in the row, −1 in the `…` sheet; streaks unchanged by construction; counted one-offs stay visible) | 5 days of honest usage produced zero tracking workarounds; the developer's own first tracker-shaped task died in 5 days; the want-to-track list fails the 2-tap friction test |
| 2 | Counted rows never take the done styling — a tally records occurrences, it completes nothing | Day-one on-device use: strikethrough on "Nicotine Pouches ×1" read as completion/achievement (fixed in PR #30) |
| 3 | Sheets-tab export for checklist/notes re-affirmed OUT; developer ratified "stick to it for now" | The 2026-07-12 data policy stands; history visibility is W26's job, durability is the full backup + Supabase (D7) |
| 4 | W26 scope upgraded: per-day tally history surfacing is a VALIDATED requirement, not a hypothesis | The developer put the date in a task title to "save" daily counts — the per-date data was already stored; the gap is visibility, not storage |
| 5 | D9 opened, NOT ruled: off-programme activity logging (options range from a counted task to webhook-touching session types) | Some options touch the frozen webhook contract; never default silently |

**Not done / deferred:** W25/W26 unstarted; Supabase gates unchanged; backup-JSON location
unconfirmed by the developer.

**Process note:** the W24 planning-docs PR was believed merged mid-session but never was —
caught at goodnight by pulling main and checking before branching; its commit ships inside
this goodnight PR instead (the code PRs never depended on it). Lesson: after a "merged",
pull and verify before building dependent work on the assumption.

**To do next session:** live with counted tasks · W25 whenever wanted · W26 once usage
accumulates · D9 ruling when the developer is ready.

---

## 2026-07-20→21 · Feature delivery (W25/W14/W15/W27) + rebuild & Supabase architecture committed

**Context:** One long session: four small roadmap items shipped via delegate→review→PR, a
branch-prune sweep that rescued a stranded decision-log entry, then a strategic pivot to planning
the app rebuild and kicking off the Supabase backend.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Commit to Track B — Supabase multi-tenant — as the distribution foundation (extends D7 "leaning go" → "in progress") | The open-source/multi-user vision needs a real backend; Sheets + per-user webhook doesn't scale past 2 |
| 2 | One app, cartridge-driven: a program = a BUNDLE of typed cartridges (training + content); Apex becomes a bundle, NOT a sibling app; no per-user forks | Rule of three (CombatOS v1 → Apex → this rebuild) revealed the axes; forking is the pain being escaped |
| 3 | Navigation is a variation axis: config-driven hubs + a "More" catch-all (TRW pattern); Checklist is a universal primary hub | Solves Apex's icon crowding and "no Apex tab in Combat OS" without forking |
| 4 | Clean-slate Supabase migration: wipe/freeze old Sheets data; repoint the write path (syncQueue drain) webhook → Supabase. Deliberately supersedes AGENTS rule 2 for the write path | New schema differs; migrating old rows is translation busywork; developer OK wiping |
| 5 | Supabase `sessions` stores a generic JSONB payload | So the cartridge rebuild changes the payload, not the table — no second DB migration |
| 6 | Supabase work stays OFF main (`feat/supabase-foundation` + preview deploy) until proven | The daily-driver production app must never be at risk mid-migration |
| 7 | Sequencing: Supabase foundation FIRST (current app, single-user), THEN the cartridge rebuild (Track A). Brother NOT pre-staged; magic-link onboard when he + his cartridge are ready | Supabase is the well-understood foundation; the brother's value needs Track A, which comes after |
| 8 | Free-tier keep-alive must be EXTERNAL (n8n per D7, or a GitHub Action cron), never in-app; go Pro when the brother is a daily user | An app can't ping itself when closed; a paused project needs a manual restore, so prevention runs externally |

**Not done / deferred:** Supabase M1 (auth) + M2/M3 (sync repoint, isolation test) unbuilt; CSV
Program Authoring Kit still owed; W26 research running as a parallel session; D9 open; W28
(data-layer phase guard) logged as a candidate.

**Also this session:** shipped W25 (#32), W14 (#33), W15 (#36), W27 (merged) — all on-device
verified. Rescued the stranded 2026-07-17 decision-log entry (confirmed backup JSON location).
Applied the Supabase sessions+profiles+RLS schema (project `pckokypnxrimayjmjgcl`; advisor clean
after locking down the `handle_new_user` trigger).

**To do next session:** build Supabase M1 (auth → phone login) · write the CSV Authoring Kit ·
then M2/M3 · rule D9 · fold in W26 research when it returns.

---

## 2026-07-21 · Supabase M1–M3 built + invite-only + hardening (Track B execution)

**Context:** Execution session — turned the 07-20 Supabase architecture into a working, proven
foundation on `feat/supabase-foundation` (off main).

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Invite-only at TWO layers: project "Allow new users to sign up" OFF + app `shouldCreateUser:false` | Signup never self-serve; the app never mints accounts. Onboarding = add the email first, then they magic-link in |
| 2 | Use the modern publishable key (`sb_publishable_…`) as `VITE_SUPABASE_ANON_KEY`, not the legacy anon JWT | Connector-recommended; public-safe by design (RLS is the real protection) |
| 3 | Supabase DDL captured as repo migrations (`supabase/migrations/`), recovered from the live project | Reproducibility / disaster recovery; schema no longer lives only in the cloud |
| 4 | Cloudflare hosting — Path A: don't fight the accidental Preview Access wall; go live at the production merge. Second Pages project is the escape hatch for a free sandbox URL | Removing the wall needs Zero-Trust Free (card on file); M1–M3 already proven on localhost, so the preview URL is optional. Production isn't behind the preview wall |
| 5 | Braindumps go to `docs/planning/ICEBOX.md`, triaged (evidence / blocking / cost×leverage) at goodnight — never straight to the roadmap; operator runbook `docs/OPERATIONS.md` added | Protects execution focus ("defer with a shape, don't drop"); cuts token spend on repeatable manual ops |
| 6 | Track A (app reads cartridge JSON) explicitly does NOT jump the queue — earns its own planning session | Biggest item in the plan, non-blocking; rushing risks a sloppy foundation + collision with the rebuild |

**Also this session:** M1/M2/M3 built and verified — a real session synced to Supabase tagged to
the user; RLS isolation proven with a real 2nd account (dropped after) + a forged-write block;
profile auto-creation trigger confirmed; 261 tests pass. Diagnosed & fixed the Cloudflare env-var
Preview-scope + build-time-inlining bug. Rescued the stranded 2026-07-20→21 decision entry into
this branch.

**Not done / deferred:** production merge + go-live; free-tier keep-alive; CSV Authoring Kit;
Track A (own session); D9 ruling; W26 research (parallel).

**To do next session:** developer's pick — go-live (merge → prod env + redirect), OR start the CSV
Authoring Kit, OR a Track A planning session.
