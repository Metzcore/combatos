/**
 * phaseUnlock.js — the ONE home of the phase-unlock condition (W14).
 *
 * The unlock rule itself is unchanged from pre-W14 HUD.jsx; it was moved
 * here verbatim so every surface that SIGNALS lockedness (HUD progress
 * line, Playbook lock badges) reads the exact same computation the real
 * unlock check uses — display can never drift from behavior.
 *
 * Rule (see combatos-conventions): a phase's counter counts only S&C
 * sessions — days 2/4 (fight gym) and day 7 (optional/custom gym) are
 * excluded by refreshCounts() in db/index.jsx BEFORE the counts reach
 * here. This module only compares counts to the threshold.
 */

export const PHASE_UNLOCK_THRESHOLD = 12

/**
 * phaseReady — is the NEXT phase unlocked from the user's current phase?
 *
 * Verbatim semantics of the pre-W14 HUD check:
 *   (sessionCount[currentPhase] || 0) >= threshold && currentPhase < 3
 *
 * i.e. Phase N+1 unlocks after `threshold` logged S&C sessions in Phase N;
 * there is no phase after 3, so phase 3 never "readies" a next phase.
 *
 * @param {number} currentPhase  the phase the user is currently in (1–3)
 * @param {Object} sessionCount  S&C session counts per phase, e.g. {1: n, 2: n, 3: n}
 * @param {number} [threshold]   sessions required (defaults to PHASE_UNLOCK_THRESHOLD)
 * @returns {boolean}
 */
export function phaseReady(currentPhase, sessionCount, threshold = PHASE_UNLOCK_THRESHOLD) {
    return (sessionCount[currentPhase] || 0) >= threshold && currentPhase < 3
}

/**
 * isPhaseLocked — display-lockedness for an arbitrary rendered phase `p`
 * (e.g. the Playbook's Phase 1/2/3 buttons).
 *
 * Lockedness depends on BOTH the rendered phase and the user's current
 * phase:
 *   - p <= currentPhase            → NOT locked (already reached/passed)
 *   - p === currentPhase + 1 AND
 *     phaseReady(currentPhase, …)  → NOT locked (earned, awaiting advance)
 *   - anything else                → locked (not yet earned; phases only
 *                                    ever unlock one step at a time, 1→2→3)
 *
 * Signal only — callers must NOT use this to gate interaction (Playbook
 * buttons stay clickable so the curriculum is always browsable).
 *
 * @param {number} p             the phase being rendered (1–3)
 * @param {number} currentPhase  the phase the user is currently in (1–3)
 * @param {Object} sessionCount  S&C session counts per phase
 * @returns {boolean}
 */
export function isPhaseLocked(p, currentPhase, sessionCount) {
    if (p <= currentPhase) return false
    if (p === currentPhase + 1 && phaseReady(currentPhase, sessionCount)) return false
    return true
}

/**
 * highestUnlockedPhase — the highest phase the user has legitimately EARNED,
 * derived purely from persistent per-phase S&C counts (W27).
 *
 * Phases unlock strictly one step at a time (1→2→3): phase N+1 is earned only
 * once phase N has reached the threshold. Starting from phase 1 (always
 * available) we walk upward while each step readies the next, capped at 3.
 *
 * This is a pure function of `sessionCount` ONLY — it never reads the
 * currently-selected phase — so the set of earned phases is stable no matter
 * which phase is active. That is what makes climbing back down and up again
 * safe: selecting an earlier earned phase never shrinks this set, so no earned
 * phase can become unreachable (no lockout trap).
 *
 * @param {Object} sessionCount  S&C session counts per phase, e.g. {1: n, 2: n, 3: n}
 * @param {number} [threshold]   sessions required (defaults to PHASE_UNLOCK_THRESHOLD)
 * @returns {number} highest earned phase (1–3)
 */
export function highestUnlockedPhase(sessionCount, threshold = PHASE_UNLOCK_THRESHOLD) {
    let highest = 1
    while (highest < 3 && phaseReady(highest, sessionCount, threshold)) highest++
    return highest
}

/**
 * isPhaseSelectable — may the phase `p` be chosen in the HUD selector? (W27)
 *
 * True when EITHER:
 *   - `p` is within the earned range (`p <= highestUnlockedPhase(...)`), OR
 *   - `p` is the currently-selected phase.
 *
 * The `p === currentPhase` escape hatch is INTENTIONAL and required: the active
 * value must never be disabled (a `<select>` whose value is a disabled option is
 * an invalid, unrecoverable UI state). A consequence — by design, not a bug — is
 * that this predicate cannot self-heal a `currentPhase` that was corrupted into
 * an unearned phase (e.g. legacy data, or a pre-W27 premature jump): that phase
 * stays selectable because it is active. Touch C's mismatch badge is the passive
 * signal for that case; W27 does not forcibly correct it.
 *
 * @param {number} p             the phase being rendered as an option (1–3)
 * @param {Object} sessionCount  S&C session counts per phase
 * @param {number} currentPhase  the phase currently selected/active (1–3)
 * @param {number} [threshold]   sessions required (defaults to PHASE_UNLOCK_THRESHOLD)
 * @returns {boolean}
 */
export function isPhaseSelectable(p, sessionCount, currentPhase, threshold = PHASE_UNLOCK_THRESHOLD) {
    return p <= highestUnlockedPhase(sessionCount, threshold) || p === currentPhase
}
