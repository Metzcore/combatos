/**
 * checklistStreak.js — streak = consecutive days completed (W21)
 *
 * Pure function over a Set of completed `YYYY-MM-DD` date strings. Streaks
 * are DERIVED at read time from checklistCompletions rows — never stored —
 * so a streak that breaks by the calendar silently advancing (app never
 * opened on the missed day) is always reported correctly on the next read.
 *
 * Imports calendar math from utils/dateMath.js (never weeklyStats.js — the
 * checklist must not couple to the Log tab's stats module).
 */

import { addDays } from './dateMath.js'

/**
 * Counts the unbroken run of completed days ending at `todayStr`.
 *
 * If today is not (yet) completed, the count starts from yesterday instead:
 * the day isn't over, so an incomplete "today" must not zero out an
 * otherwise-intact streak — it keeps showing yesterday's count until a full
 * day is actually missed.
 *
 * @param {Set<string>} completedDates - completed `YYYY-MM-DD` strings
 * @param {string} todayStr - the local "today" (see checklistDate.js)
 * @returns {number} consecutive-day streak (0 when broken or never started)
 */
export function computeStreak(completedDates, todayStr) {
    let cursor = todayStr
    if (!completedDates.has(cursor)) {
        cursor = addDays(cursor, -1)
    }
    let streak = 0
    while (completedDates.has(cursor)) {
        streak++
        cursor = addDays(cursor, -1)
    }
    return streak
}
