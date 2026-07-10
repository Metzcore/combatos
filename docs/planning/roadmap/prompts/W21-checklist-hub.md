# W21 — Checklist Hub v1 (Habit Tracker) · Tier: IMPL, then REVIEW pre-merge
_Written 2026-07-10 after the W19 sign-off (see `../W19-NAV-IA-PROPOSAL.md` §6). ⛔ Gated on W20
(nav shell) being merged — this fills the Checklist hub W20 left as a placeholder. UI/data
references: `docs/reference/therealworld-app-references/checklist_ui_specification.md` and
`docs/reference/therealworld-app-references/android-app-observations.md` (§3 especially) — take
the PATTERNS, never the navy/gold styling; CombatOS keeps its tactical-amber identity._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules. Task: build v1 of the Checklist hub — a daily habit tracker.

## THE DECIDED SCOPE (W19 §6 rulings — do not relitigate)

**In v1:**
- **Groups** (cards): create, rename, reorder, delete. Tasks live inside groups.
- **Tasks:** title (emoji allowed in the text), optional note, optional scheduled time-of-day,
  **repeat-daily toggle**. Task rows show title, schedule/recurrence subtext, and streak.
- **Daily completion + streaks:** checking a recurring task completes it for TODAY; it resets
  next day; **streak = consecutive days completed**, shown on the row (🔥 n). Streaks are core
  scope, not garnish. One-off (non-repeating) tasks disappear from view once completed
  (kept in data).
- **Pinned quick-add input** — a "describe your task" field fixed above the bottom nav inside
  this hub; submit creates a task in a default/General group. Zero-navigation capture. NO FAB.
- **Bottom-sheet row actions:** each row's `…` opens a bottom sheet: Edit · Stop repeating ·
  Move to group · Delete (with confirm). Edit opens a sheet with the full field set (title,
  note, time, repeat toggle).
- **New Dexie store(s)** — schema version bump, with the same care as W12: additive upgrade,
  existing stores untouched, upgrade path tested against a DB created at the previous version.
- **Connector-ready data (D4 discipline):** stable string ids, `createdAt`/`updatedAt`
  timestamps, and a documented plain-JSON export shape — so the future Personal-OS/Hermes
  integration bolts on without rework. No export UI in v1; just a documented, tested
  `exportChecklist()` (or equivalent) returning that JSON.

**Explicitly OUT of v1 (deferred, do not build):**
- Notes/notepad (separate deferred item), Schedule calendar view, reminders/notifications,
  non-daily recurrence patterns (weekly etc.), share/import, drag-and-drop reordering of tasks
  (buttons/menu suffice), streak-freeze mechanics.

## DO NOT TOUCH
- **This feature is LOCAL-ONLY. Zero webhook/Sheets involvement** — nothing here may import from
  or modify `syncQueue`, `webhook.gs`, or any payload shape. The checklist never syncs in v1.
- Workout stores in Dexie (sessions, settings, etc.) — additive schema change only.
- The W20 shell: consume `TopTabs`/hub wiring as-is (Checklist has one top tab in v1 — render
  the hub content; add the tab bar only if the shell requires it).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. **Schema proposal:** exact Dexie stores + indexes. Expected shape (challenge if you find
   better): `checklistGroups` (id, name, order, timestamps), `checklistTasks` (id, groupId,
   title, note, scheduledTime, repeatDaily, order, timestamps, soft-delete flag or deletedAt),
   `checklistCompletions` (taskId + local-date key). Streaks DERIVED from completions at read
   time — justify any denormalization. State the current Dexie schema version and the bump plan.
2. **The "today" boundary:** define the local-midnight rule for completion reset and streak
   computation (device-local time; what happens across midnight while the app is open; DST
   safety). Propose the streak algorithm and its unit tests.
3. **Component plan:** hub screen, group card, task row, pinned quick-add, bottom sheets (row
   actions + edit). The bottom sheet is a NEW shared primitive — W12's exercise picker is slated
   to reuse it; design it as a generic component. List the component files you'll create.
4. **Tests:** streak math (gaps, first completion, today-incomplete, long runs), completion
   toggling idempotence, schema upgrade from previous version, export shape stability, quick-add
   creating into the default group. Browser globals via `vi.stubGlobal` (standing policy).
5. **Styling plan:** how group cards/rows/sheets express tactical-amber (reuse existing CSS
   variables/classes from the HUD — name which), NOT the TRW reference palette.
6. **Risk list:** schema-bump risk to existing users' data (the developer's phone has real
   logs), bundle-size effect, anything touching app-open time.

## PHASE 2 — IMPLEMENT (only after approval)
- Execute the approved plan. `npm test` and `npm run build` green (`npm ci` for deps; if a dep
  must be added, regenerate the lockfile from scratch and verify clean `npm ci` — standing policy).
- Manual checklist for the user: create groups · quick-add a task · edit via bottom sheet · set a
  task repeat-daily and complete it → streak shows 1 · uncheck/recheck idempotent · complete a
  one-off task → it leaves the list · move a task between groups · delete with confirm · kill and
  reopen the app → all data persists · existing workout logging still works end-to-end (schema
  bump did not disturb it).

Commit: `feat: checklist hub v1 — groups, daily tasks, streaks, quick-add (W21, D4-ready)`.

## REVIEW PASS (separate session)
Focus: the Dexie upgrade path against a real pre-existing DB, streak math edge cases (midnight,
gaps, timezone), soft-delete consistency, and confirming zero imports from sync/webhook modules.
