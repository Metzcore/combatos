/**
 * blockOrder.test.js
 *
 * Pins the W15 block-order contract:
 * - normalizeBlockOrder is the single reconciliation point between a stored
 *   order (data from a possibly older/newer app version) and the block set
 *   the current build knows about: garbage falls back to the default (never
 *   throws), unknown ids are filtered, missing known ids are appended at
 *   the end — never silently dropped.
 * - The default order matches the pre-W15 fixed layout (stopwatch, rest) so
 *   existing users with no stored setting see no change.
 * - moveBlock is an adjacent swap with navState-style identity semantics:
 *   invalid or out-of-bounds moves return the SAME reference.
 */
import { describe, it, expect } from 'vitest'
import { BASIC_TIMER_BLOCKS, normalizeBlockOrder, moveBlock } from './blockOrder.js'

describe('BASIC_TIMER_BLOCKS default', () => {
    it('matches the pre-W15 fixed layout: stopwatch first, rest second', () => {
        expect(BASIC_TIMER_BLOCKS).toEqual(['stopwatch', 'rest'])
    })
})

describe('normalizeBlockOrder — fallback to default (never throw)', () => {
    it('undefined (no stored setting) → default order', () => {
        expect(normalizeBlockOrder(undefined)).toEqual(['stopwatch', 'rest'])
    })

    it('null → default order', () => {
        expect(normalizeBlockOrder(null)).toEqual(['stopwatch', 'rest'])
    })

    it('non-array values → default order', () => {
        expect(normalizeBlockOrder('stopwatch,rest')).toEqual(['stopwatch', 'rest'])
        expect(normalizeBlockOrder(42)).toEqual(['stopwatch', 'rest'])
        expect(normalizeBlockOrder({ 0: 'rest' })).toEqual(['stopwatch', 'rest'])
    })

    it('array with non-string entries → default order', () => {
        expect(normalizeBlockOrder(['rest', 7])).toEqual(['stopwatch', 'rest'])
        expect(normalizeBlockOrder([null, 'stopwatch'])).toEqual(['stopwatch', 'rest'])
    })

    it('array with duplicates → default order', () => {
        expect(normalizeBlockOrder(['rest', 'rest'])).toEqual(['stopwatch', 'rest'])
        expect(normalizeBlockOrder(['rest', 'stopwatch', 'rest'])).toEqual(['stopwatch', 'rest'])
    })

    it('returns a fresh array, never the shared default constant', () => {
        const out = normalizeBlockOrder(undefined)
        expect(out).not.toBe(BASIC_TIMER_BLOCKS)
    })
})

describe('normalizeBlockOrder — reconciling with the known block set', () => {
    it('preserves a valid stored order (user-flipped)', () => {
        expect(normalizeBlockOrder(['rest', 'stopwatch'])).toEqual(['rest', 'stopwatch'])
    })

    it('filters unknown ids (block removed in a later build)', () => {
        expect(normalizeBlockOrder(['ghost', 'rest', 'stopwatch'])).toEqual(['rest', 'stopwatch'])
    })

    it('appends missing known blocks at the end (block added in a later build)', () => {
        expect(normalizeBlockOrder(['rest'])).toEqual(['rest', 'stopwatch'])
        // hypothetical future 3-block set: stored order predates 'newblock'
        const known = ['stopwatch', 'rest', 'newblock']
        expect(normalizeBlockOrder(['rest', 'stopwatch'], known)).toEqual(['rest', 'stopwatch', 'newblock'])
    })

    it('empty stored array → default order', () => {
        expect(normalizeBlockOrder([])).toEqual(['stopwatch', 'rest'])
    })

    it('filter + append combined: only unknown ids stored', () => {
        expect(normalizeBlockOrder(['ghost'])).toEqual(['stopwatch', 'rest'])
    })
})

describe('moveBlock — adjacent swap with identity semantics', () => {
    it('swaps adjacent blocks', () => {
        expect(moveBlock(['stopwatch', 'rest'], 'rest', -1)).toEqual(['rest', 'stopwatch'])
        expect(moveBlock(['stopwatch', 'rest'], 'stopwatch', 1)).toEqual(['rest', 'stopwatch'])
    })

    it('does not mutate the input array', () => {
        const input = ['stopwatch', 'rest']
        moveBlock(input, 'rest', -1)
        expect(input).toEqual(['stopwatch', 'rest'])
    })

    it('no-op at the top edge returns the SAME reference', () => {
        const input = ['stopwatch', 'rest']
        expect(moveBlock(input, 'stopwatch', -1)).toBe(input)
    })

    it('no-op at the bottom edge returns the SAME reference', () => {
        const input = ['stopwatch', 'rest']
        expect(moveBlock(input, 'rest', 1)).toBe(input)
    })

    it('unknown id returns the SAME reference', () => {
        const input = ['stopwatch', 'rest']
        expect(moveBlock(input, 'ghost', 1)).toBe(input)
    })

    it('works for middle elements of a longer list', () => {
        expect(moveBlock(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b'])
        expect(moveBlock(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    })
})
