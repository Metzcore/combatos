/**
 * cartridgeDaySelection.test.js — A7b day suggestion and category defaults (D10).
 */
import { describe, it, expect } from 'vitest'
import {
    sortedDayNumbers, listSelectableDays, suggestNextDayTemplate, defaultCategoryFor,
} from './cartridgeDaySelection.js'

const cartridge = {
    cartridgeId: 'test-cartridge',
    days: [
        { day: 1, label: 'Day 1', type: 'training', blocks: [{ kind: 'strength', items: [] }] },
        { day: 2, label: 'Day 2 — Fight', type: 'custom' },
        { day: 3, label: 'Day 3', type: 'training', blocks: [] },
    ],
}

function cartridgeSession({ day, completedAt, cartridgeId = 'test-cartridge', sessionCategory = 'strength-conditioning' }) {
    return {
        payloadVersion: 2, sessionKind: 'cartridge', cartridgeId,
        dayTemplateKey: `day:${day}`, completedAt, sessionCategory,
    }
}

describe('sortedDayNumbers / listSelectableDays', () => {
    it('sorts ascending and describes each day', () => {
        expect(sortedDayNumbers(cartridge)).toEqual([1, 2, 3])
        const list = listSelectableDays(cartridge)
        expect(list).toEqual([
            { day: 1, label: 'Day 1', type: 'training', sectionCount: 1 },
            { day: 2, label: 'Day 2 — Fight', type: 'custom', sectionCount: 0 },
            { day: 3, label: 'Day 3', type: 'training', sectionCount: 0 },
        ])
    })
})

describe('suggestNextDayTemplate', () => {
    it('suggests the lowest day when there is no history for this cartridge', () => {
        expect(suggestNextDayTemplate(cartridge, [])).toBe(1)
    })

    it('suggests the day after the newest logged day, wrapping', () => {
        const sessions = [cartridgeSession({ day: 1, completedAt: '2026-01-01T00:00:00.000Z' })]
        expect(suggestNextDayTemplate(cartridge, sessions)).toBe(2)
    })

    it('wraps from the last day back to the first', () => {
        const sessions = [cartridgeSession({ day: 3, completedAt: '2026-01-01T00:00:00.000Z' })]
        expect(suggestNextDayTemplate(cartridge, sessions)).toBe(1)
    })

    it('ignores sessions for a different cartridge', () => {
        const sessions = [cartridgeSession({ day: 3, cartridgeId: 'other-cartridge', completedAt: '2026-01-01T00:00:00.000Z' })]
        expect(suggestNextDayTemplate(cartridge, sessions)).toBe(1)
    })

    it('ignores a legacy row and a payloadVersion:1 historical row is still tolerated', () => {
        const sessions = [
            { sessionType: 'S&C', day: 1 }, // legacy — never matches
            { payloadVersion: 1, sessionKind: 'cartridge', cartridgeId: 'test-cartridge', dayTemplateKey: 'day:1', completedAt: '2026-01-01T00:00:00.000Z' },
        ]
        expect(suggestNextDayTemplate(cartridge, sessions)).toBe(2)
    })

    it('falls back to the first day when the last-logged day no longer exists in this version', () => {
        const sessions = [cartridgeSession({ day: 99, completedAt: '2026-01-01T00:00:00.000Z' })]
        expect(suggestNextDayTemplate(cartridge, sessions)).toBe(1)
    })
})

describe('defaultCategoryFor', () => {
    it('returns null with no matching history', () => {
        expect(defaultCategoryFor({ sessions: [], cartridgeId: 'test-cartridge', dayTemplateKey: 'day:2' })).toBeNull()
    })

    it('returns the newest matching session category for the same cartridge + day', () => {
        const sessions = [
            cartridgeSession({ day: 2, sessionCategory: 'combat', completedAt: '2026-01-01T00:00:00.000Z' }),
            cartridgeSession({ day: 2, sessionCategory: 'custom', completedAt: '2026-02-01T00:00:00.000Z' }),
        ]
        expect(defaultCategoryFor({ sessions, cartridgeId: 'test-cartridge', dayTemplateKey: 'day:2' })).toBe('custom')
    })
})
