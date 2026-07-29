/**
 * SupersetGroup.test.js — A7b superset grouping (pure logic only; no
 * render-test infra in this repo, matching the rest of the codebase's
 * convention of testing the extracted pure function directly).
 */
import { describe, it, expect } from 'vitest'
import { groupItemsBySuperset, buildSupersetRounds } from './SupersetGroup.jsx'
import { removeExtraSetAtIndex } from '../../utils/extraSetState.js'

describe('groupItemsBySuperset', () => {
    it('an item with no superset field is its own ungrouped singleton', () => {
        const items = [{ id: 'a', name: 'Squat' }, { id: 'b', name: 'Row' }]
        expect(groupItemsBySuperset(items)).toEqual([
            { label: null, items: [items[0]] },
            { label: null, items: [items[1]] },
        ])
    })

    it('groups items sharing the same superset label, preserving order', () => {
        const a1 = { id: 'a1', superset: 'A', sets: 4 }
        const a2 = { id: 'a2', superset: 'A', sets: 4 }
        const b1 = { id: 'b1', name: 'Solo' }
        const groups = groupItemsBySuperset([a1, b1, a2])
        expect(groups).toEqual([
            { label: 'A', items: [a1, a2] },
            { label: null, items: [b1] },
        ])
    })

    it('two different superset labels form two separate groups', () => {
        const a1 = { id: 'a1', superset: 'A' }
        const b1 = { id: 'b1', superset: 'B' }
        expect(groupItemsBySuperset([a1, b1])).toEqual([
            { label: 'A', items: [a1] },
            { label: 'B', items: [b1] },
        ])
    })

    it('a blank/whitespace-only superset string is treated as ungrouped', () => {
        const item = { id: 'a', superset: '   ' }
        expect(groupItemsBySuperset([item])).toEqual([{ label: null, items: [item] }])
    })

    it('handles an empty/non-array input without throwing', () => {
        expect(groupItemsBySuperset([])).toEqual([])
        expect(groupItemsBySuperset(undefined)).toEqual([])
    })
})

// ─── buildSupersetRounds — TRUE round order (corrective-pass finding C) ────

