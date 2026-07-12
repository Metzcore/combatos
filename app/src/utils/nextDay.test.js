/**
 * nextDay.test.js
 *
 * Pins the next-day calculation: (day % 7) + 1, a 7-day cycle with 7
 * wrapping back to 1 (decision D2, implemented in roadmap item W16).
 */
import { describe, it, expect } from 'vitest'
import { nextDay } from './nextDay.js'

describe('nextDay — 7-day cycle (D2 / W16)', () => {
    it.each([
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 1] // wrap
    ])('day %i -> next day %i', (day, expected) => {
        expect(nextDay(day)).toBe(expected)
    })
})
