/**
 * cartridgeCompleteness.test.js — A7a completeness (schema §7).
 */
import { describe, it, expect } from 'vitest'
import { itemCompleteness, computeCartridgeCompleteness } from './cartridgeCompleteness.js'

describe('itemCompleteness — mobility/cooldown/conditioning never contribute', () => {
    it('returns {units:0, done:0} regardless of performed content', () => {
        expect(itemCompleteness('mobility', { name: 'x', dose: '10 min' }, { name: 'sub' })).toEqual({ units: 0, done: 0 })
        expect(itemCompleteness('cooldown', { name: 'x' }, {})).toEqual({ units: 0, done: 0 })
        expect(itemCompleteness('conditioning', { name: 'x', rounds: 6 }, {})).toEqual({ units: 0, done: 0 })
    })
    it('an unknown kind contributes nothing and never throws', () => {
        expect(itemCompleteness('bogus', {}, {})).toEqual({ units: 0, done: 0 })
    })
})

describe('itemCompleteness — strength/core main sets', () => {
    it('counts kg-or-reps-filled sets, capped at prescribed.sets', () => {
        const prescribed = { sets: 4 }
        const performed = { sets: [{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }, { kg: 100, reps: 3 }] }
        expect(itemCompleteness('strength', prescribed, performed)).toEqual({ units: 4, done: 3 })
    })
    it('an RPE/RIR-only entry does NOT count as filled', () => {
        const prescribed = { sets: 2 }
        const performed = { sets: [{ kg: 100, reps: 4 }, { rpe: 9 }] }
        expect(itemCompleteness('strength', prescribed, performed)).toEqual({ units: 2, done: 1 })
    })
    it('extra performed sets beyond prescribed never inflate done past the cap', () => {
        const prescribed = { sets: 2 }
        const performed = { sets: [{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }, { kg: 100, reps: 3 }, { kg: 90, reps: 5 }] }
        expect(itemCompleteness('strength', prescribed, performed)).toEqual({ units: 2, done: 2 })
    })
    it('non-numeric prescribed.sets (e.g. missing) yields zero units', () => {
        expect(itemCompleteness('strength', {}, { sets: [{ kg: 100, reps: 4 }] })).toEqual({ units: 0, done: 0 })
    })
})

describe('itemCompleteness — prescribed PAP/pair', () => {
    it('adds pair units/done on top of main, independently capped', () => {
        const prescribed = { sets: 3, pair: { sets: 3 } }
        const performed = {
            sets: [{ kg: 24, reps: 6 }, { kg: 24, reps: 6 }],
            pair: { sets: [{ reps: 3 }, { reps: 3 }, { reps: 2 }, { reps: 1 }] },
        }
        // main: 2/3 done, pair: capped at 3 even though 4 performed entries exist
        expect(itemCompleteness('strength', prescribed, performed)).toEqual({ units: 6, done: 5 })
    })
    it('no pair prescribed means zero pair units even if performed.pair exists', () => {
        const prescribed = { sets: 3 }
        const performed = { sets: [], pair: { sets: [{ reps: 3 }] } }
        expect(itemCompleteness('strength', prescribed, performed)).toEqual({ units: 3, done: 0 })
    })
})

describe('computeCartridgeCompleteness — day-level aggregation', () => {
    const strengthBlock = (prescribedSets, doneSets) => ({
        kind: 'strength',
        items: [{ prescribed: { sets: prescribedSets }, performed: { sets: doneSets } }],
    })

    it('omits (null) for custom/rest/recovery days regardless of blocks content', () => {
        const blocks = [strengthBlock(4, [{ kg: 100, reps: 4 }])]
        expect(computeCartridgeCompleteness(blocks, 'custom')).toBeNull()
        expect(computeCartridgeCompleteness(blocks, 'rest')).toBeNull()
        expect(computeCartridgeCompleteness(blocks, 'recovery')).toBeNull()
    })

    it('omits (null, never 0) for a mobility-only or conditioning-only training day', () => {
        const blocks = [{ kind: 'mobility', items: [{ prescribed: { name: 'x', dose: '5 min' }, performed: {} }] }]
        expect(computeCartridgeCompleteness(blocks, 'training')).toBeNull()

        const conditioningOnly = [{ kind: 'conditioning', items: [{ prescribed: { name: 'x', rounds: 6 }, performed: {} }] }]
        expect(computeCartridgeCompleteness(conditioningOnly, 'training')).toBeNull()
    })

    it('mixes strength/core with non-contributing mobility/conditioning correctly', () => {
        const blocks = [
            strengthBlock(4, [{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }]), // 2/4
            { kind: 'mobility', items: [{ prescribed: { name: 'x', dose: '5 min' }, performed: {} }] },
            { kind: 'conditioning', items: [{ prescribed: { name: 'x', rounds: 6 }, performed: {} }] },
        ]
        expect(computeCartridgeCompleteness(blocks, 'training')).toBe(50)
    })

    it('rounds to one decimal place', () => {
        const blocks = [strengthBlock(3, [{ kg: 100, reps: 4 }])] // 1/3 = 33.33...
        expect(computeCartridgeCompleteness(blocks, 'training')).toBe(33.3)
    })

    it('extra sets beyond prescribed never push completeness past 100', () => {
        const blocks = [strengthBlock(2, [{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }, { kg: 100, reps: 3 }])]
        expect(computeCartridgeCompleteness(blocks, 'training')).toBe(100)
    })

    it('handles multiple blocks/items across a real multi-block day', () => {
        const blocks = [
            {
                kind: 'strength', items: [
                    { prescribed: { sets: 4 }, performed: { sets: [{ kg: 100, reps: 4 }] } }, // 1/4
                    { prescribed: { sets: 3, pair: { sets: 3 } }, performed: { sets: [{ kg: 24, reps: 6 }, { kg: 24, reps: 6 }], pair: { sets: [{ reps: 3 }, { reps: 3 }, { reps: 2 }] } } }, // main 2/3 + pair 3/3
                ],
            },
        ]
        // total units = 4 + 3 + 3 = 10; done = 1 + 2 + 3 = 6 -> 60.0
        expect(computeCartridgeCompleteness(blocks, 'training')).toBe(60)
    })
})
