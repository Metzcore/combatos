/**
 * weeklyStats.js — Weekly aggregation for the Log tab Stats view (W9)
 *
 * Pure calendar math over local Dexie `sessions` rows. No React, no Dexie
 * imports — fully unit-testable.
 *
 * Session dates are `YYYY-MM-DD` strings produced by
 * `new Date().toISOString().slice(0, 10)` in HUD.jsx handleLog — i.e. already
 * normalized calendar-date strings. To avoid timezone drift we never parse
 * them through local-time `new Date(string)` semantics: all arithmetic uses
 * `Date.UTC()` epoch values and `getUTC*` accessors, which is pure calendar
 * math independent of the runtime's timezone.
 *
 * Week convention: ISO week, Monday start (Mon..Sun).
 */

const DAY_MS = 86400000

/**
 * Parse a strict `YYYY-MM-DD` string into { y, m, d } integers.
 * Returns null for anything malformed or an impossible calendar date
 * (e.g. '2026-02-30').
 */
export function parseDateParts(dateStr) {
    if (typeof dateStr !== 'string') return null
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
    if (!match) return null
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    // Round-trip through Date.UTC to reject impossible dates (2026-02-30 etc.)
    const dt = new Date(Date.UTC(y, m - 1, d))
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
        return null
    }
    return { y, m, d }
}

function toEpochMs({ y, m, d }) {
    return Date.UTC(y, m - 1, d)
}

function epochMsToStr(ms) {
    const dt = new Date(ms)
    const pad = n => String(n).padStart(2, '0')
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/**
 * Returns the `YYYY-MM-DD` string of the Monday of the ISO week containing
 * `dateStr`, or null if the date is invalid.
 */
export function mondayOfWeek(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return null
    const ms = toEpochMs(parts)
    const dow = new Date(ms).getUTCDay() // 0 = Sunday .. 6 = Saturday
    const daysSinceMonday = (dow + 6) % 7 // Monday -> 0, Sunday -> 6
    return epochMsToStr(ms - daysSinceMonday * DAY_MS)
}

/**
 * Adds `days` calendar days to a `YYYY-MM-DD` string. Returns null on
 * invalid input.
 */
export function addDays(dateStr, days) {
    const parts = parseDateParts(dateStr)
    if (!parts) return null
    return epochMsToStr(toEpochMs(parts) + days * DAY_MS)
}

/**
 * Buckets sessions by the Monday of their ISO week.
 * Sessions with a missing/invalid `date` are skipped (they cannot be placed
 * on a calendar honestly).
 *
 * @param {Array<object>} sessions - raw Dexie session rows
 * @returns {Map<string, Array<object>>} weekStart ('YYYY-MM-DD' Monday) -> sessions
 */
export function bucketSessionsByWeek(sessions) {
    const buckets = new Map()
    for (const s of sessions || []) {
        const weekStart = mondayOfWeek(s?.date)
        if (!weekStart) continue
        if (!buckets.has(weekStart)) buckets.set(weekStart, [])
        buckets.get(weekStart).push(s)
    }
    return buckets
}

/**
 * Summarizes one week's sessions.
 *
 * - `avgCompleteness` averages `completeness` over S&C sessions ONLY —
 *   fight-gym sessions compute completeness against a different denominator
 *   and are not comparable. Returns null (not 0, not NaN) when the week has
 *   no S&C sessions.
 * - `hipTrend` is in DATE order (Dexie insertion order can diverge from
 *   date order), ties broken by insertion id.
 *
 * @param {Array<object>} weekSessions
 * @returns {{
 *   total: number, sc: number, fight: number,
 *   avgCompleteness: number|null,
 *   hipTrend: Array<{date: string, hipScore: number}>,
 *   daysCovered: number[], phases: number[]
 * }}
 */
export function summarizeWeek(weekSessions) {
    const sorted = [...(weekSessions || [])].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        return (a.id ?? 0) - (b.id ?? 0)
    })

    const total = sorted.length
    const sc = sorted.filter(s => s.sessionType === 'S&C').length
    const fight = total - sc

    const scWithCompleteness = sorted.filter(
        s => s.sessionType === 'S&C' && typeof s.completeness === 'number' && !Number.isNaN(s.completeness)
    )
    const avgCompleteness = scWithCompleteness.length > 0
        ? Math.round(
            (scWithCompleteness.reduce((sum, s) => sum + s.completeness, 0) / scWithCompleteness.length) * 10
        ) / 10
        : null

    const hipTrend = sorted
        .filter(s => typeof s.hipScore === 'number' && !Number.isNaN(s.hipScore))
        .map(s => ({ date: s.date, hipScore: s.hipScore }))

    const daysCovered = [...new Set(
        sorted.map(s => s.day).filter(d => typeof d === 'number')
    )].sort((a, b) => a - b)

    const phases = [...new Set(
        sorted.map(s => s.phase).filter(p => typeof p === 'number')
    )].sort((a, b) => a - b)

    return { total, sc, fight, avgCompleteness, hipTrend, daysCovered, phases }
}

/**
 * Builds the last-N-weeks stat list, newest week first, INCLUDING weeks with
 * zero sessions (honest gaps — a 3-week hole must be visible as three empty
 * entries, not silently compressed).
 *
 * @param {Array<object>} sessions - raw Dexie session rows
 * @param {object} [opts]
 * @param {number} [opts.weeks=8] - how many weeks back to include
 * @param {string} [opts.todayStr] - anchor date ('YYYY-MM-DD'). Defaults to
 *   the same convention the write path uses (`toISOString().slice(0,10)`),
 *   so "this week" always contains a session logged right now.
 * @returns {Array<{ weekStart: string, weekEnd: string } & ReturnType<typeof summarizeWeek>>}
 */
export function buildWeeklyStats(sessions, { weeks = 8, todayStr } = {}) {
    const anchor = todayStr ?? new Date().toISOString().slice(0, 10)
    const currentMonday = mondayOfWeek(anchor)
    if (!currentMonday) return []

    const buckets = bucketSessionsByWeek(sessions)
    const startMs = toEpochMs(parseDateParts(currentMonday))

    const out = []
    for (let i = 0; i < weeks; i++) {
        const weekStartMs = startMs - i * 7 * DAY_MS
        const weekStart = epochMsToStr(weekStartMs)
        const weekEnd = epochMsToStr(weekStartMs + 6 * DAY_MS)
        out.push({ weekStart, weekEnd, ...summarizeWeek(buckets.get(weekStart) || []) })
    }
    return out
}
