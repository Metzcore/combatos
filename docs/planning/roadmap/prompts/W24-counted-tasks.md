# W24 — Counted Tasks · Tier: IMPL (small), review by coordinator
_Written 2026-07-17, after the usage-validation gate opened (see D8 in `OPEN-DECISIONS.md`).
Context: 5 days of real Checklist/Notes usage produced no organic tracking workarounds, so the
brainstorm's standalone "Tracking & counting" system is DEFERRED. What ships instead is the
minimal shape that captures most of the value: an optional +1 tally on existing checklist
tasks. No new tables, no new tab, no webhook involvement, no Apps Script redeploy._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions`, `mobile-interaction-ux`, and
`personal-analytics-viz` skills in `.agents/skills/`. Task: counted checklist tasks. Nothing else.

## THE DECIDED SCOPE (do not relitigate)

**1. Counted mode on a task.** A checklist task can be switched to "counted" via the existing
`TaskEditSheet` (a toggle — no new sheets, no `prompt()`). For a counted task, the row's
checkbox becomes a **+1 tally control**, and the row shows today's count (e.g. `×3`). A
decrement affordance must exist (proposed in the diagnostic — e.g. a small `−` next to the
count, or an action in the existing task `…` sheet); count 0 removes the completion row.

**2. Data model — NO Dexie version bump.** `counted` (boolean, on the task row) and `count`
(number, on the completion row) are plain non-indexed fields: Dexie only declares indexes, so
both are additive with **zero schema change**. The completion row for `[taskId+date]` stays the
one record of a day's activity; for counted tasks it carries `count >= 1`.

**3. Streaks unchanged by construction.** A completion row existing (i.e. count ≥ 1) is what
streak logic already reads — counted tasks get streaks for free. Do not modify
`checklistStreak.js` semantics; prove with tests that existing binary tasks are byte-identical
in behavior.

**4. Export stays compatible.** `exportChecklist()` includes the new fields where present.
Existing consumers must not break: additive fields only; the exported `version` stays `1`
unless the diagnostic finds a concrete reason to bump (state it). Update the shape-pinning
tests. The W23.5 full backup includes everything automatically (dynamic `db.tables`) — verify,
don't touch.

**5. Logical-day semantics unchanged.** Counts attach to `logicalDateStr()` exactly like
completions do today. Tapping +1 after midnight but before the reset time lands on the correct
logical day for free.

## EXPLICITLY OUT OF SCOPE (ruled, D8)
- Standalone Track tab / trackable-item system — deferred pending counted-task usage.
- Reduction-vs-growth targets, quotas, warnings — deferred to the stats era (W26).
- Any stats/aggregation surface — W26's job.
- Retro-logging for past days — current checklist parity only.
- Any webhook/Sheets involvement — checklist data is LOCAL-ONLY, per the standing data policy.

## DO NOT TOUCH
- Dexie schema declarations (no version bump — see scope §2). Webhooks, `sync/`, payload shapes.
- Streak computation semantics. Notes feature. HUD/workout logic.
- `package.json` / lockfile (zero new dependencies).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. Exact UI: where the toggle sits in `TaskEditSheet`, what a counted row looks like (reuse
   existing row/badge classes — tactical-amber tokens only), the decrement affordance, and the
   tap-target sizes (mobile-interaction-ux skill: ~2-tap ceiling, sweaty-thumb targets).
2. Data flow: which functions in `db/checklist.js` / `hooks/useChecklist.js` change; how
   toggle-off (counted → binary) treats an existing count (proposal: count stays, renders as a
   plain completion).
3. Test plan: streak invariance for binary tasks, count increment/decrement/zero-delete on the
   logical-day boundary, export shape.
4. Risk list: anything touching the completion primary key `[taskId+date]`, accidental
   double-tap behavior, and proof nothing reaches the webhook payload.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only; `npm test` and `npm run build` green; existing tests unmodified unless the
  diagnostic declared a shape addition.
- Manual checklist for the user: toggle a task to counted · +1 several times, count shows ·
  decrement to 0, day becomes incomplete · streak on an existing binary habit unaffected ·
  checklist export contains the count · full backup still exports.

Commit: `feat: counted checklist tasks (W24)`.
