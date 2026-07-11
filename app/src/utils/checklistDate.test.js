/**
 * checklistDate.test.js
 *
 * localDateStr is INTENTIONALLY local-timezone-dependent (the checklist's
 * "today" resets at the device's local midnight, not UTC). Tests therefore
 * build Date objects with the LOCAL constructor (new Date(y, mIdx, d, h, m))
 * so expectations hold in whatever timezone the runner uses — asserting
 * against ISO/UTC strings here would test the wrong semantics.
 */
import { describe, it, expect } from 'vitest'
import { localDateStr } from './checklistDate.js'

describe('localDateStr — local-midnight "today" rule', () => {
    it('formats a local date as YYYY-MM-DD with zero padding', () => {
        expect(localDateStr(new Date(2026, 6, 5, 12, 0))).toBe('2026-07-05') // month idx 6 = July
        expect(localDateStr(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
    })

    it('one minute before local midnight is still the same local day', () => {
        expect(localDateStr(new Date(2026, 6, 11, 23, 59))).toBe('2026-07-11')
    })

    it('local midnight exactly starts the next local day', () => {
        expect(localDateStr(new Date(2026, 6, 12, 0, 0))).toBe('2026-07-12')
    })

    it('uses LOCAL getters, not UTC (differs from toISOString near midnight in non-UTC zones)', () => {
        const d = new Date(2026, 6, 11, 0, 30) // 00:30 local
        // Whatever the runner's timezone, the LOCAL calendar date must win.
        expect(localDateStr(d)).toBe('2026-07-11')
    })

    it('handles month/year boundaries in local time', () => {
        expect(localDateStr(new Date(2025, 11, 31, 23, 59))).toBe('2025-12-31')
        expect(localDateStr(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
    })
})
