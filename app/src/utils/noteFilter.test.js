/**
 * noteFilter.test.js — pins the Notes search + tag filter rules (W23):
 * case-insensitive substring over title + body, AND-combined with a single
 * normalized tag, and groups with zero post-filter matches are HIDDEN
 * entirely (ruled). Pure function, plain Vitest.
 */
import { describe, it, expect } from 'vitest'
import { filterNotesViewModel } from './noteFilter.js'

const note = (id, title, body, tags = []) => ({ id, title, body, tags })

const groups = [
    {
        id: 'g1', name: 'Training', notes: [
            note('n1', 'Sparring debrief', 'Keep the LEAD hand up', ['boxing']),
            note('n2', '', 'shadowbox 3 rounds daily', ['boxing', 'habits'])
        ]
    },
    {
        id: 'g2', name: 'Ideas', notes: [
            note('n3', 'App concept', 'notes hub with tags', ['ideas'])
        ]
    },
    { id: 'g3', name: 'Empty', notes: [] }
]

describe('filterNotesViewModel', () => {
    it('returns the input untouched (same reference) with no active filter', () => {
        expect(filterNotesViewModel(groups, {})).toBe(groups)
        expect(filterNotesViewModel(groups, { query: '', tag: '' })).toBe(groups)
        expect(filterNotesViewModel(groups, { query: '   ' })).toBe(groups)
        expect(filterNotesViewModel(groups)).toBe(groups)
    })

    it('matches case-insensitive substrings in the TITLE', () => {
        const out = filterNotesViewModel(groups, { query: 'SPARRING' })
        expect(out.map(g => g.id)).toEqual(['g1'])
        expect(out[0].notes.map(n => n.id)).toEqual(['n1'])
    })

    it('matches case-insensitive substrings in the BODY', () => {
        const out = filterNotesViewModel(groups, { query: 'lead hand' })
        expect(out).toHaveLength(1)
        expect(out[0].notes.map(n => n.id)).toEqual(['n1'])
    })

    it('filters by tag', () => {
        const out = filterNotesViewModel(groups, { tag: 'boxing' })
        expect(out.map(g => g.id)).toEqual(['g1'])
        expect(out[0].notes.map(n => n.id)).toEqual(['n1', 'n2'])
    })

    it('combines query AND tag', () => {
        const out = filterNotesViewModel(groups, { query: 'rounds', tag: 'boxing' })
        expect(out).toHaveLength(1)
        expect(out[0].notes.map(n => n.id)).toEqual(['n2'])
        // Same query without the tag also only hits n2; same tag without
        // the query hits n1+n2 — the intersection is what survives.
        expect(filterNotesViewModel(groups, { query: 'lead', tag: 'habits' })).toEqual([])
    })

    it('HIDES groups left with zero matching notes (ruled: hidden, not shown-empty)', () => {
        const out = filterNotesViewModel(groups, { query: 'notes hub' })
        expect(out.map(g => g.id)).toEqual(['g2'])
    })

    it('returns [] when nothing matches anywhere', () => {
        expect(filterNotesViewModel(groups, { query: 'zzz-nope' })).toEqual([])
    })

    it('tolerates notes with missing title/body/tags fields', () => {
        const sparse = [{ id: 'g', name: 'G', notes: [{ id: 'n' }] }]
        expect(filterNotesViewModel(sparse, { query: 'x' })).toEqual([])
        expect(filterNotesViewModel(sparse, { tag: 't' })).toEqual([])
    })

    it('does not mutate the input', () => {
        const snapshot = JSON.parse(JSON.stringify(groups))
        filterNotesViewModel(groups, { query: 'sparring', tag: 'boxing' })
        expect(groups).toEqual(snapshot)
    })
})
