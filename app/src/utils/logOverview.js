/**
 * logOverview.js — pure aggregation for the Log hub's Overview tab (W26 Stage 1)
 *
 * Two functions, no React, no Dexie — same split as weeklyStats.js (math) /
 * WeeklyStats.jsx (thin renderer), per the `personal-analytics-viz` house
 * rule ("Aggregation is pure, tested, and out of the components").
 *
 * The Overview's third visual — the weekly completeness trend — deliberately
 * has NO function here: `buildWeeklyStats()` in weeklyStats.js already
 * returns `avgCompletenessCartridge` per week and already accepts a `weeks`
 * count. That strip is a new renderer over existing math, not new math.
 *
 * ── Two rules this module exists to keep honest ────────────────────────────
 *
 * 1. **Absence is data.** An empty past day, an empty future day, a week with
 *    no eligible session, and a session whose activity data is unknown are
 *    four DIFFERENT facts and are never collapsed into a zero. Coercing any
 *    of them to 0 would render a rest week, an unreached day, or a legacy row
 *    as a failure.
 * 2. **Never guess a category.** `sessionBucket()` returns null for a row
 *    whose category this build doesn't recognize; that null is preserved all
 *    the way to the renderer rather than being folded into a bucket.
 *
 * All date handling is `YYYY-MM-DD` string arithmetic through dateMath.js's
 * UTC helpers. Local-time `new Date('YYYY-MM-DD')` parsing is banned here
 * (it resolves to UTC midnight and then renders in local time, silently
 * shifting the day for any negative UTC offset).
 */

import { parseDateParts, toEpochMs } from './dateMath.js'
import { sessionBucket } from './sessionCategory.js'
import { SESSION_ACTIVITIES } from './cartridgeSessionPayload.js'

/**
 * Bucket precedence for a date carrying MORE THAN ONE session — a routine
 * case, not a hypothetical (the developer's own history has two sessions on
 * 2026-07-16). Training outranks non-training so a day that contains real
 * work never presents as a rest day.
 */
const BUCKET_PRIORITY = ['sc', 'combat', 'other', 'recovery', 'rest']

/** Buckets that represent an actual workout — the schema §7 `total` rule. */
const WORKOUT_BUCKETS = new Set(['sc', 'combat', 'other'])

const pad2 = n => String(n).padStart(2, '0')

/** Today as the write path produces it (`toISOString().slice(0,10)`), matching buildWeeklyStats. */
function defaultTodayStr() {
    return new Date().toISOString().slice(0, 10)
}

/**
 * Days in a 1-indexed month, via the UTC day-0 rollover trick. Independent
 * of the runtime timezone.
 */
function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Monday-first weekday index (Mon=0 … Sun=6) — same convention as mondayOfWeek(). */
function mondayFirstIndex(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return null
    return (new Date(toEpochMs(parts)).getUTCDay() + 6) % 7
}

/**
 * Groups sessions by their `date` string. Rows with a missing/malformed date
 * are skipped — they cannot be placed on a calendar honestly.
 */
function groupByDate(sessions) {
    const byDate = new Map()
    for (const s of sessions || []) {
        if (!parseDateParts(s?.date)) continue
        if (!byDate.has(s.date)) byDate.set(s.date, [])
        byDate.get(s.date).push(s)
    }
    return byDate
}

/**
 * buildMonthHeatmap — one calendar month as a Monday-first grid.
 *
 * @param {Array<object>} sessions - raw Dexie session rows (any mix of
 *   legacy, payloadVersion 1, and payloadVersion 2 shapes)
 * @param {object} opts
 * @param {number} opts.year - full year, e.g. 2026
 * @param {number} opts.month - 1-indexed month (1 = January)
 * @param {string} [opts.todayStr] - anchor for isToday/isFuture; defaults to
 *   the same convention the write path uses
 * @returns {{
 *   year: number,
 *   month: number,
 *   weeks: Array<Array<null | {
 *     date: string,
 *     bucket: 'sc'|'combat'|'other'|'rest'|'recovery'|null,
 *     sessionCount: number,
 *     isToday: boolean,
 *     isFuture: boolean
 *   }>>,
 *   counts: { sc: number, combat: number, other: number, rest: number, recovery: number, total: number }
 * }}
 *
 * Cell semantics:
 * - `null` entries are adjacent-month padding, rendered as nothing.
 * - `bucket: null` with `sessionCount: 0` is an empty day. Combined with
 *   `isFuture` the renderer distinguishes "nothing logged" from "not yet
 *   reached" — an unreached day must never read as a missed one.
 * - `bucket: null` with `sessionCount > 0` means a session exists whose
 *   category is unrecognized. Shown honestly as "something logged", never
 *   guessed into a bucket.
 *
 * `counts` are SESSION counts (not day counts), and `total` deliberately
 * EXCLUDES rest/recovery — byte-for-byte the same rule as `summarizeWeek()`'s
 * `total = sc + combat + other`, so "12 sessions" means the same thing on
 * this screen as it does on the weekly cards.
 */
