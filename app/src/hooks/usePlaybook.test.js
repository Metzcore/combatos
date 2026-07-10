/**
 * usePlaybook.test.js
 *
 * Tests run against the real, generated app/src/data/playbook.js — the
 * actual program data, not a fixture. Per AGENTS.md, playbook.js is
 * read-only: these tests never write to it, only read through the
 * exported lookup helpers and getWorkout().
 */
import { describe, it, expect } from 'vitest'
import { lookup, hipAwareLookup, getWorkout } from './usePlaybook.js'
import PLAYBOOK_DATA from '../data/playbook.js'

describe('lookup — key construction', () => {
    it('builds P{phase}-D{day}-{block}-{slot}-{variant} and finds a known row', () => {
        const row = lookup(1, 1, 'MOB', 1, 'STD')
        expect(row).not.toBeNull()
        expect(row.Key).toBe('P1-D1-MOB-1-STD')
    })

    it('builds the HA variant key and finds a known row', () => {
        const row = lookup(1, 1, 'MOB', 1, 'HA')
        expect(row).not.toBeNull()
        expect(row.Key).toBe('P1-D1-MOB-1-HA')
    })

    it('builds a key without a variant suffix when variant is omitted', () => {
        const row = lookup(1, 1, 'STR', 1)
        expect(row).not.toBeNull()
        expect(row.Key).toBe('P1-D1-STR-1')
    })

    it('returns null for a key that does not exist', () => {
        const row = lookup(99, 99, 'MOB', 99, 'STD')
        expect(row).toBeNull()
    })
})

describe('hipAwareLookup — hip-score routing', () => {
    it('routes to the HA row and flags isHighAlert when hipScore <= 2 and an HA variant exists', () => {
        const { row, isHighAlert } = hipAwareLookup(1, 1, 'MOB', 1, 2)
        expect(isHighAlert).toBe(true)
        expect(row.Key).toBe('P1-D1-MOB-1-HA')
    })

    it('routes to the HA row at the hipScore boundary of exactly 2', () => {
        const { row, isHighAlert } = hipAwareLookup(1, 1, 'MOB', 1, 2)
        expect(isHighAlert).toBe(true)
        expect(row.Variant).toBe('HIGH_ALERT')
    })

    it('routes to the STD row when hipScore is above the high-alert threshold', () => {
        const { row, isHighAlert } = hipAwareLookup(1, 1, 'MOB', 1, 3)
        expect(isHighAlert).toBe(false)
        expect(row.Key).toBe('P1-D1-MOB-1-STD')
    })

    it('falls back to STD when hipScore <= 2 but no HA variant exists for that slot/block', () => {
        // Use a MOB slot/day combo known to have no HA row (P1-D3-MOB-1 has no
        // HA variant in the dataset), so a low hip score must still resolve to STD.
        const haRow = lookup(1, 3, 'MOB', 1, 'HA')
        expect(haRow).toBeNull() // sanity check: this combo genuinely lacks an HA row

        const { row, isHighAlert } = hipAwareLookup(1, 3, 'MOB', 1, 1)
        expect(isHighAlert).toBe(false)
        expect(row.Key).toBe('P1-D3-MOB-1-STD')
    })
})

describe('getWorkout — fight-gym-day synthesis', () => {
    it('returns isFightGymDay: true for day 2', () => {
        const workout = getWorkout(1, 2, 3)
        expect(workout.isFightGymDay).toBe(true)
    })

    it('returns isFightGymDay: true for day 4', () => {
        const workout = getWorkout(1, 4, 3)
        expect(workout.isFightGymDay).toBe(true)
    })

    it('returns isFightGymDay: false for a normal S&C day (day 1)', () => {
        const workout = getWorkout(1, 1, 3)
        expect(workout.isFightGymDay).toBe(false)
    })
})

describe('getWorkout — strength slots are STD-only (no hip variance)', () => {
    it('produces the same strength slots regardless of hipScore', () => {
        const lowHip = getWorkout(1, 1, 1)
        const highHip = getWorkout(1, 1, 5)
        expect(lowHip.strSlots).toEqual(highHip.strSlots)
        expect(lowHip.strSlots.length).toBeGreaterThan(0)
    })

    it('never contains a HIGH_ALERT-sourced key in strSlots across the whole dataset', () => {
        const haStrengthRows = PLAYBOOK_DATA.filter(
            row => row.Block === 'STRENGTH' && row.Variant === 'HIGH_ALERT'
        )
        expect(haStrengthRows).toHaveLength(0)
    })
})
