/**
 * checklistStreak.test.js
 *
 * Streak = consecutive days completed, derived from a Set of YYYY-MM-DD
 * strings. Covers the W21 diagnostic's required cases: first completion,
 * today-incomplete grace, gaps, long runs, and month/year boundaries.
 */
import { describe, it, expect } from 'vitest'
import { computeStreak } from './checklistStreak.js'
import { addDays } from './dateMath.js'

const TODAY = '2026-07-11'

/** Builds a Set of `n` consecutive completed days ending at `end`. */
function run(end, n) {
    const dates = new Set()
    let cursor = end
    for (let i = 0; i < n; i++) {
        dates.add(cursor)
        cursor = addDays(cursor, -1)
    }
    return dates
}

describe('computeStreak', () => {
    it('returns 0 for no completions at all', () => {
        expect(computeStreak(new Set(), TODAY)).toBe(0)
    })

    it('returns 1 for a single completion today (first completion)', () => {
        expect(computeStreak(new Set([TODAY]), TODAY)).toBe(1)
    })

    it('counts today plus consecutive prior days', () => {
        expect(computeStreak(run(TODAY, 4), TODAY)).toBe(4)
    })

    it('today NOT done: keeps showing yesterday-anchored streak (grace, not zero)', () => {
        // 3-day run ending yesterday; today still incomplete
        expect(computeStreak(run('2026-07-10', 3), TODAY)).toBe(3)
    })

    it('today and yesterday both missed: streak is broken → 0', () => {
        expect(computeStreak(run('2026-07-09', 5), TODAY)).toBe(0)
    })

    it('a gap in the middle counts only the unbroken tail', () => {
        const dates = run(TODAY, 3) // 09..11 done
        dates.add('2026-07-06')     // older completions across a gap
        dates.add('2026-07-05')
        expect(computeStreak(dates, TODAY)).toBe(3)
    })

    it('handles long runs without off-by-one (40 days)', () => {
        expect(computeStreak(run(TODAY, 40), TODAY)).toBe(40)
    })

    it('counts across month boundaries', () => {
        // 5-day run ending 2026-07-02 → spans June 28..July 2
        expect(computeStreak(run('2026-07-02', 5), '2026-07-02')).toBe(5)
    })

    it('counts across year boundaries', () => {
        // 4-day run ending 2026-01-02 → spans Dec 30..Jan 2
        expect(computeStreak(run('2026-01-02', 4), '2026-01-02')).toBe(4)
    })

    it('unrelated completions (other tasks filtered upstream) never leak in — pure Set input', () => {
        // Documents the contract: the caller passes per-task dates only.
        const dates = new Set(['2026-07-11'])
        expect(computeStreak(dates, TODAY)).toBe(1)
    })
})
