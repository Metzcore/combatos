/**
 * weightTrend.test.js — honest sparse-series aggregation (W30).
 *
 * The suite that matters most is SPARSE DATA. Every convenient charting
 * default lies about a missed week, and the subtlest — even spacing — silently
 * redraws a 3-month gap as if it were a week, changing the apparent slope of a
 * real trend in a sport where that slope is what the athlete is watching.
 */
import { describe, it, expect } from 'vitest'
import { buildWeightTrend, latestWeight, GAP_THRESHOLD_DAYS } from './weightTrend.js'

const A = 'owner-a'
const B = 'owner-b'
const r = (date, kg, ownerUserId = A) => ({ ownerUserId, date, kg })

describe('empty and defensive cases', () => {
    it('reports empty for no rows', () => {
        const out = buildWeightTrend([], { ownerUserId: A })
        expect(out).toMatchObject({ isEmpty: true, points: [], gaps: [], domain: null, change: null })
    })

    it('reports empty when there is no owner — never guesses', () => {
        // Rendering another identity's body weight would be a serious leak, so
        // "we cannot prove whose this is" must mean "show nothing".
        expect(buildWeightTrend([r('2026-07-01', 81)], {}).isEmpty).toBe(true)
        expect(buildWeightTrend([r('2026-07-01', 81)], { ownerUserId: null }).isEmpty).toBe(true)
    })

    it('survives junk input', () => {
        for (const bad of [null, undefined, 'rows', 42, {}]) {
            expect(buildWeightTrend(bad, { ownerUserId: A }).isEmpty).toBe(true)
        }
    })

    it('drops rows for other owners', () => {
        const out = buildWeightTrend([r('2026-07-01', 81), r('2026-07-02', 64, B)], { ownerUserId: A })
        expect(out.points).toHaveLength(1)
        expect(out.points[0].kg).toBe(81)
    })

    it('drops malformed rows rather than rendering them', () => {
        const out = buildWeightTrend([
            r('2026-07-01', 81),
            r('nope', 80), r('2026-02-30', 80),      // invalid dates
            r('2026-07-03', 0), r('2026-07-04', NaN), // invalid weights
            null, { ownerUserId: A },
        ], { ownerUserId: A })
        expect(out.points).toHaveLength(1)
    })
})

describe('single entry — no slope may be claimed', () => {
    it('flags hasSingleEntry and returns no change', () => {
        // "Stable" is a claim about a trend that one measurement cannot support.
        const out = buildWeightTrend([r('2026-07-01', 81.6)], { ownerUserId: A })
        expect(out).toMatchObject({ isEmpty: false, hasSingleEntry: true, change: null })
        expect(out.points).toHaveLength(1)
        expect(out.domain).toMatchObject({ minKg: 81.6, maxKg: 81.6, spanDays: 0 })
    })

    it('places a lone point at x=0 without dividing by zero', () => {
        const out = buildWeightTrend([r('2026-07-01', 81.6)], { ownerUserId: A })
        expect(out.points[0].x).toBe(0)
        expect(Number.isFinite(out.points[0].x)).toBe(true)
    })
})

describe('SPARSE DATA — position by real calendar date, never evenly spaced', () => {
    it('spaces points by actual elapsed days, not by index', () => {
        // Three entries: day 0, day 10, day 100. Even spacing would put the
        // middle point at x=0.5 and materially change the drawn slope.
        const out = buildWeightTrend([
            r('2026-01-01', 80), r('2026-01-11', 81), r('2026-04-11', 82),
        ], { ownerUserId: A })

        expect(out.points.map(p => p.x)).toEqual([0, 10 / 100, 1])
        expect(out.points[1].x).not.toBeCloseTo(0.5, 2)   // the lie, excluded
    })

    it('reports gaps explicitly so the renderer can break the line', () => {
        const out = buildWeightTrend([
            r('2026-01-01', 80), r('2026-01-03', 80.2), r('2026-03-01', 79),
        ], { ownerUserId: A })

        expect(out.gaps).toEqual([{ afterIndex: 1, days: 57 }])
    })

    it('does not flag ordinary weekly spacing as a gap', () => {
        const out = buildWeightTrend([
            r('2026-01-01', 80), r('2026-01-08', 80.2), r('2026-01-15', 80.1),
        ], { ownerUserId: A })
        expect(out.gaps).toEqual([])
        expect(GAP_THRESHOLD_DAYS).toBeGreaterThan(7)   // a missed week is not a gap
    })

    it('NEVER invents points to fill a gap', () => {
        // Zero-filling would draw a plunge to 0 kg that never happened;
        // interpolating would invent measurements the athlete never took.
        const out = buildWeightTrend([r('2026-01-01', 80), r('2026-06-01', 78)], { ownerUserId: A })
        expect(out.points).toHaveLength(2)
        expect(out.points.map(p => p.kg)).toEqual([80, 78])
    })
})

