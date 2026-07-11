/**
 * checklistDate.test.js
 *
 * localDateStr/logicalDateStr are INTENTIONALLY local-timezone-dependent
 * (the checklist's "today" resets at the device's local day boundary, not
 * UTC). Tests build Date objects with the LOCAL constructor
 * (new Date(y, mIdx, d, h, m)) so expectations hold under any timezone.
 *
 * TZ pin (W22): the DST tests need REAL transition days, so the whole file
 * runs under Europe/London (spring-forward Sun 2026-03-29 01:00→02:00 UTC,
 * fall-back Sun 2026-10-25 02:00→01:00 local). Setting process.env.TZ
 * before any Date use is respected by modern Node on every platform, and
 * Vitest isolates test files per worker, so no other test file sees this.
 * The pre-existing tests below are tz-agnostic and pass under the pin
 * unchanged.
 */
process.env.TZ = 'Europe/London'

import { describe, it, expect } from 'vitest'
import { localDateStr, logicalDateStr, msUntilNextReset } from './checklistDate.js'

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

describe('logicalDateStr — reset-time-aware "today" rule (W22)', () => {
    it('default reset time is exactly W21 localDateStr behavior', () => {
        const instants = [
            new Date(2026, 6, 11, 12, 0),
            new Date(2026, 6, 11, 0, 30),
            new Date(2026, 6, 11, 23, 59),
            new Date(2026, 0, 1, 0, 0)
        ]
        for (const d of instants) {
            expect(logicalDateStr(d)).toBe(localDateStr(d))
            expect(logicalDateStr(d, '00:00')).toBe(localDateStr(d))
        }
    })

    it('boundary instants around a 04:00 reset: 03:59 is still yesterday, 04:00 flips', () => {
        expect(logicalDateStr(new Date(2026, 6, 11, 3, 59), '04:00')).toBe('2026-07-10')
        expect(logicalDateStr(new Date(2026, 6, 11, 4, 0), '04:00')).toBe('2026-07-11')
        expect(logicalDateStr(new Date(2026, 6, 11, 4, 1), '04:00')).toBe('2026-07-11')
    })

    it('handles month/year boundaries with a non-midnight reset (01:00)', () => {
        expect(logicalDateStr(new Date(2025, 11, 31, 23, 30), '01:00')).toBe('2025-12-31')
        expect(logicalDateStr(new Date(2026, 0, 1, 0, 30), '01:00')).toBe('2025-12-31')
        expect(logicalDateStr(new Date(2026, 0, 1, 1, 0), '01:00')).toBe('2026-01-01')
    })

    it('malformed reset times degrade to midnight (W21 behavior), never throw', () => {
        const d = new Date(2026, 6, 11, 0, 30)
        expect(logicalDateStr(d, 'garbage')).toBe(localDateStr(d))
        expect(logicalDateStr(d, '25:99')).toBe(localDateStr(d))
        expect(logicalDateStr(d, '')).toBe(localDateStr(d))
        expect(logicalDateStr(d, undefined)).toBe(localDateStr(d))
    })

    // ── DST (Europe/London, pinned above) ──────────────────────────────────
    // The reset offset is REAL elapsed time subtracted on the epoch, so on a
    // transition day the effective wall-clock flip moment shifts with the
    // skipped/repeated hour — but the logical date always advances exactly
    // one calendar day.

    it('spring-forward day (2026-03-29, 01:00→02:00): reset 01:30 falls in the skipped hour; flip lands at wall 02:30', () => {
        // 02:29 BST = 01:29 UTC; minus 90 real minutes → 23:59 GMT 03-28
        expect(logicalDateStr(new Date(2026, 2, 29, 2, 29), '01:30')).toBe('2026-03-28')
        // 02:31 BST = 01:31 UTC; minus 90 → 00:01 GMT 03-29
        expect(logicalDateStr(new Date(2026, 2, 29, 2, 31), '01:30')).toBe('2026-03-29')
    })

    it('spring-forward: noon-to-noon advances exactly one logical day', () => {
        expect(logicalDateStr(new Date(2026, 2, 28, 12, 0), '01:30')).toBe('2026-03-28')
        expect(logicalDateStr(new Date(2026, 2, 29, 12, 0), '01:30')).toBe('2026-03-29')
    })

    it('fall-back day (2026-10-25, 02:00→01:00): reset 01:30 is ambiguous; flip lands at its FIRST occurrence', () => {
        // Instants built via Date.UTC to sidestep ambiguous local constructors.
        // 00:29 UTC = 01:29 BST (first pass); minus 90 → 22:59 UTC = 23:59 BST 10-24
        expect(logicalDateStr(new Date(Date.UTC(2026, 9, 25, 0, 29)), '01:30')).toBe('2026-10-24')
        // 00:31 UTC = 01:31 BST (first pass); minus 90 → 23:01 UTC = 00:01 BST 10-25
        expect(logicalDateStr(new Date(Date.UTC(2026, 9, 25, 0, 31)), '01:30')).toBe('2026-10-25')
    })

    it('fall-back: noon-to-noon advances exactly one logical day', () => {
        expect(logicalDateStr(new Date(2026, 9, 24, 12, 0), '01:30')).toBe('2026-10-24')
        expect(logicalDateStr(new Date(2026, 9, 25, 12, 0), '01:30')).toBe('2026-10-25')
    })

    // Reset-time change mid-day: logicalDateStr is pure — the same instant
    // with a different resetTime argument simply yields a different string
    // (see the 04:00 boundary test above vs the default-midnight one). The
    // resulting doneToday/streak display flip at Save-time is accepted per
    // the W22 ruling; no compensation logic exists, so no test restates it.
})

describe('msUntilNextReset — countdown source (W22)', () => {
    const H = 3600000

    it('counts down to today\'s reset when it is still ahead', () => {
        expect(msUntilNextReset(new Date(2026, 6, 11, 10, 0), '12:00')).toBe(2 * H)
    })

    it('rolls to tomorrow\'s reset when today\'s has passed', () => {
        expect(msUntilNextReset(new Date(2026, 6, 11, 13, 0), '12:00')).toBe(23 * H)
    })

    it('exactly at the reset instant → a full day to the NEXT one', () => {
        expect(msUntilNextReset(new Date(2026, 6, 11, 12, 0, 0, 0), '12:00')).toBe(24 * H)
    })

    it('default midnight: one minute before midnight → 60s', () => {
        expect(msUntilNextReset(new Date(2026, 6, 11, 23, 59, 0, 0))).toBe(60000)
    })

    it('rolls over month boundaries', () => {
        expect(msUntilNextReset(new Date(2026, 6, 31, 23, 0), '00:00')).toBe(1 * H)
    })

    it('spring-forward: real duration shrinks by the skipped hour', () => {
        // 20:00 GMT 03-28 → next reset 04:00 BST 03-29 (= 03:00 UTC): 7 real
        // hours, though the wall-clock difference reads 8.
        expect(msUntilNextReset(new Date(2026, 2, 28, 20, 0), '04:00')).toBe(7 * H)
    })

    it('fall-back: real duration grows by the repeated hour', () => {
        // 20:00 BST 10-24 (= 19:00 UTC) → next reset 04:00 GMT 10-25
        // (= 04:00 UTC): 9 real hours for an 8-hour wall difference.
        expect(msUntilNextReset(new Date(2026, 9, 24, 20, 0), '04:00')).toBe(9 * H)
    })
})
