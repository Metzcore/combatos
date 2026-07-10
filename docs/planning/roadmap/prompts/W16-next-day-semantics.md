# W16 — Day-7 Cycle Extension · Tier: IMPL, then REVIEW pre-merge
_Rewritten 2026-07-10 per decision D2's ruling (see `../OPEN-DECISIONS.md`). The original "skip-days rework" version of this prompt is void. Run AFTER W7 (tests) is merged — this item modifies logic W7's tests pin._

**Instructions for the User:** paste everything below the dashed line into a fresh session. Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey its hard rules. Task: extend the training cycle from 6 days to 7.

## THE DECIDED BEHAVIOR (ruling D2 — do not relitigate)
- Day counting stays **strictly sequential**: 1→2→3→4→5→6→**7**→1. Fight-gym days (2, 4) and the new Day 7 all count as days.
- **Day 7 is an optional/custom gym day** — cardio, mobility, or whatever was done — logged with free-form content, NOT playbook programming. `playbook.csv` is untouched: like days 2/4, Day 7 has no playbook rows.
- **Head start, confirmed in code:** `FightGymDay.jsx` already supports exactly the needed session types — Combat / "Cardio & Core" / "Recovery & Mobility" — with free-form movement rows for the non-combat types, plus the session `notes` field in the payload. Day 7 should REUSE this machinery (possibly with different default labeling, e.g. defaulting to Cardio rather than Combat), not duplicate it.

## DO NOT TOUCH
- `playbook.csv` / `playbook.js` / the CSV pipeline. %1RM/e1RM logic. Webhook payload SHAPE (the `day` field is just a number — day 7 rides through unchanged; verify, don't modify).
- The day SELECTOR's manual freedom — the user can still pick any day by hand.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
Map every place the 6-day assumption lives, and state the proposed change for each:
1. **Next-day math:** `(day % 6) + 1` (extracted to `app/src/utils/` by W7 — confirm location) → `(day % 7) + 1`.
2. **Day selector in HUD:** confirm how the day options are generated (hardcoded 1–6? range?) and what adding 7 takes.
3. **`usePlaybook.js` `getWorkout`:** days 2/4 short-circuit to `isFightGymDay`. Propose how day 7 is handled — e.g. same flag plus a `dayType`/label distinction, or a parallel `isCustomGymDay` flag. Prefer the smallest change that lets HUD render `FightGymDay` (or a lightly parameterized variant) for day 7. Also check `getDailyFocus(day)` for a day-7 label.
4. **Phase-unlock counting:** `refreshCounts()` in `db/index.jsx` counts only `day !== 2 && day !== 4` sessions toward the 12-session unlock. Day 7 is not S&C — it should presumably also be excluded. Confirm and flag this explicitly in your report (it changes unlock pacing if wrong).
5. **Everything else that touches day numbers:** Calendar/Log rendering, `CompletenessBar` (what does completeness mean on a free-form day? days 2/4 already answer this — follow the same answer), weekly-stats view if W9 has landed, W7's next-day tests (must be updated to pin the new 7-day rule, all days 1–7 plus the 7→1 wrap).
6. **Sheet impact check (read-only):** confirm a `day: 7` row flows through `webhook.gs` and the FightLog columns without any script change (it should — day is a plain value column; verify against `docs/reference/fight-log-schema.md`).
7. **Edge case to answer in the report:** what does the Next Day indicator show after a Day-6 log (expect "NEXT: DAY 7") and after a Day-7 log (expect "NEXT: DAY 1")? What happens for users whose last logged session predates day 7 existing? (Nothing special expected — confirm.)

## PHASE 2 — IMPLEMENT (only after approval)
- Execute the approved plan. Update W7's tests to the new rule; add day-7 cases.
- `npm test` and `npm run build` green.
- Manual checklist for the user: select Day 7 in the HUD → see the custom-gym view → log a cardio session with movement rows + notes → confirm the Sheet row lands with day=7 → confirm HUD then shows "NEXT: DAY 1" → confirm phase-unlock counter did NOT increment.

Commit: `feat: extend training cycle to 7 days with custom gym day (D2)`.

## REVIEW PASS (separate session)
Focus: the phase-unlock exclusion (item 4), test coverage of the wrap, and that no payload field changed shape.
