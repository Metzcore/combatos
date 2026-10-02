/**
 * sessionOrder.test.js — W34: sessions ordered by training day, not entry order.
 */
import { describe, it, expect } from 'vitest'
import { trainingDayOf, compareSessionOrder, compareNewestFirst } from './sessionOrder.js'

describe('trainingDayOf', () => {
    it('prefers date and falls back to the day part of completedAt', () => {
        expect(trainingDayOf({ date: '2026-09-28', completedAt: '2026-09-30T08:00:00.000Z' })).toBe('2026-09-28')
        expect(trainingDayOf({ completedAt: '2026-09-30T08:00:00.000Z' })).toBe('2026-09-30')
        expect(trainingDayOf({})).toBe('')
        expect(trainingDayOf(null)).toBe('')
    })
})

describe('compareSessionOrder', () => {
    it('ranks a back-filled row (earlier date, later completedAt) as older than a later training day', () => {
        const onTime = { id: 1, date: '2026-09-29', completedAt: '2026-09-29T18:00:00.000Z' }
        const backfilled = { id: 2, date: '2026-09-28', completedAt: '2026-09-30T08:00:00.000Z' }
        expect(compareSessionOrder(backfilled, onTime)).toBeLessThan(0)
        expect([backfilled, onTime].sort(compareNewestFirst)).toEqual([onTime, backfilled])
    })

    it('breaks a same-day tie by completedAt, then id', () => {
        const a = { id: 1, date: '2026-09-28', completedAt: '2026-09-28T10:00:00.000Z' }
        const b = { id: 2, date: '2026-09-28', completedAt: '2026-09-30T08:00:00.000Z' }
        expect([a, b].sort(compareNewestFirst)).toEqual([b, a])
        const c = { id: 3, date: '2026-09-28' }
        const d = { id: 4, date: '2026-09-28' }
        expect([c, d].sort(compareNewestFirst)).toEqual([d, c])
    })

    it('equals ordering by completedAt alone for rows whose date is the completedAt day', () => {
        const rows = [
            '2026-07-01T23:59:59.999Z', '2026-07-02T00:00:00.000Z', '2026-07-02T00:00:00.001Z',
            '2026-06-30T12:00:00.000Z', '2026-12-31T23:00:00.000Z', '2027-01-01T00:00:00.000Z',
        ].map((completedAt, id) => ({ id, date: completedAt.slice(0, 10), completedAt }))
        const byCompletedAt = [...rows].sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1))
        expect([...rows].sort(compareSessionOrder)).toEqual(byCompletedAt)
    })

    it('tolerates rows with no date and no completedAt', () => {
        expect(() => [{ id: 1 }, { id: 2, date: '2026-01-01' }].sort(compareNewestFirst)).not.toThrow()
    })
})
