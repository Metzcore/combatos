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
import {
    PHASE_UNLOCK_THRESHOLD,
    phaseReady,
    isPhaseLocked,
    highestUnlockedPhase,
    isPhaseSelectable,
} from './phaseUnlock.js'

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

describe('highestUnlockedPhase (W27)', () => {
    it('is phase 1 with no sessions (baseline — always available)', () => {
        expect(highestUnlockedPhase({})).toBe(1)
        expect(highestUnlockedPhase({ 1: 0, 2: 0, 3: 0 })).toBe(1)
    })

    it('stays phase 1 one session below the phase-1 threshold', () => {
        expect(highestUnlockedPhase({ 1: T - 1 })).toBe(1)
    })

    it('rises to phase 2 exactly AT the phase-1 threshold', () => {
        expect(highestUnlockedPhase({ 1: T })).toBe(2)
    })

    it('rises to phase 3 once both phase 1 and phase 2 are at threshold', () => {
        expect(highestUnlockedPhase({ 1: T, 2: T, 3: 0 })).toBe(3)
    })

    it('never exceeds phase 3 — no phase 4 exists, however far past threshold', () => {
        expect(highestUnlockedPhase({ 1: T, 2: T, 3: T * 5 })).toBe(3)
    })

    it('does not skip a gap — phase-2 count cannot unlock phase 3 while phase 1 is short', () => {
        // Phase 1 not yet earned, so the climb stops at 1 regardless of later counts.
        expect(highestUnlockedPhase({ 1: T - 1, 2: T + 5, 3: T + 5 })).toBe(1)
    })

    it('honors a caller-supplied threshold', () => {
        expect(highestUnlockedPhase({ 1: 3, 2: 3 }, 3)).toBe(3)
        expect(highestUnlockedPhase({ 1: 2 }, 3)).toBe(1)
    })
})

describe('isPhaseSelectable (W27)', () => {
    it('phase 1 is always selectable regardless of counts or current phase', () => {
        for (const cur of [1, 2, 3]) {
            expect(isPhaseSelectable(1, {}, cur)).toBe(true)
        }
    })

    it('disables phases beyond the highest earned', () => {
        // Nothing earned beyond phase 1, sitting on phase 1: 2 and 3 are locked.
        expect(isPhaseSelectable(2, { 1: T - 1 }, 1)).toBe(false)
        expect(isPhaseSelectable(3, { 1: T - 1 }, 1)).toBe(false)
    })

    it('enables an earned-but-not-yet-active phase', () => {
        // Phase 1 at threshold earns phase 2; user still on phase 1.
        expect(isPhaseSelectable(2, { 1: T }, 1)).toBe(true)
        expect(isPhaseSelectable(3, { 1: T }, 1)).toBe(false)
    })

    it('never disables the ACTIVE phase, even when it is unearned (escape hatch)', () => {
        // Corrupted/legacy state: currentPhase 3 with zero earned counts.
        // The active value must stay selectable (else the <select> is stuck on
        // a disabled option); neighbouring unearned phases stay disabled.
        const sc = { 1: 0, 2: 0, 3: 0 }
        expect(isPhaseSelectable(3, sc, 3)).toBe(true)
        expect(isPhaseSelectable(2, sc, 3)).toBe(false)
    })

    it('NO-LOCKOUT-TRAP: every earned phase is reachable from every earned phase', () => {
        // Earned through phase 3. From ANY active phase the user must be able to
        // select any earned phase — climbing back down then up must never strand
        // an earned phase. This is the core W27 invariant.
        const sc = { 1: T, 2: T, 3: 0 }
        for (const cur of [1, 2, 3]) {
            expect(isPhaseSelectable(1, sc, cur)).toBe(true)
            expect(isPhaseSelectable(2, sc, cur)).toBe(true)
            expect(isPhaseSelectable(3, sc, cur)).toBe(true)
        }
    })

    it('agrees with highestUnlockedPhase at the boundary (drift guard)', () => {
        for (const n of [T - 1, T]) {
            const sc = { 1: n, 2: 0, 3: 0 }
            // For a non-active phase, selectability === within earned range.
            expect(isPhaseSelectable(2, sc, 1)).toBe(2 <= highestUnlockedPhase(sc))
        }
    })
})
