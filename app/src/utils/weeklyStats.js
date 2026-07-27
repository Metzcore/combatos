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
 *
 * The generic date-string arithmetic (parseDateParts / addDays and friends)
 * was extracted VERBATIM to utils/dateMath.js in W21 so other features can
 * use it without importing this stats-scoped module. It is imported and
 * re-exported here so this module's public API is unchanged.
 *
 * A7a corrective pass (finding #6): category counting is now
 * `sessionBucket`-driven (utils/sessionCategory.js), tolerant across
 * legacy/v1/v2 rows, per the FROZEN schema §7 rules (D11) — this is not a
 * new/invented aggregation, it is the already-ruled contract:
 *   - `sc` / `combat` / `other` replace the old binary `sc`/`fight` split —
 *     a cartridge `strength-conditioning`/`combat`/`custom` row buckets
 *     correctly instead of being silently folded into "fight".
 *   - `restDays` / `recoveryDays` are counted separately and EXCLUDED from
 *     `total` (`total = sc + combat + other`).
 *   - `avgCompletenessLegacy` / `avgCompletenessCartridge` are NEVER
 *     averaged together; `completenessMixed` is true only when both exist
 *     for the week, so a mixed week can show both figures honestly.
 */

import { DAY_MS, parseDateParts, toEpochMs, epochMsToStr, addDays } from './dateMath.js'
import { sessionBucket } from './sessionCategory.js'
import { isReadableCartridgeRow } from './cartridgeSessionPayload.js'

export { parseDateParts, addDays }

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
 * - `sc`/`combat`/`other` are counted via `sessionBucket()` (mixed legacy/
 *   v1/v2 tolerant); `total = sc + combat + other`. `restDays`/`recoveryDays`
 *   are reported separately and excluded from `total` — a rest/recovery
 *   cartridge row is a real day, but not a "session" for this count.
 * - `avgCompletenessLegacy` averages `completeness` over LEGACY 'S&C'
 *   sessions only (byte-identical to the pre-A7a `avgCompleteness` calc).
 *   `avgCompletenessCartridge` averages it over cartridge
 *   `strength-conditioning` sessions with a numeric `completeness` (only
 *   training days with measurable strength/core/PAP units carry one). The
 *   two are NEVER averaged together; each is null (not 0/NaN) when its own
 *   week has no matching sessions. `completenessMixed` is true only when
 *   BOTH exist for the same week.
 * - `hipTrend` is in DATE order (Dexie insertion order can diverge from
 *   date order), ties broken by insertion id. Legacy-only (cartridge rows
 *   never carry `hipScore`).
 * - `daysCovered`/`phases` are likewise legacy-only concepts (cartridge
 *   rows never carry numeric `day`/`phase`), unchanged from before.
 *
 * @param {Array<object>} weekSessions
 * @returns {{
 *   total: number, sc: number, combat: number, other: number,
 *   restDays: number, recoveryDays: number,
 *   avgCompletenessLegacy: number|null, avgCompletenessCartridge: number|null,
 *   completenessMixed: boolean,
 *   hipTrend: Array<{date: string, hipScore: number}>,
 *   daysCovered: number[], phases: number[]
 * }}
 */
export function summarizeWeek(weekSessions) {
    const sorted = [...(weekSessions || [])].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        return (a.id ?? 0) - (b.id ?? 0)
    })

    let sc = 0, combat = 0, other = 0, restDays = 0, recoveryDays = 0
    for (const s of sorted) {
        switch (sessionBucket(s)) {
            case 'sc': sc++; break
            case 'combat': combat++; break
            case 'other': other++; break
            case 'rest': restDays++; break
            case 'recovery': recoveryDays++; break
            default: break // unrecognized category — counted nowhere, never guessed
        }
    }
    const total = sc + combat + other

    const hasNumericCompleteness = s => typeof s.completeness === 'number' && !Number.isNaN(s.completeness)
    const average = list => list.length > 0
        ? Math.round((list.reduce((sum, s) => sum + s.completeness, 0) / list.length) * 10) / 10
        : null

    const legacyScWithCompleteness = sorted.filter(
        s => sessionBucket(s) === 'sc' && !isReadableCartridgeRow(s) && hasNumericCompleteness(s)
    )
    const cartridgeScWithCompleteness = sorted.filter(
        s => sessionBucket(s) === 'sc' && isReadableCartridgeRow(s) && hasNumericCompleteness(s)
    )
    const avgCompletenessLegacy = average(legacyScWithCompleteness)
    const avgCompletenessCartridge = average(cartridgeScWithCompleteness)
    const completenessMixed = avgCompletenessLegacy !== null && avgCompletenessCartridge !== null

    const hipTrend = sorted
        .filter(s => typeof s.hipScore === 'number' && !Number.isNaN(s.hipScore))
        .map(s => ({ date: s.date, hipScore: s.hipScore }))

    const daysCovered = [...new Set(
        sorted.map(s => s.day).filter(d => typeof d === 'number')
    )].sort((a, b) => a - b)

    const phases = [...new Set(
        sorted.map(s => s.phase).filter(p => typeof p === 'number')
    )].sort((a, b) => a - b)

    return {
        total, sc, combat, other, restDays, recoveryDays,
        avgCompletenessLegacy, avgCompletenessCartridge, completenessMixed,
        hipTrend, daysCovered, phases,
    }
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
