/**
 * utils/updateBanner.js — pure decisions for the "new version ready" banner (W40).
 *
 * Everything here takes injected values and returns plain data, so it is
 * unit-testable in node. The service-worker plumbing lives in swUpdate.js and
 * the React binding in hooks/useAppUpdate.js; neither makes a decision of its own.
 */
import { isStateMeaningful } from './workoutDraftState.js'

export const CHECK_MIN_INTERVAL_MS = 15 * 60 * 1000
export const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Is the user mid-workout (or mid-timer), so the banner must stay hidden?
 * True when ANY of:
 *   - the live draft holds meaningful input (the same predicate HUD and
 *     CartridgeViewer use for their conflict guard — nothing new is invented);
 *   - the stored draft is still being read (`draftPhase === 'hydrating'`;
 *     'idle' means no owner yet and does NOT block);
 *   - the stopwatch, the countdown or the rounds timer is not idle. A reload
 *     would lose their in-memory state, which is not persisted anywhere.
 * A pending Continue/Discard prompt deliberately does NOT block (developer
 * ruling): that draft is stored and survives a restart.
 */
export function isWorkoutActive({
    liveRow = null,
    draftPhase = 'idle',
    swRunning = false,
    swTime = 0,
    cdRunning = false,
    cdTime = 0,
    roundsStatus = 'idle',
} = {}) {
    if (draftPhase === 'hydrating') return true
    if (liveRow && isStateMeaningful(liveRow.state?.kind, liveRow.state?.fields)) return true
    if (swRunning || swTime > 0) return true
    if (cdRunning || cdTime > 0) return true
    if (roundsStatus && roundsStatus !== 'idle') return true
    return false
}

/**
 * Which top-of-shell banner shows. One at a time; the update banner wins.
 *   status         — 'none' | 'ready' | 'external' | 'restarting' | 'failed'
 *   workoutActive  — isWorkoutActive()
 *   dismissed      — "Later" this session (in memory only)
 *   installBannerMayShow — the W38 install banner has something to offer
 * Returns 'update' | 'install' | null.
 */
export function resolveBanner({
    status = 'none',
    workoutActive = false,
    dismissed = false,
    installBannerMayShow = false,
} = {}) {
    const updatePending = status !== 'none'
    // "Restarting…" follows a tap, so the user already chose; never hide it.
    const updateVisible = updatePending
        && (status === 'restarting' || (!workoutActive && !dismissed))
    if (updateVisible) return 'update'
    return installBannerMayShow ? 'install' : null
}

/**
 * Throttle for registration.update(): at most one check per 15 minutes, and
 * none while offline (update() rejects offline). A clock that moved backwards
 * allows a check rather than blocking forever.
 */
export function shouldCheckForUpdate({
    lastCheckAt = null,
    now,
    online = true,
    minIntervalMs = CHECK_MIN_INTERVAL_MS,
} = {}) {
    if (!online) return false
    if (!Number.isFinite(lastCheckAt)) return true
    if (!Number.isFinite(now)) return false
    if (now < lastCheckAt) return true
    return now - lastCheckAt >= minIntervalMs
}
