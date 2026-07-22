/**
 * cartridgeFormat.test.js
 *
 * Pins display formatting for the block-model Cartridge Viewer, incl. the
 * dual-coded %1RM+RPE case that motivated spec v2.
 */
import { describe, it, expect } from 'vitest'
import { blockKindLabel, blockKindColor, formatPrescription, formatPair } from './cartridgeFormat.js'

describe('blockKindLabel', () => {
    it.each([
        ['mobility', 'Mobility'],
        ['strength', 'Strength'],
        ['conditioning', 'Conditioning'],
        ['cooldown', 'Cooldown'],
        ['core', 'Core']
    ])('labels %s as %s', (kind, label) => {
        expect(blockKindLabel(kind)).toBe(label)
    })

    it('falls back to the raw kind for an unknown value', () => {
        expect(blockKindLabel('yoga')).toBe('yoga')
    })
})

describe('blockKindColor', () => {
    it('returns a color for every known kind', () => {
        for (const kind of ['mobility', 'strength', 'conditioning', 'cooldown', 'core']) {
            expect(typeof blockKindColor(kind)).toBe('string')
        }
    })

    it('falls back to blue for an unknown kind', () => {
        expect(blockKindColor('yoga')).toBe('blue')
    })
})

describe('formatPrescription', () => {
    it('returns null for missing/invalid prescription', () => {
        expect(formatPrescription(null)).toBeNull()
        expect(formatPrescription(undefined)).toBeNull()
        expect(formatPrescription('rpe8')).toBeNull()
    })

    it('formats a plain rpe', () => {
        expect(formatPrescription({ rpe: 8 })).toBe('RPE 8')
    })

    it('formats a plain rir', () => {
        expect(formatPrescription({ rir: 4 })).toBe('RIR 4')
    })

    it('formats a percent as a rounded %1RM', () => {
        expect(formatPrescription({ percent: 0.8 })).toBe('80% 1RM')
    })

    it('dual-codes percent + rpe (the v2 no-tested-max case)', () => {
        expect(formatPrescription({ percent: 0.75, rpe: 8 })).toBe('75% 1RM · RPE 8')
    })

    it('formats addedLoad', () => {
        expect(formatPrescription({ addedLoad: '20kg' })).toBe('+20kg')
    })

    it('appends a trailing note after the formatted parts', () => {
        expect(formatPrescription({ rpe: 7, note: 'Bodyweight to start' })).toBe('RPE 7 — Bodyweight to start')
    })

    it('falls back to a bare note when no gradeable fields are present', () => {
        expect(formatPrescription({ note: 'Moderate — feel the hamstring stretch' })).toBe('Moderate — feel the hamstring stretch')
    })

    it('returns null for an empty object', () => {
        expect(formatPrescription({})).toBeNull()
    })
})

describe('formatPair', () => {
    it('returns null when there is no pair or no name', () => {
        expect(formatPair(null)).toBeNull()
        expect(formatPair({})).toBeNull()
    })

    it('formats name with sets x reps', () => {
        expect(formatPair({ name: 'Box Jump', sets: 4, reps: '3' })).toBe('Box Jump (4x3)')
    })

    it('formats a bare name when sets/reps are absent', () => {
        expect(formatPair({ name: 'Explosive Push-up' })).toBe('Explosive Push-up')
    })
})
