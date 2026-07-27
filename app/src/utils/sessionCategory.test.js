/**
 * sessionCategory.test.js — A7a reader discrimination.
 */
import { describe, it, expect } from 'vitest'
import { categoryOf, isWorkoutCategory, sessionBucket, categoryBadge } from './sessionCategory.js'

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

describe('sessionBucket — finding #6 (mixed legacy/v1/v2 classification)', () => {
    it('buckets legacy S&C/Combat/Cardio/Mobility correctly', () => {
        expect(sessionBucket({ sessionType: 'S&C' })).toBe('sc')
        expect(sessionBucket({ sessionType: 'Combat' })).toBe('combat')
        expect(sessionBucket({ sessionType: 'Cardio' })).toBe('other')
        expect(sessionBucket({ sessionType: 'Mobility' })).toBe('other')
    })
    it('buckets cartridge strength-conditioning/combat/custom correctly (not miscounted)', () => {
        expect(sessionBucket({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'strength-conditioning' })).toBe('sc')
        expect(sessionBucket({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'combat' })).toBe('combat')
        expect(sessionBucket({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'custom' })).toBe('other')
    })
    it('rest/recovery bucket separately, never as a workout category', () => {
        expect(sessionBucket({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'rest' })).toBe('rest')
        expect(sessionBucket({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'recovery' })).toBe('recovery')
    })
    it('a payloadVersion:1 historical row buckets exactly like a v2 row with the same category', () => {
        expect(sessionBucket({ payloadVersion: 1, sessionKind: 'cartridge', sessionCategory: 'strength-conditioning' })).toBe('sc')
    })
    it('returns null (never guesses) for an unrecognized or absent category', () => {
        expect(sessionBucket({})).toBeNull()
        expect(sessionBucket({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'bogus' })).toBeNull()
    })
})

describe('categoryBadge — Calendar.jsx uses the actual cartridge category (finding #6)', () => {
    it('legacy S&C/Combat get their existing colors', () => {
        expect(categoryBadge({ sessionType: 'S&C' })).toEqual({ label: 'S&C', className: 'badge-green' })
        expect(categoryBadge({ sessionType: 'Combat' })).toEqual({ label: 'Combat', className: 'badge-red' })
    })
    it('a cartridge strength-conditioning/combat/custom row shows its OWN category, not a guessed default', () => {
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'strength-conditioning' }))
            .toEqual({ label: 'strength-conditioning', className: 'badge-green' })
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'combat' }))
            .toEqual({ label: 'combat', className: 'badge-red' })
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'custom' }))
            .toEqual({ label: 'custom', className: 'badge-amber' })
    })
    it('a rest/recovery cartridge row shows a dim badge, never green "S&C"', () => {
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'rest' }))
            .toEqual({ label: 'rest', className: 'badge-dim' })
    })
    it('falls back to the legacy default (S&C/green) for an unrecognized category, unchanged from before', () => {
        expect(categoryBadge({})).toEqual({ label: 'S&C', className: 'badge-green' })
    })
})
