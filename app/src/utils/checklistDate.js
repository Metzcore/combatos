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

export const DEFAULT_RESET_TIME = '00:00'

/**
 * Parses an `HH:MM` reset-time string into minutes past midnight.
 * Anything malformed falls back to 0 (midnight) — never throws, because a
 * corrupt setting row must degrade to W21 behavior, not break the hub.
 */
function resetTimeToMinutes(resetTime) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(resetTime || '')
    if (!match) return 0
    const h = Number(match[1])
    const m = Number(match[2])
    if (h > 23 || m > 59) return 0
    return h * 60 + m
}

/**
 * logicalDateStr — the reset-time-aware "today" rule (W22).
 *
 * The logical checklist date of an instant is the LOCAL calendar date of
 * (instant − reset offset): with a reset time of 04:00, everything up to
 * 03:59 still belongs to the previous logical day. With the default
 * '00:00' this is exactly `localDateStr` (shift by zero — W21 behavior).
 *
 * DST safety: the offset subtraction runs on epoch milliseconds (a real,
 * timezone-independent duration), and `localDateStr` then reads the shifted
 * instant's local getters — JS resolves any DST transition on its own. No
 * calendar-string arithmetic ever crosses a DST boundary here.
 *
 * Changing the reset time mid-day may shift the logical "today", which can
 * flip doneToday/streak display at that moment — accepted per the W22
 * ruling, no compensation logic.
 */
export function logicalDateStr(d = new Date(), resetTime = DEFAULT_RESET_TIME) {
    const shifted = new Date(d.getTime() - resetTimeToMinutes(resetTime) * 60000)
    return localDateStr(shifted)
}

/**
 * msUntilNextReset — real milliseconds from `now` to the next daily reset.
 *
 * Builds today's local reset instant via the LOCAL Date constructor (which
 * resolves DST-skipped or ambiguous wall times itself); if that instant has
 * already passed, rolls to tomorrow's (day + 1 in the constructor handles
 * month/year rollover). The returned duration is real elapsed time, so on a
 * DST day it can legitimately differ from the wall-clock difference.
 */
export function msUntilNextReset(now = new Date(), resetTime = DEFAULT_RESET_TIME) {
    const mins = resetTimeToMinutes(resetTime)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
    if (candidate.getTime() <= now.getTime()) {
        candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m, 0, 0)
    }
    return candidate.getTime() - now.getTime()
}