describe('buildSupersetRounds', () => {
    it('4/4 equal members interleave A1/A2 every round, in member order', () => {
        const a1 = { id: 'a1', sets: 4 }
        const a2 = { id: 'a2', sets: 4 }
        const rounds = buildSupersetRounds([a1, a2], {})
        expect(rounds).toEqual([
            [{ itemId: 'a1', index: 0 }, { itemId: 'a2', index: 0 }],
            [{ itemId: 'a1', index: 1 }, { itemId: 'a2', index: 1 }],
            [{ itemId: 'a1', index: 2 }, { itemId: 'a2', index: 2 }],
            [{ itemId: 'a1', index: 3 }, { itemId: 'a2', index: 3 }],
        ])
    })

    it('4/3 — A2 contributes no row in the final round (no placeholder)', () => {
        const a1 = { id: 'a1', sets: 4 }
        const a2 = { id: 'a2', sets: 3 }
        const rounds = buildSupersetRounds([a1, a2], {})
        expect(rounds).toHaveLength(4)
        expect(rounds[0]).toEqual([{ itemId: 'a1', index: 0 }, { itemId: 'a2', index: 0 }])
        expect(rounds[2]).toEqual([{ itemId: 'a1', index: 2 }, { itemId: 'a2', index: 2 }])
        expect(rounds[3]).toEqual([{ itemId: 'a1', index: 3 }]) // a2 exhausted — no placeholder entry
    })

    it('3/4 — the SHORTER member listed first still drops out correctly (order-independent correctness)', () => {
        const a1 = { id: 'a1', sets: 3 }
        const a2 = { id: 'a2', sets: 4 }
        const rounds = buildSupersetRounds([a1, a2], {})
        expect(rounds).toHaveLength(4)
        expect(rounds[3]).toEqual([{ itemId: 'a2', index: 3 }]) // a1 exhausted
    })

    it('1/5 — a large mismatch still produces exactly maxRounds rounds, each correctly populated', () => {
        const a1 = { id: 'a1', sets: 1 }
        const a2 = { id: 'a2', sets: 5 }
        const rounds = buildSupersetRounds([a1, a2], {})
        expect(rounds).toHaveLength(5)
        expect(rounds[0]).toEqual([{ itemId: 'a1', index: 0 }, { itemId: 'a2', index: 0 }])
        expect(rounds[1]).toEqual([{ itemId: 'a2', index: 1 }])
        expect(rounds[4]).toEqual([{ itemId: 'a2', index: 4 }])
    })

    it('three members interleave deterministically in authored order', () => {
        const a1 = { id: 'a1', sets: 2 }
        const a2 = { id: 'a2', sets: 2 }
        const a3 = { id: 'a3', sets: 2 }
        const rounds = buildSupersetRounds([a1, a2, a3], {})
        expect(rounds).toEqual([
            [{ itemId: 'a1', index: 0 }, { itemId: 'a2', index: 0 }, { itemId: 'a3', index: 0 }],
            [{ itemId: 'a1', index: 1 }, { itemId: 'a2', index: 1 }, { itemId: 'a3', index: 1 }],
        ])
    })

    it('extra PERFORMED sets beyond the prescribed count extend that member\'s own rounds (Add Set on one member)', () => {
        const a1 = { id: 'a1', sets: 2 }
        const a2 = { id: 'a2', sets: 2 }
        // a1 has an extra performed entry beyond its prescribed 2 sets.
        const performedByItemId = { a1: { sets: [{ kg: 100 }, { kg: 100 }, { kg: 90 }] } }
        const rounds = buildSupersetRounds([a1, a2], performedByItemId)
        expect(rounds).toHaveLength(3)
        expect(rounds[2]).toEqual([{ itemId: 'a1', index: 2 }]) // a2 has nothing extra
    })

    it('Add Round appends one prescribed-equivalent round when every member gets an extra performed entry', () => {
        const a1 = { id: 'a1', sets: 2 }
        const a2 = { id: 'a2', sets: 2 }
        const performedByItemId = {
            a1: { sets: [{ kg: 100 }, { kg: 100 }, {}] },
            a2: { sets: [{ kg: 50 }, { kg: 50 }, {}] },
        }
        const rounds = buildSupersetRounds([a1, a2], performedByItemId)
        expect(rounds).toHaveLength(3)
        expect(rounds[2]).toEqual([{ itemId: 'a1', index: 2 }, { itemId: 'a2', index: 2 }])
    })

    it('handles empty/non-array items and a missing performedByItemId map without throwing', () => {
        expect(buildSupersetRounds([], {})).toEqual([])
        expect(buildSupersetRounds(undefined, undefined)).toEqual([])
    })
})

// ─── extra-set removal composes with round order (Android acceptance
//     remediation plan §7 test 10) ───

describe('removeExtraSetAtIndex × buildSupersetRounds', () => {
    it('removing one member\'s extra reduces ONLY that member\'s generated extra round (test 10)', () => {
        const a1 = { id: 'a1', sets: 2 }
        const a2 = { id: 'a2', sets: 2 }
        // Both members did one extra round; a1's extra was populated, a2's blank.
        const performedByItemId = {
            a1: { sets: [{ kg: 100 }, { kg: 100 }, { kg: 90, reps: 5 }] },
            a2: { sets: [{ kg: 50 }, { kg: 50 }, {}] },
        }
        expect(buildSupersetRounds([a1, a2], performedByItemId)).toHaveLength(3)

        // Remove a1's extra — a2's extra round must survive untouched.
        const a1Result = removeExtraSetAtIndex(performedByItemId.a1.sets, a1.sets, 2)
        expect(a1Result.removed).toBe(true)
        const afterA1 = { ...performedByItemId, a1: { ...performedByItemId.a1, sets: a1Result.sets } }
        const roundsAfterA1 = buildSupersetRounds([a1, a2], afterA1)
        expect(roundsAfterA1).toHaveLength(3)
        expect(roundsAfterA1[2]).toEqual([{ itemId: 'a2', index: 2 }]) // a2 keeps its extra round
        expect(performedByItemId.a1.sets).toHaveLength(3) // original map never mutated

        // Remove a2's extra too — the group collapses back to the prescribed rounds.
        const a2Result = removeExtraSetAtIndex(afterA1.a2.sets, a2.sets, 2)
        expect(a2Result.removed).toBe(true)
        const afterBoth = { ...afterA1, a2: { ...afterA1.a2, sets: a2Result.sets } }
        expect(buildSupersetRounds([a1, a2], afterBoth)).toHaveLength(2)
    })
})
