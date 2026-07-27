/**
 * weeklyStats.test.js
 *
 * Covers the W9 diagnostic's identified risk cases:
 * - ISO week boundaries (Sunday/Monday transition, year boundary)
 * - timezone-independence (pure string/UTC calendar math)
 * - empty weeks (zero sessions -> no NaN / no division by zero)
 * - all-fight-gym weeks (avgCompleteness must be null, not 0/NaN)
 * - insertion order vs date order divergence (hip trend must be date-ordered)
 * - invalid/missing dates skipped from bucketing
 */
import { describe, it, expect } from 'vitest'
import {
    parseDateParts,
    mondayOfWeek,
    addDays,
    bucketSessionsByWeek,
    summarizeWeek,
    buildWeeklyStats
} from './weeklyStats.js'

// Minimal session factory matching the shape HUD.jsx handleLog writes
let nextId = 1
function session(overrides = {}) {
    return {
        id: nextId++,
        date: '2026-07-06',
        day: 1,
        phase: 2,
        hipScore: 4,
        sessionType: 'S&C',
        completeness: 80,
        ...overrides
    }
}

describe('parseDateParts', () => {
    it('parses a valid YYYY-MM-DD string', () => {
        expect(parseDateParts('2026-07-10')).toEqual({ y: 2026, m: 7, d: 10 })
    })

    it.each([
        [null],
        [undefined],
        [''],
        ['garbage'],
        ['2026-7-10'],       // not zero-padded
        ['2026-02-30'],      // impossible calendar date
        ['2026-13-01'],      // impossible month
        ['2026-07-10T12:00'] // timestamp, not a bare date
    ])('rejects invalid input %j', (input) => {
        expect(parseDateParts(input)).toBeNull()
    })
})

describe('mondayOfWeek — ISO week, Monday start', () => {
    it.each([
        ['2026-07-06', '2026-07-06'], // Monday maps to itself
        ['2026-07-10', '2026-07-06'], // Friday
        ['2026-07-12', '2026-07-06'], // Sunday -> the PREVIOUS Monday
        ['2026-07-13', '2026-07-13'], // next Monday starts a new week
        ['2026-01-01', '2025-12-29'], // year boundary: Thu Jan 1 belongs to a week starting in 2025
        ['2025-12-29', '2025-12-29']  // that cross-year Monday maps to itself
    ])('%s -> week of %s', (input, expected) => {
        expect(mondayOfWeek(input)).toBe(expected)
    })

    it('returns null for invalid dates', () => {
        expect(mondayOfWeek('not-a-date')).toBeNull()
        expect(mondayOfWeek(undefined)).toBeNull()
    })
})

describe('addDays', () => {
    it('adds days across month boundaries', () => {
        expect(addDays('2026-06-29', 6)).toBe('2026-07-05')
    })
    it('adds days across year boundaries', () => {
        expect(addDays('2025-12-29', 6)).toBe('2026-01-04')
    })
})

describe('bucketSessionsByWeek', () => {
    it('puts Sunday and the following Monday into DIFFERENT weeks', () => {
        const sun = session({ date: '2026-07-12' })
        const mon = session({ date: '2026-07-13' })
        const buckets = bucketSessionsByWeek([sun, mon])
        expect(buckets.get('2026-07-06')).toEqual([sun])
        expect(buckets.get('2026-07-13')).toEqual([mon])
    })

    it('groups a full Mon-Sun span into one week', () => {
        const sessions = ['2026-07-06', '2026-07-08', '2026-07-12'].map(date => session({ date }))
        const buckets = bucketSessionsByWeek(sessions)
        expect(buckets.size).toBe(1)
        expect(buckets.get('2026-07-06')).toHaveLength(3)
    })

    it('skips sessions with missing or invalid dates', () => {
        const good = session({ date: '2026-07-10' })
        const buckets = bucketSessionsByWeek([
            good,
            session({ date: undefined }),
            session({ date: 'Unknown Date' })
        ])
        expect(buckets.size).toBe(1)
        expect(buckets.get('2026-07-06')).toEqual([good])
    })

    it('handles null/undefined input without throwing', () => {
        expect(bucketSessionsByWeek(null).size).toBe(0)
        expect(bucketSessionsByWeek(undefined).size).toBe(0)
    })
})

