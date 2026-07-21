# Decision Log

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

_(Rescued 2026-07-21 into `feat/supabase-foundation`: this entry was committed only on the
unmerged `docs/goodnight-2026-07-20` branch — folded here so it survives the eventual merge.)_

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
