/**
 * logDate.test.js — W34: every date decision for logging a past day.
 * "Now" is always injected; nothing reads the real clock.
 */
import { describe, it, expect } from 'vitest'
import {
    LOG_WINDOW_DAYS, utcTodayStr, utcYesterdayStr, getLogDateRange, isLogDateAllowed,
    logDateProblem, resolveLogDate, describeLogDateProblem, formatLogDateLabel,
} from './logDate.js'

const NOW = new Date('2026-10-02T10:30:00.000Z')

describe('utcTodayStr / utcYesterdayStr', () => {
    it('uses the UTC calendar date, exactly like the write path', () => {
        expect(utcTodayStr(NOW)).toBe(NOW.toISOString().slice(0, 10))
        expect(utcTodayStr(NOW)).toBe('2026-10-02')
        expect(utcYesterdayStr(NOW)).toBe('2026-10-01')
    })

    it('rolls over on the UTC boundary, not the local one', () => {
        expect(utcTodayStr(new Date('2026-10-02T23:59:59.999Z'))).toBe('2026-10-02')
        expect(utcTodayStr(new Date('2026-10-03T00:00:00.000Z'))).toBe('2026-10-03')
    })

    it('crosses month and year boundaries for yesterday', () => {
        expect(utcYesterdayStr(new Date('2026-03-01T05:00:00.000Z'))).toBe('2026-02-28')
        expect(utcYesterdayStr(new Date('2027-01-01T05:00:00.000Z'))).toBe('2026-12-31')
    })
})

describe('getLogDateRange', () => {
    it('spans today back 14 days', () => {
        expect(LOG_WINDOW_DAYS).toBe(14)
        expect(getLogDateRange(NOW)).toEqual({ min: '2026-09-18', max: '2026-10-02' })
    })
})

describe('isLogDateAllowed boundaries', () => {
    it('allows day 0 (today)', () => { expect(isLogDateAllowed('2026-10-02', NOW)).toBe(true) })
    it('allows yesterday', () => { expect(isLogDateAllowed('2026-10-01', NOW)).toBe(true) })
    it('allows day 14', () => { expect(isLogDateAllowed('2026-09-18', NOW)).toBe(true) })
    it('rejects day 15', () => { expect(isLogDateAllowed('2026-09-17', NOW)).toBe(false) })
    it('rejects tomorrow', () => { expect(isLogDateAllowed('2026-10-03', NOW)).toBe(false) })

    it('rejects empty, malformed and impossible dates', () => {
        expect(isLogDateAllowed('', NOW)).toBe(false)
        expect(isLogDateAllowed('02/10/2026', NOW)).toBe(false)
        expect(isLogDateAllowed('2026-02-30', NOW)).toBe(false)
        expect(isLogDateAllowed(undefined, NOW)).toBe(false)
    })

    it('reports why a date is rejected', () => {
        expect(logDateProblem('2026-10-03', NOW)).toBe('future')
        expect(logDateProblem('2026-09-17', NOW)).toBe('too-old')
        expect(logDateProblem('', NOW)).toBe('invalid')
        expect(logDateProblem('2026-10-01', NOW)).toBeNull()
    })

    it('shifts the window when the clock passes UTC midnight (day 14 becomes day 15)', () => {
        const later = new Date('2026-10-03T00:00:01.000Z')
        expect(isLogDateAllowed('2026-09-18', NOW)).toBe(true)
        expect(isLogDateAllowed('2026-09-18', later)).toBe(false)
    })
})

describe('resolveLogDate', () => {
    it('treats null/undefined as Today, resolved against the clock at call time', () => {
        expect(resolveLogDate(null, NOW)).toEqual({ ok: true, date: '2026-10-02', isToday: true })
        expect(resolveLogDate(undefined, NOW)).toEqual({ ok: true, date: '2026-10-02', isToday: true })
        const afterMidnight = new Date('2026-10-03T00:01:00.000Z')
        expect(resolveLogDate(null, afterMidnight)).toEqual({ ok: true, date: '2026-10-03', isToday: true })
    })

    it('accepts a past date and marks it not-today', () => {
        expect(resolveLogDate('2026-09-28', NOW)).toEqual({ ok: true, date: '2026-09-28', isToday: false })
    })

    it('treats an explicit date equal to today as today', () => {
        expect(resolveLogDate('2026-10-02', NOW)).toEqual({ ok: true, date: '2026-10-02', isToday: true })
    })

    it('rejects out-of-window and unusable selections with a reason', () => {
        expect(resolveLogDate('2026-10-03', NOW)).toEqual({ ok: false, reason: 'future' })
        expect(resolveLogDate('2026-09-17', NOW)).toEqual({ ok: false, reason: 'too-old' })
        expect(resolveLogDate('', NOW)).toEqual({ ok: false, reason: 'invalid' })
    })
})

describe('describeLogDateProblem / formatLogDateLabel', () => {
    it('gives a specific message per reason', () => {
        expect(describeLogDateProblem('future')).toMatch(/future/)
        expect(describeLogDateProblem('too-old')).toMatch(/14 days/)
        expect(describeLogDateProblem('invalid')).toMatch(/valid date/)
    })

    it('formats the FINISH label from calendar math, independent of timezone', () => {
        expect(formatLogDateLabel('2026-09-28')).toBe('MON 28 SEP')
        expect(formatLogDateLabel('2026-01-01')).toBe('THU 1 JAN')
        expect(formatLogDateLabel('nonsense')).toBe('nonsense')
    })
})
