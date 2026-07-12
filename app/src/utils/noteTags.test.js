/**
 * noteTags.test.js — pins the app-wide normalized-tag convention (W23).
 * Other features adopting tags later code against exactly this behavior.
 */
import { describe, it, expect } from 'vitest'
import { normalizeTag, normalizeTags } from './noteTags.js'

describe('normalizeTag', () => {
    it('trims, lowercases, and converts spaces to hyphens', () => {
        expect(normalizeTag('  Leg Day  ')).toBe('leg-day')
        expect(normalizeTag('FIGHT CAMP 2026')).toBe('fight-camp-2026')
    })

    it('collapses internal whitespace runs to a single hyphen', () => {
        expect(normalizeTag('deep   work')).toBe('deep-work')
        expect(normalizeTag('a\tb')).toBe('a-b')
    })

    it('is idempotent — normalizing twice changes nothing', () => {
        const once = normalizeTag('  Leg Day ')
        expect(normalizeTag(once)).toBe(once)
    })

    it('returns empty string for blank or non-string input', () => {
        expect(normalizeTag('')).toBe('')
        expect(normalizeTag('   ')).toBe('')
        expect(normalizeTag(null)).toBe('')
        expect(normalizeTag(undefined)).toBe('')
        expect(normalizeTag(42)).toBe('')
    })
})

describe('normalizeTags', () => {
    it('normalizes each entry and drops blanks', () => {
        expect(normalizeTags(['Ideas', '  ', 'Deep Work', ''])).toEqual(['ideas', 'deep-work'])
    })

    it('collapses duplicates-after-normalization, first occurrence wins', () => {
        expect(normalizeTags(['Leg Day', 'leg-day', 'LEG   DAY'])).toEqual(['leg-day'])
    })

    it('preserves input order of surviving tags', () => {
        expect(normalizeTags(['b', 'a', 'B'])).toEqual(['b', 'a'])
    })

    it('returns a NEW empty array for non-array input', () => {
        expect(normalizeTags(null)).toEqual([])
        expect(normalizeTags('tag')).toEqual([])
        expect(normalizeTags(undefined)).toEqual([])
    })

    it('never mutates its input', () => {
        const input = ['  A  ', 'b']
        normalizeTags(input)
        expect(input).toEqual(['  A  ', 'b'])
    })
})
