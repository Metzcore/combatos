/**
 * weightDueState.test.js — the weekly check-in signal (W30).
 *
 * The two rules most likely to be "helpfully" broken later are pinned first
 * and hardest: never having logged is NOT overdue, and dismiss is a bounded
 * snooze rather than a kill switch.
 */
import { describe, it, expect } from 'vitest'
import { addDays } from './dateMath.js'
import {
    weightDueState,
    snoozeUntilDate,
    WEIGHT_CHECKIN_INTERVAL_DAYS,
    WEIGHT_SNOOZE_DAYS,
} from './weightDueState.js'

const TODAY = '2026-07-31'

describe('NO ENTRY IS NOT OVERDUE (rollout safety)', () => {
    it('is never due when the user has never logged a weight', () => {
        // If this regresses, shipping the feature nags every existing user
        // before they have opted into it — the fastest way to train people to
        // ignore the prompt permanently.
        for (const last of [null, undefined, '', 'not-a-date', '2026-13-01', '2026-02-30']) {
            const out = weightDueState({ lastEntryDate: last, today: TODAY })
            expect(out.due).toBe(false)
            expect(out.reason).toBe('no-entry-yet')
            expect(out.daysSinceLast).toBeNull()
        }
    })
})

describe('the weekly cadence', () => {
    it('is not due on the day of the entry', () => {
        expect(weightDueState({ lastEntryDate: TODAY, today: TODAY }))
            .toMatchObject({ due: false, reason: 'recent', daysSinceLast: 0 })
    })

    it('is not due up to and including the interval', () => {
        for (let d = 1; d <= WEIGHT_CHECKIN_INTERVAL_DAYS; d++) {
            const last = addDays(TODAY, -d)
            expect(weightDueState({ lastEntryDate: last, today: TODAY }).due).toBe(false)
        }
    })

    it('becomes due the day AFTER the interval elapses', () => {
        const last = addDays(TODAY, -(WEIGHT_CHECKIN_INTERVAL_DAYS + 1))
        expect(weightDueState({ lastEntryDate: last, today: TODAY }))
            .toMatchObject({ due: true, reason: 'overdue', daysSinceLast: 8 })
    })

    it('stays due as time goes on', () => {
        for (const d of [9, 14, 30, 400]) {
            const out = weightDueState({ lastEntryDate: addDays(TODAY, -d), today: TODAY })
            expect(out.due).toBe(true)
            expect(out.daysSinceLast).toBe(d)
        }
    })

    it('crosses month and year boundaries correctly', () => {
        expect(weightDueState({ lastEntryDate: '2025-12-24', today: '2026-01-02' }))
            .toMatchObject({ due: true, daysSinceLast: 9 })
        expect(weightDueState({ lastEntryDate: '2026-02-26', today: '2026-03-02' }).due).toBe(false)
    })
})

describe('snooze — bounded, not permanent', () => {
    it('suppresses the prompt while the snooze is in the future', () => {
        const last = addDays(TODAY, -20)
        const snoozedUntil = addDays(TODAY, 3)
        expect(weightDueState({ lastEntryDate: last, today: TODAY, snoozedUntil }))
            .toMatchObject({ due: false, reason: 'snoozed' })
    })

    it('EXPIRES — the prompt returns on the snooze date itself', () => {
        // The failure this guards: a permanent dismissal silently kills the
        // feature for anyone who taps Later once and then stops logging.
        const last = addDays(TODAY, -20)
        expect(weightDueState({ lastEntryDate: last, today: TODAY, snoozedUntil: TODAY }).due).toBe(true)
        expect(weightDueState({ lastEntryDate: last, today: TODAY, snoozedUntil: addDays(TODAY, -1) }).due).toBe(true)
    })

    it('ignores a malformed snooze rather than suppressing forever', () => {
        const last = addDays(TODAY, -20)
        for (const bad of ['', 'nope', '2026-13-40', null, undefined]) {
            expect(weightDueState({ lastEntryDate: last, today: TODAY, snoozedUntil: bad }).due).toBe(true)
        }
    })

    it('a fresh entry ends the due state naturally, without needing the snooze', () => {
        expect(weightDueState({ lastEntryDate: TODAY, today: TODAY, snoozedUntil: null }).due).toBe(false)
    })

    it('snoozeUntilDate lands exactly one cadence ahead', () => {
        expect(snoozeUntilDate(TODAY, addDays)).toBe(addDays(TODAY, WEIGHT_SNOOZE_DAYS))
        expect(WEIGHT_SNOOZE_DAYS).toBe(WEIGHT_CHECKIN_INTERVAL_DAYS)
    })

    it('snoozeUntilDate refuses bad input instead of inventing a date', () => {
        expect(snoozeUntilDate('nope', addDays)).toBeNull()
        expect(() => snoozeUntilDate(TODAY, null)).toThrow(TypeError)
    })
})

describe('defensive cases', () => {
    it('says nothing when today is untrustworthy', () => {
        // A prompt fired on a bad clock is worse than no prompt.
        for (const bad of ['', 'nope', undefined, null]) {
            expect(weightDueState({ lastEntryDate: '2026-01-01', today: bad }))
                .toMatchObject({ due: false, reason: 'invalid-today' })
        }
    })

    it('does not fire on a future-dated entry', () => {
        const out = weightDueState({ lastEntryDate: addDays(TODAY, 5), today: TODAY })
        expect(out.due).toBe(false)
        expect(out.reason).toBe('future-entry')
    })

    it('handles being called with no arguments at all', () => {
        expect(weightDueState()).toMatchObject({ due: false })
        expect(weightDueState({})).toMatchObject({ due: false })
    })
})

describe('what this module deliberately does NOT expose', () => {
    it('returns no target, streak, score or "days overdue" count', () => {
        const out = weightDueState({ lastEntryDate: addDays(TODAY, -30), today: TODAY })
        // daysSinceLast is factual and needed; anything resembling a scoreboard
        // is not. Per decision_log 2026-07-31: record the trend, never create a
        // number to fail against.
        expect(Object.keys(out).sort()).toEqual(['daysSinceLast', 'due', 'reason'])
        expect(out).not.toHaveProperty('daysOverdue')
        expect(out).not.toHaveProperty('streak')
        expect(out).not.toHaveProperty('target')
        expect(out).not.toHaveProperty('score')
    })
})