export function buildMonthHeatmap(sessions, { year, month, todayStr } = {}) {
    const empty = {
        year, month, weeks: [],
        counts: { sc: 0, combat: 0, other: 0, rest: 0, recovery: 0, total: 0 },
    }
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return empty

    const today = todayStr ?? defaultTodayStr()
    const byDate = groupByDate(sessions)
    const counts = { sc: 0, combat: 0, other: 0, rest: 0, recovery: 0, total: 0 }

    const total = daysInMonth(year, month)
    const cells = []
    for (let d = 1; d <= total; d++) {
        const date = `${year}-${pad2(month)}-${pad2(d)}`
        const daySessions = byDate.get(date) || []

        let bucket = null
        for (const s of daySessions) {
            const b = sessionBucket(s)
            if (b === null) continue
            counts[b] += 1
            if (WORKOUT_BUCKETS.has(b)) counts.total += 1
            if (bucket === null || BUCKET_PRIORITY.indexOf(b) < BUCKET_PRIORITY.indexOf(bucket)) {
                bucket = b
            }
        }

        cells.push({
            date,
            bucket,
            sessionCount: daySessions.length,
            isToday: date === today,
            // String comparison is valid for zero-padded YYYY-MM-DD.
            isFuture: date > today,
        })
    }

    const lead = mondayFirstIndex(cells[0].date) ?? 0
    const slots = [...Array(lead).fill(null), ...cells]
    while (slots.length % 7 !== 0) slots.push(null)

    const weeks = []
    for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7))

    return { year, month, weeks, counts }
}

/**
 * buildActivityCoverage — how often each `sessionActivities` id was recorded
 * across the eligible workouts in a date range. Implements schema §8
 * (`docs/reference/session-payload-schema.md`) exactly.
 *
 * @param {Array<object>} sessions
 * @param {object} opts
 * @param {string} opts.sinceDateStr - inclusive `YYYY-MM-DD` lower bound
 * @param {string} opts.untilDateStr - inclusive `YYYY-MM-DD` upper bound
 * @returns {{
 *   eligible: number,
 *   unknown: number,
 *   activities: Array<{ id: string, count: number, pct: number|null }>
 * }}
 *
 * ── Schema §8's THREE states, not two ──────────────────────────────────────
 * For a workout session in range:
 * - `sessionActivities` **absent**  → *unknown*. Counted in `unknown`,
 *   excluded from BOTH numerator and denominator. This is every legacy row
 *   and every cartridge row predating the field (including `payloadVersion: 1`,
 *   §10). Coercing these to "none selected" would misrepresent old data as a
 *   worse record than it is.
 * - `[]`                            → *recorded, none selected*. Counts
 *   toward `eligible` (the denominator) only.
 * - non-empty array                 → counts toward both.
 *
 * "Workout session" is `sessionBucket(s) ∈ {sc, combat, other}` — rest and
 * recovery are never in the denominator. Note this is deliberately NOT
 * `isWorkoutCategory(categoryOf(s))`: that helper recognizes only the
 * cartridge category vocabulary, so a legacy 'S&C' row would fall through it
 * entirely and never even be reported as `unknown`. `sessionBucket()` is the
 * unified legacy+cartridge mapping and is what `weeklyStats.js` already
 * counts with. Do NOT "fix" `isWorkoutCategory` to close that gap — widening
 * it would pull legacy rows into the denominator, where §8 says they must
 * never appear.
 *
 * Within one session an id is counted ONCE even if the array repeats it, and
 * ids outside the frozen closed set are ignored. The validator rejects both
 * on write, so neither can reach a v2 row — but this function also reads v1
 * and hand-edited rows, and must not inflate a count off malformed data.
 *
 * `pct` is null (never 0) when `eligible` is 0 — "no eligible sessions" and
 * "0% of eligible sessions" are different facts and must not render alike.
 */
export function buildActivityCoverage(sessions, { sinceDateStr, untilDateStr } = {}) {
    const counts = new Map(SESSION_ACTIVITIES.map(id => [id, 0]))
    let eligible = 0
    let unknown = 0

    const inRange = date => (
        parseDateParts(date) !== null &&
        (!sinceDateStr || date >= sinceDateStr) &&
        (!untilDateStr || date <= untilDateStr)
    )

    for (const s of sessions || []) {
        if (!s || !inRange(s.date)) continue
        if (!WORKOUT_BUCKETS.has(sessionBucket(s))) continue

        const activities = s.sessionActivities
        if (!Array.isArray(activities)) {
            unknown += 1
            continue
        }

        eligible += 1
        const seen = new Set()
        for (const id of activities) {
            if (!counts.has(id) || seen.has(id)) continue
            seen.add(id)
            counts.set(id, counts.get(id) + 1)
        }
    }

    return {
        eligible,
        unknown,
        activities: SESSION_ACTIVITIES.map(id => {
            const count = counts.get(id)
            return {
                id,
                count,
                pct: eligible === 0 ? null : Math.round((count / eligible) * 1000) / 10,
            }
        }),
    }
}

export default { buildMonthHeatmap, buildActivityCoverage }
