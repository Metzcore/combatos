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
