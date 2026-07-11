/**
 * dateMath.js — pure `YYYY-MM-DD` calendar-string arithmetic (W21 extraction)
 *
 * Extracted verbatim from weeklyStats.js (W9) so feature modules that need
 * calendar math (the W21 checklist streak logic) don't have to import a
 * module scoped to the Log tab's stats view. No React, no Dexie.
 *
 * All arithmetic uses `Date.UTC()` epoch values and `getUTC*` accessors —
 * pure calendar math over date STRINGS, independent of the runtime's
 * timezone. (Producing a local "today" string is deliberately NOT this
 * module's job — see checklistDate.js for that.)
 */

export const DAY_MS = 86400000

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

export function toEpochMs({ y, m, d }) {
    return Date.UTC(y, m - 1, d)
}

export function epochMsToStr(ms) {
    const dt = new Date(ms)
    const pad = n => String(n).padStart(2, '0')
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
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
