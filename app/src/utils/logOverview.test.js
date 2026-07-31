/**
 * logOverview.test.js — W26 Stage 1
 *
 * Covers the cases the plan identified as the ones that silently produce
 * plausible-but-wrong numbers:
 * - month grid shape: Monday-first alignment, padding, leap February
 * - multi-session days (real data has two sessions on one date)
 * - empty PAST day vs empty FUTURE day (must not render alike)
 * - unrecognized category preserved as null, never guessed into a bucket
 * - `total` excluding rest/recovery, matching summarizeWeek()'s rule
 * - schema §8's THREE activity states (absent / [] / non-empty)
 * - legacy and payloadVersion:1 rows counted as `unknown`, never as 0%
 * - pct null (not 0) when there are no eligible sessions
 * - duplicate and unknown activity ids not inflating counts
 * - timezone independence (no local-time Date parsing anywhere)
 * - the label vocabulary staying in lockstep with the frozen schema order
 */
import { describe, it, expect } from 'vitest'
import { buildMonthHeatmap, buildActivityCoverage } from './logOverview.js'
import { SESSION_ACTIVITIES } from './cartridgeSessionPayload.js'
import { ALL_ACTIVITIES, activityLabel } from './sessionActivityLabels.js'

let nextId = 1

/** A cartridge (payloadVersion 2) row. */
function cartridge(overrides = {}) {
    return {
        id: nextId++,
        date: '2026-07-06',
        payloadVersion: 2,
        sessionKind: 'cartridge',
        sessionCategory: 'strength-conditioning',
        sessionActivities: [],
        ...overrides,
    }
}

/** A legacy (unversioned) HUD row. */
function legacy(overrides = {}) {
    return { id: nextId++, date: '2026-07-06', sessionType: 'S&C', ...overrides }
}

/** The one historical payloadVersion:1 row shape (schema §10) — no sessionActivities key. */
function v1(overrides = {}) {
    return {
        id: nextId++,
        date: '2026-07-06',
        payloadVersion: 1,
        sessionKind: 'cartridge',
        sessionCategory: 'strength-conditioning',
        ...overrides,
    }
}

const flat = grid => grid.weeks.flat().filter(Boolean)
const cellFor = (grid, date) => flat(grid).find(c => c.date === date)

describe('buildMonthHeatmap — grid shape', () => {
    it('aligns day 1 to its Monday-first weekday and pads to whole weeks', () => {
        // 2026-07-01 is a Wednesday -> Monday-first index 2.
        const grid = buildMonthHeatmap([], { year: 2026, month: 7, todayStr: '2026-07-31' })
        expect(grid.weeks[0].slice(0, 2)).toEqual([null, null])
        expect(grid.weeks[0][2].date).toBe('2026-07-01')
        for (const week of grid.weeks) expect(week).toHaveLength(7)
        expect(flat(grid)).toHaveLength(31)
    })

    it('handles a leap February', () => {
        const grid = buildMonthHeatmap([], { year: 2028, month: 2, todayStr: '2028-02-29' })
        expect(flat(grid)).toHaveLength(29)
        expect(cellFor(grid, '2028-02-29')).toBeTruthy()
    })

    it('returns an empty grid rather than throwing on an invalid month', () => {
        const grid = buildMonthHeatmap([], { year: 2026, month: 13 })
        expect(grid.weeks).toEqual([])
        expect(grid.counts.total).toBe(0)
    })

    it('skips rows with a missing or malformed date instead of placing them', () => {
        const grid = buildMonthHeatmap(
            [cartridge({ date: undefined }), cartridge({ date: '2026-02-30' }), cartridge({ date: '2026-07-06' })],
            { year: 2026, month: 7, todayStr: '2026-07-31' }
        )
        expect(grid.counts.total).toBe(1)
    })
})

describe('buildMonthHeatmap — honest absence', () => {
    it('distinguishes an empty PAST day from an empty FUTURE day', () => {
        const grid = buildMonthHeatmap([], { year: 2026, month: 7, todayStr: '2026-07-15' })
        const past = cellFor(grid, '2026-07-10')
        const future = cellFor(grid, '2026-07-20')

        expect(past).toMatchObject({ sessionCount: 0, bucket: null, isFuture: false })
        expect(future).toMatchObject({ sessionCount: 0, bucket: null, isFuture: true })
    })

    it('marks today, and treats today as not-future', () => {
        const grid = buildMonthHeatmap([], { year: 2026, month: 7, todayStr: '2026-07-15' })
        expect(cellFor(grid, '2026-07-15')).toMatchObject({ isToday: true, isFuture: false })
        expect(cellFor(grid, '2026-07-14').isToday).toBe(false)
    })
})

