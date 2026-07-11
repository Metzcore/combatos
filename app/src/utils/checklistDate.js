/**
 * checklistDate.js — the checklist's LOCAL-midnight "today" rule (W21)
 *
 * The checklist deliberately diverges from the workout log's date stamping:
 * HUD.jsx stamps sessions with `toISOString().slice(0, 10)` (UTC), which is
 * fine for weekly aggregation but wrong for a habit tracker — daily tasks
 * must reset when the USER's day turns over on their device, not at 00:00
 * UTC. This helper is the single place that decides what "today" means for
 * checklist completion and streaks.
 *
 * DST safety: the local getters (getFullYear/getMonth/getDate) resolve DST
 * transitions correctly at any instant, and all downstream arithmetic runs
 * over the resulting date STRINGS via utils/dateMath.js — no millisecond
 * deltas ever cross a DST boundary.
 *
 * "Today" is recomputed on every read/toggle (never cached in long-lived
 * state), so the moment the user interacts after midnight the new day is in
 * effect. useChecklist.js additionally re-reads on `visibilitychange` to
 * cover the phone-unlocked-next-morning case.
 */

export function localDateStr(d = new Date()) {
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
