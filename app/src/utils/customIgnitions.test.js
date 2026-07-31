/**
 * customIgnitions.test.js — pure logic for user-authored Daily Ignition
 * quotes (W29 PR D). See customIgnitions.js for the id scheme and merge
 * ordering rationale.
 */
import { describe, it, expect } from 'vitest'
import {
    isBundledId, isCustomId, makeCustomId, parseIgnitionLines,
    normalizeCustomIgnitions, addCustomIgnitions, removeCustomIgnition,
    resetCustomIgnitions, mergeIgnitions,
} from './customIgnitions.js'

const BUNDLED = [
    { id: '001', text: 'Bundled one' },
    { id: '002', text: 'Bundled two' },
]

describe('parseIgnitionLines', () => {
    it('splits one quote per line, stripping a single leading marker', () => {
        expect(parseIgnitionLines('- First quote\n* Second quote\n• Third quote'))
            .toEqual(['First quote', 'Second quote', 'Third quote'])
    })

    it('rejects empty and whitespace-only input', () => {
        expect(parseIgnitionLines('')).toEqual([])
        expect(parseIgnitionLines('   \n\t\n   ')).toEqual([])
        expect(parseIgnitionLines(null)).toEqual([])
        expect(parseIgnitionLines(undefined)).toEqual([])
    })

    it('ignores blank lines between real ones', () => {
        expect(parseIgnitionLines('one\n\n   \ntwo')).toEqual(['one', 'two'])
    })
})

describe('isBundledId / isCustomId', () => {
    it('recognizes the bundled 3-digit shape', () => {
        expect(isBundledId('001')).toBe(true)
        expect(isBundledId('056')).toBe(true)
        expect(isBundledId('c-abc')).toBe(false)
        expect(isBundledId('1')).toBe(false)
        expect(isBundledId(undefined)).toBe(false)
    })

    it('recognizes the custom c- shape', () => {
        expect(isCustomId('c-abc123')).toBe(true)
        expect(isCustomId('c-')).toBe(false) // prefix with no suffix is not well-formed
        expect(isCustomId('001')).toBe(false)
        expect(isCustomId(undefined)).toBe(false)
    })
})

describe('makeCustomId', () => {
    it('always produces a c-prefixed id that can never match the bundled id shape', () => {
        for (let i = 0; i < 20; i++) {
            const id = makeCustomId()
            expect(isCustomId(id)).toBe(true)
            expect(isBundledId(id)).toBe(false)
        }
    })

    it('avoids a supplied set of used ids', () => {
        // Force the collision branch by pre-seeding every id makeCustomId could
        // plausibly produce is impossible to enumerate, but we can at least
        // prove the explicit exclusion set is honored for a hand-picked id.
        const used = new Set()
        const first = makeCustomId(used)
        used.add(first)
        const second = makeCustomId(used)
        expect(second).not.toBe(first)
    })
})

describe('normalizeCustomIgnitions', () => {
    it('returns an empty array for undefined/non-array/corrupt input', () => {
        expect(normalizeCustomIgnitions(undefined)).toEqual([])
        expect(normalizeCustomIgnitions(null)).toEqual([])
        expect(normalizeCustomIgnitions('not an array')).toEqual([])
        expect(normalizeCustomIgnitions(42)).toEqual([])
        expect(normalizeCustomIgnitions({})).toEqual([])
    })

    it('drops entries with missing/blank text', () => {
        const out = normalizeCustomIgnitions([
            { id: 'c-1', text: 'Keep me' },
            { id: 'c-2', text: '   ' },
            { id: 'c-3', text: '' },
            { id: 'c-4' },
            null,
            42,
            'garbage',
        ])
        expect(out).toEqual([{ id: 'c-1', text: 'Keep me' }])
    })

    it('regenerates an id that collides with the bundled id scheme (ID-collision test)', () => {
        const out = normalizeCustomIgnitions([{ id: '001', text: 'Imposter quote' }])
        expect(out).toHaveLength(1)
        expect(out[0].text).toBe('Imposter quote')
        expect(out[0].id).not.toBe('001')
        expect(isCustomId(out[0].id)).toBe(true)
        expect(isBundledId(out[0].id)).toBe(false)
    })

    it('regenerates a duplicate custom id so two entries never share one id', () => {
        const out = normalizeCustomIgnitions([
            { id: 'c-dupe', text: 'First' },
            { id: 'c-dupe', text: 'Second' },
        ])
        expect(out).toHaveLength(2)
        expect(out[0].id).not.toBe(out[1].id)
    })

    it('regenerates a missing/malformed id', () => {
        const out = normalizeCustomIgnitions([{ text: 'No id at all' }, { id: 42, text: 'Numeric id' }])
        expect(out).toHaveLength(2)
        for (const q of out) expect(isCustomId(q.id)).toBe(true)
    })

    it('trims text', () => {
        const out = normalizeCustomIgnitions([{ id: 'c-1', text: '  padded  ' }])
        expect(out[0].text).toBe('padded')
    })
})