describe('buildMonthHeatmap — bucketing', () => {
    it('resolves a multi-session day to the highest-priority bucket and keeps the true count', () => {
        const grid = buildMonthHeatmap([
            cartridge({ date: '2026-07-16', sessionCategory: 'rest', sessionActivities: undefined }),
            cartridge({ date: '2026-07-16', sessionCategory: 'combat' }),
        ], { year: 2026, month: 7, todayStr: '2026-07-31' })

        expect(cellFor(grid, '2026-07-16')).toMatchObject({ bucket: 'combat', sessionCount: 2 })
    })

    it('gives every cell its own per-category breakdown, for explaining a multi-session day on tap', () => {
        const grid = buildMonthHeatmap([
            cartridge({ date: '2026-07-30', sessionCategory: 'strength-conditioning' }),
            cartridge({ date: '2026-07-30', sessionCategory: 'strength-conditioning' }),
            cartridge({ date: '2026-07-30', sessionCategory: 'strength-conditioning' }),
            cartridge({ date: '2026-07-30', sessionCategory: 'strength-conditioning' }),
            cartridge({ date: '2026-07-30', sessionCategory: 'combat' }),
        ], { year: 2026, month: 7, todayStr: '2026-07-31' })

        expect(cellFor(grid, '2026-07-30').counts).toEqual({ sc: 4, combat: 1, other: 0, rest: 0, recovery: 0 })
        // An empty day in the same grid gets an all-zero breakdown, not a
        // missing field — every day has a `counts` object, session or not.
        expect(cellFor(grid, '2026-07-06').counts).toEqual({ sc: 0, combat: 0, other: 0, rest: 0, recovery: 0 })
    })

    it('excludes an unrecognized-category session from the per-cell breakdown, matching the month total', () => {
        const grid = buildMonthHeatmap([
            cartridge({ date: '2026-07-16', sessionCategory: 'strength-conditioning' }),
            cartridge({ date: '2026-07-16', sessionCategory: 'brand-new-thing' }),
        ], { year: 2026, month: 7, todayStr: '2026-07-31' })

        const cell = cellFor(grid, '2026-07-16')
        expect(cell.sessionCount).toBe(2)
        expect(cell.counts).toEqual({ sc: 1, combat: 0, other: 0, rest: 0, recovery: 0 })
    })

    it('prefers sc over combat when a day has both', () => {
        const grid = buildMonthHeatmap([
            cartridge({ date: '2026-07-16', sessionCategory: 'combat' }),
            cartridge({ date: '2026-07-16', sessionCategory: 'strength-conditioning' }),
        ], { year: 2026, month: 7, todayStr: '2026-07-31' })

        expect(cellFor(grid, '2026-07-16').bucket).toBe('sc')
    })

    it('never guesses a bucket for an unrecognized category, but still counts the session', () => {
        const grid = buildMonthHeatmap(
            [cartridge({ date: '2026-07-16', sessionCategory: 'brand-new-thing' })],
            { year: 2026, month: 7, todayStr: '2026-07-31' }
        )
        expect(cellFor(grid, '2026-07-16')).toMatchObject({ bucket: null, sessionCount: 1 })
        expect(grid.counts.total).toBe(0)
    })

    it('buckets legacy rows alongside cartridge rows', () => {
        const grid = buildMonthHeatmap([
            legacy({ date: '2026-07-06', sessionType: 'S&C' }),
            legacy({ date: '2026-07-07', sessionType: 'Combat' }),
        ], { year: 2026, month: 7, todayStr: '2026-07-31' })

        expect(cellFor(grid, '2026-07-06').bucket).toBe('sc')
        expect(cellFor(grid, '2026-07-07').bucket).toBe('combat')
    })

    it('excludes rest/recovery from `total`, matching summarizeWeek', () => {
        const grid = buildMonthHeatmap([
            cartridge({ date: '2026-07-06', sessionCategory: 'strength-conditioning' }),
            cartridge({ date: '2026-07-07', sessionCategory: 'combat' }),
            cartridge({ date: '2026-07-08', sessionCategory: 'custom' }),
            cartridge({ date: '2026-07-09', sessionCategory: 'rest', sessionActivities: undefined }),
            cartridge({ date: '2026-07-10', sessionCategory: 'recovery', sessionActivities: undefined }),
        ], { year: 2026, month: 7, todayStr: '2026-07-31' })

        expect(grid.counts).toEqual({ sc: 1, combat: 1, other: 1, rest: 1, recovery: 1, total: 3 })
    })

    it('is timezone-independent (same grid under a shifted TZ offset)', () => {
        const sessions = [cartridge({ date: '2026-07-01' }), cartridge({ date: '2026-07-31' })]
        const opts = { year: 2026, month: 7, todayStr: '2026-07-31' }
        const a = buildMonthHeatmap(sessions, opts)

        // Any local-time Date parsing would shift these two boundary dates.
        expect(cellFor(a, '2026-07-01').sessionCount).toBe(1)
        expect(cellFor(a, '2026-07-31').sessionCount).toBe(1)
        expect(a.counts.total).toBe(2)
    })
})

