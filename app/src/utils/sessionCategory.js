/**
 * utils/sessionCategory.js — A7a session-category reader discrimination.
 *
 * Pure, side-effect free. `categoryOf` tolerates legacy, `payloadVersion: 1`,
 * and `payloadVersion: 2` rows without crashing or misreading one shape as
 * another — the exact discriminator gap the corrective-pass review flagged
 * (a reader that trusts `session.sessionCategory` without first checking
 * whether the row is even a cartridge row risks colliding with a legacy
 * field of a different meaning, though none exists here today).
 *
 * This module is new and freestanding: it is NOT wired into `weeklyStats.js`
 * or `Calendar.jsx`'s existing `sessionType === 'S&C'` aggregation/display
 * logic. Reusing it there would change their product-level aggregation
 * rules (a 3-way category split, rest/recovery exclusion) — out of scope for
 * A7a per the narrow reader-discriminator authorization; see the A7a
 * implementation report for the full reasoning.
 */

import { isReadableCartridgeRow } from './cartridgeSessionPayload.js'

const WORKOUT_CATEGORIES = new Set(['strength-conditioning', 'combat', 'custom'])

/**
 * categoryOf — the session's category, tolerant across legacy/v1/v2 shapes.
 *
 * - A readable cartridge row (payloadVersion 1 or 2, sessionKind 'cartridge')
 *   returns its `sessionCategory` field verbatim.
 * - A legacy row (no `payloadVersion` key at all) returns its `sessionType`
 *   field verbatim — the existing legacy convention ('S&C', 'Combat', …).
 * - Anything else (missing both, or an unrecognized `payloadVersion`)
 *   returns `undefined` rather than guessing.
 *
 * @param {object} session
 * @returns {string|undefined}
 */
export function categoryOf(session) {
    if (session == null || typeof session !== 'object') return undefined
    if (isReadableCartridgeRow(session)) return session.sessionCategory
    if (!('payloadVersion' in session)) return session.sessionType
    return undefined // an unrecognized payloadVersion — never guess
}

/**
 * isWorkoutCategory — true for a category that represents an actual workout
 * (schema §8's eligible-workout denominator): `strength-conditioning` /
 * `combat` / `custom`. `rest`/`recovery` (and anything unrecognized) are
 * never eligible.
 *
 * This checks the CARTRIDGE category vocabulary only. Legacy `categoryOf()`
 * values ('S&C', 'Combat', …) use different casing/spelling and are NOT
 * recognized here — normalizing legacy categories into this vocabulary is a
 * W26/weeklyStats aggregation-design question, out of scope for A7a (the
 * legacy HUD never logs a rest/recovery session at all today, so this gap
 * has no live consequence yet).
 *
 * @param {string|undefined} category
 * @returns {boolean}
 */
export function isWorkoutCategory(category) {
    return WORKOUT_CATEGORIES.has(category)
}
