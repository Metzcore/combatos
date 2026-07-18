/**
 * phaseUnlock.test.js
 *
 * Pins the phase-unlock condition (W14): Phase N+1 unlocks after
 * PHASE_UNLOCK_THRESHOLD logged S&C sessions in Phase N; phases run
 * 1→2→3 only. Pure-helper tests (node env, no DOM), like the other
 * utils tests.
 *
 * Premise-proof discipline: boundaries are expressed via the imported
 * PHASE_UNLOCK_THRESHOLD constant, never a hardcoded literal — if the
 * developer ever retunes the threshold, these tests keep pinning the
 * BOUNDARY semantics rather than a stale number.
 */
import { describe, it, expect } from 'vitest'
import { PHASE_UNLOCK_THRESHOLD, phaseReady, isPhaseLocked } from './phaseUnlock.js'

const T = PHASE_UNLOCK_THRESHOLD

describe('PHASE_UNLOCK_THRESHOLD', () => {
    it('is a positive integer (premise for the boundary tests below)', () => {
        expect(Number.isInteger(T)).toBe(true)
        expect(T).toBeGreaterThan(0)
    })
})

describe('phaseReady — threshold boundary', () => {
    it('is NOT ready one session below the threshold', () => {
        expect(phaseReady(1, { 1: T - 1, 2: 0, 3: 0 })).toBe(false)
    })

    it('is ready exactly AT the threshold', () => {
        expect(phaseReady(1, { 1: T, 2: 0, 3: 0 })).toBe(true)
    })

    it('stays ready above the threshold', () => {
        expect(phaseReady(1, { 1: T + 5, 2: 0, 3: 0 })).toBe(true)
    })

    it('counts only the CURRENT phase — sessions in other phases do not help', () => {
        expect(phaseReady(2, { 1: T + 5, 2: T - 1, 3: 0 })).toBe(false)
    })

    it('treats a missing phase count as 0 (the `|| 0` guard)', () => {
        expect(phaseReady(1, {})).toBe(false)
    })
})

describe('phaseReady — phase < 3 guard', () => {
    it('phase 3 never readies a next phase, even far past the threshold', () => {
        expect(phaseReady(3, { 1: T, 2: T, 3: T * 2 })).toBe(false)
    })

    it('phase 2 CAN ready phase 3', () => {
        expect(phaseReady(2, { 1: T, 2: T, 3: 0 })).toBe(true)
    })
})

describe('phaseReady — explicit threshold override', () => {
    it('honors a caller-supplied threshold', () => {
        expect(phaseReady(1, { 1: 3 }, 3)).toBe(true)
        expect(phaseReady(1, { 1: 2 }, 3)).toBe(false)
    })
})

describe('isPhaseLocked — truth table', () => {
    it('a phase BELOW the current phase is never locked', () => {
        expect(isPhaseLocked(1, 2, { 1: 0, 2: 0, 3: 0 })).toBe(false)
    })

    it('the CURRENT phase is never locked', () => {
        expect(isPhaseLocked(2, 2, { 1: 0, 2: 0, 3: 0 })).toBe(false)
    })

    it('the NEXT phase is unlocked when the current phase is ready', () => {
        expect(isPhaseLocked(2, 1, { 1: T, 2: 0, 3: 0 })).toBe(false)
    })

    it('the NEXT phase is locked while the current phase is not ready', () => {
        expect(isPhaseLocked(2, 1, { 1: T - 1, 2: 0, 3: 0 })).toBe(true)
    })

    it('a phase FAR above the current phase is locked even when the next one is ready', () => {
        // Phase 1 user with a ready phase 2 — phase 3 is still locked:
        // phases only ever unlock one step at a time.
        expect(isPhaseLocked(3, 1, { 1: T + 5, 2: T + 5, 3: 0 })).toBe(true)
    })

    it('agrees with phaseReady at the exact boundary (drift guard)', () => {
        for (const n of [T - 1, T]) {
            const counts = { 1: n, 2: 0, 3: 0 }
            expect(isPhaseLocked(2, 1, counts)).toBe(!phaseReady(1, counts))
        }
    })
})