describe('ordering, domain and change', () => {
    it('sorts by date regardless of input order', () => {
        const out = buildWeightTrend([
            r('2026-03-01', 79), r('2026-01-01', 80), r('2026-02-01', 81),
        ], { ownerUserId: A })
        expect(out.points.map(p => p.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    })

    it('reports a truthful min/max domain', () => {
        const out = buildWeightTrend([
            r('2026-01-01', 80), r('2026-02-01', 83.4), r('2026-03-01', 78.2),
        ], { ownerUserId: A })
        expect(out.domain).toMatchObject({
            minKg: 78.2, maxKg: 83.4, firstDate: '2026-01-01', lastDate: '2026-03-01', spanDays: 59,
        })
    })

    it('states the first-to-last change factually, with a direction', () => {
        const down = buildWeightTrend([r('2026-01-01', 82), r('2026-02-01', 80)], { ownerUserId: A })
        expect(down.change).toMatchObject({ kg: -2, direction: 'down' })

        const up = buildWeightTrend([r('2026-01-01', 80), r('2026-02-01', 82)], { ownerUserId: A })
        expect(up.change).toMatchObject({ kg: 2, direction: 'up' })

        const flat = buildWeightTrend([r('2026-01-01', 80), r('2026-02-01', 80)], { ownerUserId: A })
        expect(flat.change).toMatchObject({ kg: 0, direction: 'flat' })
    })

    it('exposes no target, projection or verdict', () => {
        const out = buildWeightTrend([r('2026-01-01', 82), r('2026-02-01', 80)], { ownerUserId: A })
        for (const forbidden of ['target', 'goal', 'projected', 'onTrack', 'streak', 'score', 'rate']) {
            expect(out).not.toHaveProperty(forbidden)
            expect(out.change).not.toHaveProperty(forbidden)
        }
    })
})

describe('display unit', () => {
    it('converts every point for display without touching canonical kg', () => {
        const out = buildWeightTrend([r('2026-01-01', 81.647)], { ownerUserId: A, unit: 'lb' })
        expect(out.points[0].kg).toBe(81.647)      // canonical, untouched
        expect(out.points[0].display).toBe(180)    // presentation only
        expect(out.unit).toBe('lb')
    })

    it('defaults to kg', () => {
        const out = buildWeightTrend([r('2026-01-01', 81.647)], { ownerUserId: A })
        expect(out.points[0].display).toBe(81.6)
    })
})

describe('horizon window', () => {
    it('excludes rows older than the horizon when a today is given', () => {
        const out = buildWeightTrend([
            r('2024-01-01', 90), r('2026-07-01', 81),
        ], { ownerUserId: A, today: '2026-07-31', horizonDays: 365 })
        expect(out.points.map(p => p.date)).toEqual(['2026-07-01'])
    })

    it('keeps everything when no today is supplied', () => {
        const out = buildWeightTrend([r('2020-01-01', 90), r('2026-07-01', 81)], { ownerUserId: A })
        expect(out.points).toHaveLength(2)
    })
})

describe('latestWeight', () => {
    it('returns the newest row for this owner only', () => {
        const rows = [r('2026-01-01', 80), r('2026-03-01', 78), r('2026-06-01', 64, B)]
        expect(latestWeight(rows, A)).toMatchObject({ date: '2026-03-01', kg: 78 })
        expect(latestWeight(rows, B)).toMatchObject({ kg: 64 })
    })

    it('returns null when there is nothing valid or no owner', () => {
        expect(latestWeight([], A)).toBeNull()
        expect(latestWeight([r('2026-01-01', 80)], null)).toBeNull()
        expect(latestWeight([r('nope', 80)], A)).toBeNull()
        expect(latestWeight(null, A)).toBeNull()
    })
})
