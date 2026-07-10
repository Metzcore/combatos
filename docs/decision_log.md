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
