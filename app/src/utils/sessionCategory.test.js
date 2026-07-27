/**
 * sessionCategory.test.js — A7a reader discrimination.
 */
import { describe, it, expect } from 'vitest'
import { categoryOf, isWorkoutCategory } from './sessionCategory.js'

describe('categoryOf — mixed legacy/v1/v2 tolerance', () => {
    it('reads sessionType off a legacy row', () => {
        expect(categoryOf({ sessionType: 'S&C', day: 1, phase: 1 })).toBe('S&C')
        expect(categoryOf({ sessionType: 'Combat', day: 2, phase: 1 })).toBe('Combat')
    })

    it('reads sessionCategory off a v2 cartridge row', () => {
        expect(categoryOf({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'strength-conditioning' })).toBe('strength-conditioning')
    })

    it('reads sessionCategory off a v1 historical cartridge row — never crashes, never reinterpreted under v2 rules', () => {
        expect(categoryOf({ payloadVersion: 1, sessionKind: 'cartridge', sessionCategory: 'combat' })).toBe('combat')
    })

    it('returns undefined for a row with neither payloadVersion nor sessionType', () => {
        expect(categoryOf({ notes: 'no category info' })).toBeUndefined()
    })

    it('returns undefined for an unrecognized payloadVersion rather than guessing', () => {
        expect(categoryOf({ payloadVersion: 99, sessionKind: 'cartridge', sessionCategory: 'combat' })).toBeUndefined()
    })

    it('never throws on null/undefined/non-object input', () => {
        expect(categoryOf(null)).toBeUndefined()
        expect(categoryOf(undefined)).toBeUndefined()
        expect(categoryOf('a string')).toBeUndefined()
    })

    it('does not confuse a cartridge row for legacy even though sessionType is absent on both', () => {
        // A cartridge row has no `sessionType` key at all (schema §4) — the
        // discriminator must resolve via payloadVersion/sessionKind FIRST,
        // never fall through to reading a field that happens to be absent.
        const cartridgeRow = { payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'rest' }
        expect(categoryOf(cartridgeRow)).toBe('rest')
    })
})

describe('isWorkoutCategory', () => {
    it('true for strength-conditioning/combat/custom', () => {
        expect(isWorkoutCategory('strength-conditioning')).toBe(true)
        expect(isWorkoutCategory('combat')).toBe(true)
        expect(isWorkoutCategory('custom')).toBe(true)
    })
    it('false for rest/recovery and anything unrecognized', () => {
        expect(isWorkoutCategory('rest')).toBe(false)
        expect(isWorkoutCategory('recovery')).toBe(false)
        expect(isWorkoutCategory('bogus')).toBe(false)
        expect(isWorkoutCategory(undefined)).toBe(false)
    })
})
