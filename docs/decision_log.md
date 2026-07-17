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
