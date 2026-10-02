/**
 * utils/logDate.js — W34 "log a workout for a past day": every date decision
 * in one pure module. No React, no Dexie.
 *
 * CONVENTION — UTC, not local. The write path stamps `date` with
 * `new Date().toISOString().slice(0, 10)` and every reader (logOverview,
 * weeklyStats, the Overview heatmap) agrees. "Today", "Yesterday", the
 * 14-day window and the picker's `max` therefore all come from that same
 * UTC date; mixing in a local-time date would put a workout on the wrong
 * heatmap cell. (A session logged between midnight and 1 a.m. Irish summer
 * time is dated the previous day — pre-existing, ruled known behaviour.)
 *
 * The selection model: `null`/`undefined` means "no override" — Today, and
 * it resolves against the clock at FINISH time, so a 23:59 -> 00:01
 * crossing still logs as now exactly as before. A string is an explicit
 * past day, re-validated at FINISH.
 */

import { addDays, daysBetween, isValidDateStr, parseDateParts, toEpochMs } from './dateMath.js'

/** Today plus this many previous days are loggable. */
export const LOG_WINDOW_DAYS = 14

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/**
 * Today as the write path produces it (UTC calendar date).
 *
 * Deliberately a FOURTH spelling of this one-liner rather than a refactor:
 * the same expression is still private in utils/logOverview.js
 * (`defaultTodayStr`), components/overview/MonthHeatmap.jsx (`todayString`),
 * components/overview/Overview.jsx and utils/weeklyStats.js
 * (`buildWeeklyStats`). Consolidating those is a follow-up; keep them all
 * on the identical expression until then.
 */
export function utcTodayStr(now = new Date()) {
    return now.toISOString().slice(0, 10)
}

/** Yesterday in the same UTC convention. */
export function utcYesterdayStr(now = new Date()) {
    return addDays(utcTodayStr(now), -1)
}

/** The picker bounds: `{ min, max }` as `YYYY-MM-DD` strings. */
export function getLogDateRange(now = new Date()) {
    const max = utcTodayStr(now)
    return { min: addDays(max, -LOG_WINDOW_DAYS), max }
}

/**
 * Why a selection is not loggable, or null when it is. Reasons:
 * 'invalid' (malformed, impossible or empty — e.g. a cleared date input),
 * 'future', 'too-old'.
 */
export function logDateProblem(dateStr, now = new Date()) {
    if (!isValidDateStr(dateStr)) return 'invalid'
    const age = daysBetween(dateStr, utcTodayStr(now))
    if (age < 0) return 'future'
    if (age > LOG_WINDOW_DAYS) return 'too-old'
    return null
}

/** True for a real calendar date from LOG_WINDOW_DAYS ago through today. */
export function isLogDateAllowed(dateStr, now = new Date()) {
    return logDateProblem(dateStr, now) === null
}

/**
 * Resolve the user's selection against the clock.
 *
 * @param {string|null|undefined} selected - null/undefined = Today (no override)
 * @returns {{ ok: true, date: string, isToday: boolean } | { ok: false, reason: 'invalid'|'future'|'too-old' }}
 */
export function resolveLogDate(selected, now = new Date()) {
    const today = utcTodayStr(now)
    if (selected === null || selected === undefined) return { ok: true, date: today, isToday: true }
    const reason = logDateProblem(selected, now)
    if (reason) return { ok: false, reason }
    return { ok: true, date: selected, isToday: selected === today }
}

/** User-facing message for a rejected selection (see resolveLogDate). */
export function describeLogDateProblem(reason) {
    switch (reason) {
        case 'future': return 'You can\'t log a workout for a future date. Pick today or an earlier day.'
        case 'too-old': return `That date is more than ${LOG_WINDOW_DAYS} days ago. Pick a date from the last ${LOG_WINDOW_DAYS} days.`
        default: return 'Pick a valid date to log this workout for.'
    }
}

/** "MON 28 SEP" — pure string/UTC calendar math, never `new Date(dateStr)`. */
export function formatLogDateLabel(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return String(dateStr)
    const weekday = WEEKDAYS[new Date(toEpochMs(parts)).getUTCDay()]
    return `${weekday} ${parts.d} ${MONTHS[parts.m - 1]}`
}

export default {
    LOG_WINDOW_DAYS, utcTodayStr, utcYesterdayStr, getLogDateRange, logDateProblem,
    isLogDateAllowed, resolveLogDate, describeLogDateProblem, formatLogDateLabel,
}