describe('summarizeWeek', () => {
    it('splits sc/combat/other counts', () => {
        const result = summarizeWeek([
            session({ sessionType: 'S&C' }),
            session({ sessionType: 'S&C' }),
            session({ sessionType: 'Combat', day: 2 }),
            session({ sessionType: 'Cardio', day: 4 }),
            session({ sessionType: 'Mobility', day: 2 })
        ])
        expect(result.total).toBe(5)
        expect(result.sc).toBe(2)
        expect(result.combat).toBe(1)
        expect(result.other).toBe(2) // Cardio + Mobility
    })

    it('averages completeness over legacy S&C sessions ONLY', () => {
        const result = summarizeWeek([
            session({ sessionType: 'S&C', completeness: 100 }),
            session({ sessionType: 'S&C', completeness: 50 }),
            // fight-gym completeness uses a different denominator — must be excluded
            session({ sessionType: 'Combat', day: 2, completeness: 0 })
        ])
        expect(result.avgCompletenessLegacy).toBe(75)
        expect(result.avgCompletenessCartridge).toBeNull()
        expect(result.completenessMixed).toBe(false)
    })

    it('rounds average completeness to one decimal', () => {
        const result = summarizeWeek([
            session({ completeness: 66.6 }),
            session({ completeness: 66.7 }),
            session({ completeness: 66.7 })
        ])
        expect(result.avgCompletenessLegacy).toBe(66.7)
    })

    it('returns null avgCompletenessLegacy for an ALL-fight-gym week (no NaN, no 0)', () => {
        const result = summarizeWeek([
            session({ sessionType: 'Combat', day: 2, completeness: 0 }),
            session({ sessionType: 'Cardio', day: 4, completeness: 0 })
        ])
        expect(result.avgCompletenessLegacy).toBeNull()
        expect(result.total).toBe(2)
        expect(result.combat).toBe(1)
        expect(result.other).toBe(1)
    })

    it('returns safe zeros/null for an EMPTY week (no division by zero)', () => {
        const result = summarizeWeek([])
        expect(result).toEqual({
            total: 0, sc: 0, combat: 0, other: 0, restDays: 0, recoveryDays: 0,
            avgCompletenessLegacy: null, avgCompletenessCartridge: null, completenessMixed: false,
            hipTrend: [], daysCovered: [], phases: []
        })
    })

    // A7a corrective pass (finding #6) — mixed legacy/v1/v2 weeks.
    function cartridgeSession({ sessionCategory, completeness, payloadVersion = 2, date = '2026-07-07' } = {}) {
        return {
            payloadVersion, sessionKind: 'cartridge', sessionId: `c-${nextId++}`,
            date, completedAt: `${date}T18:00:00.000Z`, sessionCategory,
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: sessionCategory === 'rest' || sessionCategory === 'recovery' ? sessionCategory : 'training',
            phaseId: null, blocks: [],
            ...(completeness !== undefined ? { completeness } : {}),
        }
    }

    it('a cartridge strength-conditioning/combat/custom session is bucketed correctly, not folded into "combat"', () => {
        const result = summarizeWeek([
            cartridgeSession({ sessionCategory: 'strength-conditioning' }),
            cartridgeSession({ sessionCategory: 'combat' }),
            cartridgeSession({ sessionCategory: 'custom' }),
        ])
        expect(result.sc).toBe(1)
        expect(result.combat).toBe(1)
        expect(result.other).toBe(1)
        expect(result.total).toBe(3)
    })

    it('rest/recovery cartridge sessions are excluded from total and counted separately', () => {
        const result = summarizeWeek([
            session({ sessionType: 'S&C' }),
            cartridgeSession({ sessionCategory: 'rest' }),
            cartridgeSession({ sessionCategory: 'recovery' }),
        ])
        expect(result.total).toBe(1) // only the legacy S&C session
        expect(result.restDays).toBe(1)
        expect(result.recoveryDays).toBe(1)
    })

    it('legacy and cartridge completeness averages are never blended; a mixed week exposes both', () => {
        const result = summarizeWeek([
            session({ sessionType: 'S&C', completeness: 100 }),
            cartridgeSession({ sessionCategory: 'strength-conditioning', completeness: 0 }),
        ])
        expect(result.avgCompletenessLegacy).toBe(100)
        expect(result.avgCompletenessCartridge).toBe(0)
        expect(result.completenessMixed).toBe(true)
    })

    it('a payloadVersion:1 historical row contributes to the cartridge average exactly like a v2 row', () => {
        const result = summarizeWeek([
            cartridgeSession({ sessionCategory: 'strength-conditioning', completeness: 40, payloadVersion: 1 }),
            cartridgeSession({ sessionCategory: 'strength-conditioning', completeness: 60, payloadVersion: 2 }),
        ])
        expect(result.avgCompletenessCartridge).toBe(50)
    })

    it('a cartridge training session with no measurable units (no completeness field) never breaks the average', () => {
        const result = summarizeWeek([
            cartridgeSession({ sessionCategory: 'strength-conditioning' }), // no completeness key
        ])
        expect(result.avgCompletenessCartridge).toBeNull()
        expect(result.sc).toBe(1) // still counted as a session, just not in the completeness average
    })

    it('orders hipTrend by DATE even when insertion (id) order diverges', () => {
        // Inserted newest-date-first: id order is the REVERSE of date order
        const result = summarizeWeek([
            session({ date: '2026-07-11', hipScore: 5 }), // lower id, later date
            session({ date: '2026-07-08', hipScore: 2 }),
            session({ date: '2026-07-06', hipScore: 3 })  // higher id, earliest date
        ])
        expect(result.hipTrend).toEqual([
            { date: '2026-07-06', hipScore: 3 },
            { date: '2026-07-08', hipScore: 2 },
            { date: '2026-07-11', hipScore: 5 }
        ])
    })

    it('breaks same-date ties by insertion id', () => {
        const a = session({ date: '2026-07-06', hipScore: 2 })
        const b = session({ date: '2026-07-06', hipScore: 4 })
        // Pass in reverse insertion order
        const result = summarizeWeek([b, a])
        expect(result.hipTrend.map(h => h.hipScore)).toEqual([2, 4])
    })

    it('reports sorted unique day coverage and phases', () => {
        const result = summarizeWeek([
            session({ day: 5, phase: 2 }),
            session({ day: 1, phase: 2 }),
            session({ day: 5, phase: 3 }) // duplicate day, week spans a phase change
        ])
        expect(result.daysCovered).toEqual([1, 5])
        expect(result.phases).toEqual([2, 3])
    })
})

