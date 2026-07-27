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
 * `sessionBucket`/`categoryBadge` wire this discrimination into
 * `weeklyStats.js` and `Calendar.jsx` (corrective-pass finding #6): the
 * schema §7/§8 aggregation rules are already frozen and ruled (D11), not an
 * open product decision, so this module now implements them rather than
 * merely existing unused.
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

// Unifies legacy and cartridge category vocabularies into the schema §7
// three-way workout split plus the two non-workout day types. Legacy never
// produces 'rest'/'recovery' (the HUD has no rest-day concept), so those
// two buckets are cartridge-only in practice, but the mapping itself is
// shape-agnostic.
const BUCKET_BY_CATEGORY = {
    'S&C': 'sc', 'strength-conditioning': 'sc',
    'Combat': 'combat', 'combat': 'combat',
    'Cardio': 'other', 'Mobility': 'other', 'custom': 'other',
    'rest': 'rest', 'recovery': 'recovery',
}

/**
 * sessionBucket — schema §7's `sc` / `combat` / `other` / `rest` /
 * `recovery` classification, tolerant across legacy/v1/v2 shapes. Returns
 * `null` for an unrecognized/absent category rather than guessing — such a
 * row contributes to NO bucket (never silently folded into "other").
 *
 * @param {object} session
 * @returns {'sc'|'combat'|'other'|'rest'|'recovery'|null}
 */
export function sessionBucket(session) {
    const category = categoryOf(session)
    return BUCKET_BY_CATEGORY[category] ?? null
}

const BADGE_BY_BUCKET = {
    sc: { className: 'badge-green' },
    combat: { className: 'badge-red' },
    other: { className: 'badge-amber' },
    rest: { className: 'badge-dim' },
    recovery: { className: 'badge-dim' },
}

/**
 * categoryBadge — { label, className } for Calendar.jsx's session badge,
 * using the row's ACTUAL category (finding #6) instead of defaulting every
 * non-'S&C' row to an amber "fight" guess. `label` is the raw category
 * string as stored (already human-readable: 'S&C', 'Combat', 'rest', …);
 * an unrecognized/absent category falls back to the pre-existing legacy
 * default ('S&C' / green) exactly as Calendar.jsx did before this change,
 * so old rows keep rendering exactly as they always have.
 *
 * @param {object} session
 * @returns {{ label: string, className: string }}
 */
export function categoryBadge(session) {
    const category = categoryOf(session)
    const bucket = sessionBucket(session)
    if (bucket === null) return { label: 'S&C', className: 'badge-green' }
    return { label: category, className: BADGE_BY_BUCKET[bucket].className }
}
