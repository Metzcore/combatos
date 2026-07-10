/**
 * nextDay.test.js
 *
 * Pins CURRENT behavior of the next-day calculation: (day % 6) + 1, a 6-day
 * cycle with 6 wrapping back to 1.
 *
 * NOTE — decision D2 (docs/planning/roadmap/OPEN-DECISIONS.md) will extend
 * the training cycle to 7 days in roadmap item W16. These tests document
 * current reality, not the future spec, and will need to be updated when
 * W16 lands.
 */
import { describe, it, expect } from 'vitest'
import { nextDay } from './nextDay.js'

describe('nextDay — current 6-day cycle behavior', () => {
    it.each([
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 1] // wrap
    ])('day %i -> next day %i', (day, expected) => {
        expect(nextDay(day)).toBe(expected)
    })
})