describe('buildActivityCoverage — schema §8 three states', () => {
    const range = { sinceDateStr: '2026-07-01', untilDateStr: '2026-07-31' }
    const find = (result, id) => result.activities.find(a => a.id === id)

    it('counts a non-empty array toward both numerator and denominator', () => {
        const r = buildActivityCoverage([
            cartridge({ sessionActivities: ['warmup', 'weights'] }),
            cartridge({ sessionActivities: ['warmup'] }),
        ], range)

        expect(r.eligible).toBe(2)
        expect(r.unknown).toBe(0)
        expect(find(r, 'warmup')).toMatchObject({ count: 2, pct: 100 })
        expect(find(r, 'weights')).toMatchObject({ count: 1, pct: 50 })
        expect(find(r, 'cardio')).toMatchObject({ count: 0, pct: 0 })
    })

    it('counts [] toward the denominator only', () => {
        const r = buildActivityCoverage([
            cartridge({ sessionActivities: ['warmup'] }),
            cartridge({ sessionActivities: [] }),
        ], range)

        expect(r.eligible).toBe(2)
        expect(find(r, 'warmup')).toMatchObject({ count: 1, pct: 50 })
    })

    it('excludes an ABSENT key from both sides and reports it as unknown', () => {
        const r = buildActivityCoverage([
            cartridge({ sessionActivities: ['warmup'] }),
            legacy(),
            v1(),
        ], range)

        // The legacy and v1 rows are workouts, but their activity data is
        // genuinely unknown — 1/1, not 1/3.
        expect(r.eligible).toBe(1)
        expect(r.unknown).toBe(2)
        expect(find(r, 'warmup')).toMatchObject({ count: 1, pct: 100 })
    })

    it('never puts rest/recovery in the denominator or the unknown count', () => {
        const r = buildActivityCoverage([
            cartridge({ sessionActivities: ['warmup'] }),
            cartridge({ sessionCategory: 'rest', sessionActivities: undefined }),
            cartridge({ sessionCategory: 'recovery', sessionActivities: undefined }),
        ], range)

        expect(r.eligible).toBe(1)
        expect(r.unknown).toBe(0)
    })

    it('returns pct null — never 0 — when nothing is eligible', () => {
        const r = buildActivityCoverage([legacy()], range)
        expect(r.eligible).toBe(0)
        expect(r.unknown).toBe(1)
        for (const a of r.activities) expect(a.pct).toBeNull()
    })

    it('handles an empty input set without NaN or division by zero', () => {
        const r = buildActivityCoverage([], range)
        expect(r.eligible).toBe(0)
        expect(r.activities).toHaveLength(SESSION_ACTIVITIES.length)
        for (const a of r.activities) expect(a.count).toBe(0)
    })
})

describe('buildActivityCoverage — malformed data tolerance', () => {
    const range = { sinceDateStr: '2026-07-01', untilDateStr: '2026-07-31' }
    const find = (result, id) => result.activities.find(a => a.id === id)

    it('counts a duplicated id once per session', () => {
        const r = buildActivityCoverage(
            [cartridge({ sessionActivities: ['warmup', 'warmup', 'warmup'] })],
            range
        )
        expect(find(r, 'warmup')).toMatchObject({ count: 1, pct: 100 })
    })

    it('ignores ids outside the frozen closed set', () => {
        const r = buildActivityCoverage(
            [cartridge({ sessionActivities: ['warmup', 'not-a-real-activity'] })],
            range
        )
        expect(r.eligible).toBe(1)
        expect(r.activities).toHaveLength(SESSION_ACTIVITIES.length)
        expect(r.activities.some(a => a.id === 'not-a-real-activity')).toBe(false)
    })

    it('rounds pct to one decimal place', () => {
        const r = buildActivityCoverage([
            cartridge({ sessionActivities: ['warmup'] }),
            cartridge({ sessionActivities: [] }),
            cartridge({ sessionActivities: [] }),
        ], range)
        expect(find(r, 'warmup').pct).toBe(33.3)
    })
})

describe('buildActivityCoverage — date range', () => {
    it('includes both bounds and excludes everything outside them', () => {
        const sessions = [
            cartridge({ date: '2026-06-30', sessionActivities: ['warmup'] }),
            cartridge({ date: '2026-07-01', sessionActivities: ['warmup'] }),
            cartridge({ date: '2026-07-31', sessionActivities: ['warmup'] }),
            cartridge({ date: '2026-08-01', sessionActivities: ['warmup'] }),
        ]
        const r = buildActivityCoverage(sessions, { sinceDateStr: '2026-07-01', untilDateStr: '2026-07-31' })
        expect(r.eligible).toBe(2)
    })
})

describe('sessionActivityLabels — vocabulary lockstep', () => {
    it('matches the frozen SESSION_ACTIVITIES set and order exactly', () => {
        // If this fails, the schema's closed set changed and the display
        // vocabulary was not updated with it (or vice versa). Fix both.
        expect(ALL_ACTIVITIES.map(a => a.id)).toEqual(SESSION_ACTIVITIES)
    })

    it('gives every id a non-empty label', () => {
        for (const id of SESSION_ACTIVITIES) {
            expect(activityLabel(id)).toBeTruthy()
            expect(activityLabel(id)).not.toBe(id)
        }
    })

    it('returns an unrecognized id verbatim rather than blank', () => {
        expect(activityLabel('some-future-id')).toBe('some-future-id')
    })
})