describe('addCustomIgnitions', () => {
    it('adds new quotes with fresh custom ids', () => {
        const out = addCustomIgnitions([], ['First quote', 'Second quote'])
        expect(out).toHaveLength(2)
        expect(out.map(q => q.text)).toEqual(['First quote', 'Second quote'])
        for (const q of out) expect(isCustomId(q.id)).toBe(true)
    })

    it('dedupes identical text within the same batch (same text twice)', () => {
        const out = addCustomIgnitions([], ['Same text', 'Same text', 'same text  '])
        expect(out).toHaveLength(1)
        expect(out[0].text).toBe('Same text')
    })

    it('dedupes against already-existing custom quotes, case- and whitespace-insensitively', () => {
        const existing = [{ id: 'c-1', text: 'Already here' }]
        const out = addCustomIgnitions(existing, ['  ALREADY here  ', 'Genuinely new'])
        expect(out).toHaveLength(2)
        expect(out.map(q => q.text)).toEqual(['Already here', 'Genuinely new'])
    })

    it('rejects empty and whitespace-only lines', () => {
        const out = addCustomIgnitions([], ['', '   ', '\t', 'Real one'])
        expect(out).toHaveLength(1)
        expect(out[0].text).toBe('Real one')
    })

    it('never produces a bundled-colliding id, even across a large batch', () => {
        const titles = Array.from({ length: 30 }, (_, i) => `Quote number ${i}`)
        const out = addCustomIgnitions([], titles)
        expect(out).toHaveLength(30)
        const ids = new Set(out.map(q => q.id))
        expect(ids.size).toBe(30) // all unique
        for (const id of ids) expect(isBundledId(id)).toBe(false)
    })

    it('recovers from a corrupt existing list rather than throwing', () => {
        const out = addCustomIgnitions('not an array', ['New one'])
        expect(out).toEqual([expect.objectContaining({ text: 'New one' })])
    })
})

describe('removeCustomIgnition', () => {
    it('removes the matching quote by id', () => {
        const quotes = [{ id: 'c-1', text: 'A' }, { id: 'c-2', text: 'B' }]
        expect(removeCustomIgnition(quotes, 'c-1')).toEqual([{ id: 'c-2', text: 'B' }])
    })

    it('is a no-op for an id that does not exist', () => {
        const quotes = [{ id: 'c-1', text: 'A' }]
        expect(removeCustomIgnition(quotes, 'c-does-not-exist')).toEqual(quotes)
    })

    it('degrading a bookmarked-then-deleted quote is just absence from the result', () => {
        const quotes = [{ id: 'c-1', text: 'A' }, { id: 'c-2', text: 'B' }]
        const after = removeCustomIgnition(quotes, 'c-2')
        expect(after.find(q => q.id === 'c-2')).toBeUndefined()
    })
})

describe('resetCustomIgnitions', () => {
    it('returns an empty array', () => {
        expect(resetCustomIgnitions()).toEqual([])
    })
})

describe('mergeIgnitions', () => {
    it('orders bundled quotes first, then custom quotes appended after', () => {
        const custom = [{ id: 'c-1', text: 'Custom one' }]
        expect(mergeIgnitions(BUNDLED, custom)).toEqual([...BUNDLED, ...custom])
    })

    it('handles undefined customIgnitions (never stored yet) as bundled-only', () => {
        expect(mergeIgnitions(BUNDLED, undefined)).toEqual(BUNDLED)
    })

    it('handles a corrupt customIgnitions value as bundled-only', () => {
        expect(mergeIgnitions(BUNDLED, 'not an array')).toEqual(BUNDLED)
        expect(mergeIgnitions(BUNDLED, { oops: true })).toEqual(BUNDLED)
    })

    it('handles a non-array bundled list defensively', () => {
        expect(mergeIgnitions(undefined, [{ id: 'c-1', text: 'X' }])).toEqual([{ id: 'c-1', text: 'X' }])
    })

    it('repairs a bundled-id-colliding custom entry during merge, so lookup by id stays unambiguous', () => {
        const merged = mergeIgnitions(BUNDLED, [{ id: '001', text: 'Colliding quote' }])
        // Exactly one entry with id '001' — the real bundled quote — never two.
        const matches = merged.filter(q => q.id === '001')
        expect(matches).toHaveLength(1)
        expect(matches[0].text).toBe('Bundled one')
        // The colliding custom quote survives, just under a repaired id.
        const repaired = merged.find(q => q.text === 'Colliding quote')
        expect(repaired).toBeDefined()
        expect(isCustomId(repaired.id)).toBe(true)
    })
})