describe('buildWeeklyStats', () => {
    it('returns the requested number of weeks, newest first, anchored on todayStr', () => {
        const result = buildWeeklyStats([], { weeks: 8, todayStr: '2026-07-10' })
        expect(result).toHaveLength(8)
        expect(result[0].weekStart).toBe('2026-07-06')
        expect(result[0].weekEnd).toBe('2026-07-12')
        expect(result[7].weekStart).toBe('2026-05-18')
        expect(result[7].weekEnd).toBe('2026-05-24')
    })

    it('includes zero-session gap weeks as explicit empty entries', () => {
        const sessions = [
            session({ date: '2026-07-10' }), // this week
            session({ date: '2026-06-24' })  // two weeks back — one-week GAP between
        ]
        const result = buildWeeklyStats(sessions, { weeks: 3, todayStr: '2026-07-10' })
        expect(result.map(w => w.total)).toEqual([1, 0, 1])
        expect(result[1].weekStart).toBe('2026-06-29') // the gap week is present, not skipped
        expect(result[1].avgCompletenessLegacy).toBeNull()
    })

    it('handles a completely empty sessions array (all-empty weeks, no NaN)', () => {
        const result = buildWeeklyStats([], { weeks: 4, todayStr: '2026-07-10' })
        expect(result.every(w => w.total === 0 && w.avgCompletenessLegacy === null)).toBe(true)
    })

    it('spans a year boundary correctly', () => {
        const result = buildWeeklyStats(
            [session({ date: '2025-12-31' })],
            { weeks: 2, todayStr: '2026-01-05' }
        )
        // Week of Jan 5 2026 (Mon), then week of Dec 29 2025 containing the session
        expect(result[0].weekStart).toBe('2026-01-05')
        expect(result[1].weekStart).toBe('2025-12-29')
        expect(result[1].weekEnd).toBe('2026-01-04')
        expect(result[1].total).toBe(1)
    })

    it('returns [] for an invalid anchor date', () => {
        expect(buildWeeklyStats([], { todayStr: 'garbage' })).toEqual([])
    })
})
