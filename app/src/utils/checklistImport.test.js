/**
 * checklistImport.test.js — paste-text line-parsing rules (W22)
 *
 * One task per line; strip a leading `-`, `*` or `•` marker plus
 * whitespace; ignore lines that end up empty; duplicates ALLOWED.
 */
import { describe, it, expect } from 'vitest'
import { parseImportLines } from './checklistImport.js'

describe('parseImportLines', () => {
    it('splits one task per line, in input order', () => {
        expect(parseImportLines('Wake up at 5am\nExercise for 30 minutes\nReview goals'))
            .toEqual(['Wake up at 5am', 'Exercise for 30 minutes', 'Review goals'])
    })

    it('strips each supported leading marker: -, *, •', () => {
        expect(parseImportLines('- dash task\n* star task\n• bullet task'))
            .toEqual(['dash task', 'star task', 'bullet task'])
    })

    it('strips whitespace around the marker and around the title', () => {
        expect(parseImportLines('  -   indented dash  \n\t*\ttabbed star\t'))
            .toEqual(['indented dash', 'tabbed star'])
    })

    it('leaves marker-less lines intact (trimmed only)', () => {
        expect(parseImportLines('  plain task  ')).toEqual(['plain task'])
    })

    it('ignores empty and whitespace-only lines', () => {
        expect(parseImportLines('one\n\n   \n\t\ntwo')).toEqual(['one', 'two'])
    })

    it('drops marker-only lines instead of creating blank tasks', () => {
        expect(parseImportLines('-\n- \n•\nreal task')).toEqual(['real task'])
    })

    it('only strips the marker at the START of a line — mid-word hyphens survive', () => {
        expect(parseImportLines('- Self-care routine')).toEqual(['Self-care routine'])
        expect(parseImportLines('Review A/B tests - variant 2')).toEqual(['Review A/B tests - variant 2'])
    })

    it('strips only ONE leading marker (a second one is part of the title)', () => {
        expect(parseImportLines('- - double dash')).toEqual(['- double dash'])
    })

    it('handles Windows (\\r\\n) and bare \\r line endings', () => {
        expect(parseImportLines('- one\r\n- two\r- three')).toEqual(['one', 'two', 'three'])
    })

    it('duplicate titles are allowed — no de-duplication', () => {
        expect(parseImportLines('- Hydrate\n- Hydrate\nHydrate'))
            .toEqual(['Hydrate', 'Hydrate', 'Hydrate'])
    })

    it('empty or non-string input yields an empty list', () => {
        expect(parseImportLines('')).toEqual([])
        expect(parseImportLines('   \n  ')).toEqual([])
        expect(parseImportLines(null)).toEqual([])
        expect(parseImportLines(undefined)).toEqual([])
    })
})
