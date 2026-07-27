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

describe('categoryBadge — legacy Calendar behavior preserved exactly (finding #6, corrected)', () => {
    it('sessionType S&C -> S&C/green', () => {
        expect(categoryBadge({ sessionType: 'S&C' })).toEqual({ label: 'S&C', className: 'badge-green' })
    })
    it('sessionType Combat -> Combat/red', () => {
        expect(categoryBadge({ sessionType: 'Combat' })).toEqual({ label: 'Combat', className: 'badge-red' })
    })
    it('absent sessionType -> S&C/green', () => {
        expect(categoryBadge({})).toEqual({ label: 'S&C', className: 'badge-green' })
        expect(categoryBadge({ sessionType: undefined })).toEqual({ label: 'S&C', className: 'badge-green' })
        expect(categoryBadge({ sessionType: null })).toEqual({ label: 'S&C', className: 'badge-green' })
    })
    it('any other present legacy sessionType -> its original label/amber', () => {
        expect(categoryBadge({ sessionType: 'Cardio' })).toEqual({ label: 'Cardio', className: 'badge-amber' })
        expect(categoryBadge({ sessionType: 'Mobility' })).toEqual({ label: 'Mobility', className: 'badge-amber' })
        expect(categoryBadge({ sessionType: 'SomeFutureValue' })).toEqual({ label: 'SomeFutureValue', className: 'badge-amber' })
    })
})

describe('categoryBadge — cartridge rows show their real category with human-facing labels (finding #6, corrected)', () => {
    it('maps the five known categories to their human-facing labels', () => {
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'strength-conditioning' }))
            .toEqual({ label: 'S&C', className: 'badge-green' })
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'combat' }))
            .toEqual({ label: 'Combat', className: 'badge-red' })
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'custom' }))
            .toEqual({ label: 'Custom', className: 'badge-amber' })
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'rest' }))
            .toEqual({ label: 'Rest', className: 'badge-dim' })
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'recovery' }))
            .toEqual({ label: 'Recovery', className: 'badge-dim' })
    })
    it('a payloadVersion:1 historical row gets the same human-facing label as a v2 row', () => {
        expect(categoryBadge({ payloadVersion: 1, sessionKind: 'cartridge', sessionCategory: 'strength-conditioning' }))
            .toEqual({ label: 'S&C', className: 'badge-green' })
    })
})

describe('categoryBadge — unrecognized "versioned" rows are neutral Unknown, never guessed into S&C (finding #6, corrected)', () => {
    it('an unknown payloadVersion is Unknown', () => {
        expect(categoryBadge({ payloadVersion: 99, sessionKind: 'cartridge', sessionCategory: 'combat' }))
            .toEqual({ label: 'Unknown', className: 'badge-dim' })
    })
    it('an unknown sessionKind on a versioned row is Unknown', () => {
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'something-else', sessionCategory: 'combat' }))
            .toEqual({ label: 'Unknown', className: 'badge-dim' })
    })
    it('a missing sessionCategory on an otherwise-readable cartridge row is Unknown', () => {
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge' }))
            .toEqual({ label: 'Unknown', className: 'badge-dim' })
    })
    it('an invalid/unrecognized sessionCategory on an otherwise-readable cartridge row is Unknown', () => {
        expect(categoryBadge({ payloadVersion: 2, sessionKind: 'cartridge', sessionCategory: 'bogus' }))
            .toEqual({ label: 'Unknown', className: 'badge-dim' })
    })
    it('never throws on null/undefined/non-object input', () => {
        expect(categoryBadge(null)).toEqual({ label: 'Unknown', className: 'badge-dim' })
        expect(categoryBadge(undefined)).toEqual({ label: 'Unknown', className: 'badge-dim' })
        expect(categoryBadge('a string')).toEqual({ label: 'Unknown', className: 'badge-dim' })
    })
})
