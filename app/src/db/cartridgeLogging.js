/**
 * db/cartridgeLogging.js — A7b provider-owned cartridge logging boundary
 * (corrective plan finding B / Step 1).
 *
 * Plain, React-free async function so it can be exercised directly by tests
 * — this repo has no React-render test infrastructure, so DBProvider's
 * `logCartridgeSession` (db/index.jsx) wraps this EXACT function in a
 * useCallback rather than re-implementing its own copy of the same logic.
 *
 * Owns: the ONE canonical sessionId; buildCartridgeSessionPayload;
 * validateCartridgeSessionPayload with a typed rejection carrying the
 * validator's messages (CartridgeValidationError); invalidating the draft
 * controller ONLY once validation has passed (a rejected payload must never
 * touch the draft or open a transaction); commitLoggedSession.
 *
 * The caller's own pre-log durability gate (CartridgeToday's
 * flushCartridgeDraftNow) must already have succeeded BEFORE this function
 * is ever invoked — mirrors the legacy logSession's existing comment ("the
 * caller already flushed the newest snapshot before invoking logSession").
 * `invalidateDraft`/`commit` are injected so tests can exercise this exact
 * function against a spy without Dexie, while production wires the real
 * workoutDraftController.invalidate / commitLoggedSession.
 */
import { buildCartridgeSessionPayload, validateCartridgeSessionPayload } from '../utils/cartridgeSessionPayload.js'

export class CartridgeValidationError extends Error {
    constructor(errors) {
        super(Array.isArray(errors) && errors.length > 0 ? errors[0] : 'Cartridge session payload failed validation')
        this.name = 'CartridgeValidationError'
        this.errors = Array.isArray(errors) ? errors : []
    }
}

// Same fallback pattern the legacy logSession() uses (db/index.jsx).
function defaultGenerateSessionId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * performCartridgeLog — build, validate, invalidate, commit, in that exact
 * order. Throws CartridgeValidationError (never calling `commit`, never
 * calling `invalidateDraft`) when the built payload fails validation — so a
 * validation failure can never open a transaction, reset in-memory state, or
 * touch the durable draft.
 *
 * @returns {Promise<{ id: any, sessionId: string, payload: object }>}
 */
export async function performCartridgeLog({
    rawInput, ownerUserId, invalidateDraft, commit, generateSessionId = defaultGenerateSessionId,
}) {
    const sessionId = generateSessionId()
    const payload = buildCartridgeSessionPayload({ ...rawInput, sessionId })
    const errors = validateCartridgeSessionPayload(payload)
    if (errors.length > 0) {
        throw new CartridgeValidationError(errors)
    }

    // Only after validation passes — mirrors logSession's own
    // invalidate-then-commit ordering, so nothing scheduled during the
    // (already-completed) caller flush can resurrect the draft this commit
    // is about to clear.
    invalidateDraft()

    const id = await commit({ sessionData: payload, sessionId, ownerUserId })
    return { id, sessionId, payload }
}
