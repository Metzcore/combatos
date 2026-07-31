/**
 * extraSetState.test.js — A7b extra-set removal (Android acceptance
 * remediation plan §7, pure removal tests 1–9; test 10 lives in
 * SupersetGroup.test.js where it composes with buildSupersetRounds).
 * Pure logic only — no DOM render-test infra in this repo.
 */
import { describe, it, expect } from 'vitest'
import { hasMeaningfulSetValue, removeExtraSetAtIndex } from './extraSetState.js'

describe('hasMeaningfulSetValue', () => {
    it('a blank extra entry is recognized as blank (test 1)', () => {
        expect(hasMeaningfulSetValue({})).toBe(false)
        expect(hasMeaningfulSetValue({ kg: '', reps: '', rpe: '' })).toBe(false)
        expect(hasMeaningfulSetValue({ kg: null, reps: undefined })).toBe(false)
        expect(hasMeaningfulSetValue(undefined)).toBe(false)
        expect(hasMeaningfulSetValue(null)).toBe(false)
    })

    it('any supported field with a real value is populated (test 2)', () => {
        expect(hasMeaningfulSetValue({ kg: 100 })).toBe(true)
        expect(hasMeaningfulSetValue({ reps: 8 })).toBe(true)
        expect(hasMeaningfulSetValue({ rpe: 7.5 })).toBe(true)
        expect(hasMeaningfulSetValue({ rir: 2 })).toBe(true)
    })

    it('numeric zero is populated (test 3)', () => {
        expect(hasMeaningfulSetValue({ kg: 0 })).toBe(true)
        expect(hasMeaningfulSetValue({ reps: 0 })).toBe(true)
        expect(hasMeaningfulSetValue({ rpe: 0 })).toBe(true)
        expect(hasMeaningfulSetValue({ rir: 0 })).toBe(true)
    })
})

describe('removeExtraSetAtIndex', () => {
    it('prescribed index removal is refused (test 4)', () => {
        const sets = [{ kg: 100 }, { kg: 100 }, { kg: 90 }]
        for (const index of [0, 1]) {
            const result = removeExtraSetAtIndex(sets, 2, index)
            expect(result.removed).toBe(false)
            expect(result.sets).toBe(sets) // original reference, unchanged
        }
    })

    it('negative, non-integer, and out-of-range indexes are refused (test 5)', () => {
        const sets = [{ kg: 100 }, { kg: 100 }, {}]
        for (const index of [-1, 0.5, 3, 99, NaN, '2', null, undefined]) {
            const result = removeExtraSetAtIndex(sets, 2, index)
            expect(result.removed).toBe(false)
            expect(result.sets).toBe(sets)
        }
    })

    it('invalid prescribed counts fail closed without throwing', () => {
        const sets = [{}]
        for (const prescribedSets of [undefined, null, '0', NaN, -1, 0.5]) {
            const result = removeExtraSetAtIndex(sets, prescribedSets, 0)
            expect(result.removed).toBe(false)
            expect(result.sets).toBe(sets)
        }
    })

    it('the exact selected extra entry is removed, not a neighbour (test 6)', () => {
        const a = { kg: 100, reps: 5 }
        const b = { kg: 90, reps: 6 }
        const c = { kg: 80, reps: 8 }
        const result = removeExtraSetAtIndex([a, b, c], 1, 1)
        expect(result.removed).toBe(true)
        expect(result.sets).toEqual([a, c])
    })

    it('other entries keep identity/order/values; unrelated fields untouched (test 7)', () => {
        const keep = { kg: 100, reps: 5 }
        const extra1 = { kg: 90 }
        const extra2 = { kg: 80 }
        const result = removeExtraSetAtIndex([keep, extra1, extra2], 1, 1)
        expect(result.sets[0]).toBe(keep) // same object reference, not a copy
        expect(result.sets[1]).toBe(extra2)
        expect(keep).toEqual({ kg: 100, reps: 5 })
        expect(extra2).toEqual({ kg: 80 })
    })

    it('the input array and entries are not mutated (test 8)', () => {
        const sets = [{ kg: 100 }, { kg: 90 }, { kg: 80 }]
        const snapshot = JSON.parse(JSON.stringify(sets))
        removeExtraSetAtIndex(sets, 1, 2)
        expect(sets).toEqual(snapshot)
        expect(sets).toHaveLength(3)
    })

    it('multiple extras may be removed one at a time (test 9)', () => {
        const prescribed = 2
        let sets = [{ kg: 100 }, { kg: 100 }, { kg: 90 }, { kg: 80 }, { kg: 70 }]
        const first = removeExtraSetAtIndex(sets, prescribed, 2)
        expect(first.removed).toBe(true)
        expect(first.sets).toHaveLength(4)
        const second = removeExtraSetAtIndex(first.sets, prescribed, 3)
        expect(second.removed).toBe(true)
        expect(second.sets).toHaveLength(3)
        const third = removeExtraSetAtIndex(second.sets, prescribed, 2)
        expect(third.removed).toBe(true)
        expect(third.sets).toEqual([{ kg: 100 }, { kg: 100 }])
        // nothing below the prescribed count ever becomes removable
        expect(removeExtraSetAtIndex(third.sets, prescribed, 1).removed).toBe(false)
        // the original array was never touched by the chain
        expect(sets).toHaveLength(5)
    })
})
