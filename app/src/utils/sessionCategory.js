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

// Human-facing labels for a KNOWN cartridge category — deliberately not the
// raw stored string (e.g. 'strength-conditioning' reads as "S&C", matching
// the legacy label a user already recognizes; 'custom'/'rest'/'recovery'
// get Title Case). A category outside this exact set is UNKNOWN, never
// guessed into one of these.
const CARTRIDGE_CATEGORY_LABELS = {
    'strength-conditioning': 'S&C',
    'combat': 'Combat',
    'custom': 'Custom',
    'rest': 'Rest',
    'recovery': 'Recovery',
}

const UNKNOWN_BADGE = { label: 'Unknown', className: 'badge-dim' }

/**
 * categoryBadge — { label, className } for Calendar.jsx's session badge,
 * using the row's ACTUAL category (finding #6) instead of defaulting every
 * non-'S&C' row to an amber "fight" guess.
 *
 * Two shapes, kept genuinely separate (this is a display-layer distinction
 * `sessionBucket`'s single null return can't make, since it collapses
 * "legacy with no sessionType" and "versioned but unrecognized" to the same
 * value):
 *
 * - Legacy (no `payloadVersion` key at all) — pre-A7 Calendar behavior,
 *   preserved exactly: 'S&C' -> S&C/green, 'Combat' -> Combat/red, an
 *   absent sessionType -> S&C/green, any OTHER present sessionType -> its
 *   own text/amber (a future/unknown legacy value is still shown honestly,
 *   never hidden behind "Unknown" — legacy rows are never uncertain about
 *   whether they're a session at all).
 * - "Versioned" (has a `payloadVersion` key) — must be a fully recognized
 *   readable cartridge row (known payloadVersion 1 or 2, sessionKind
 *   'cartridge') AND carry one of the five known categories, or the badge
 *   is a neutral "Unknown" — an unknown payloadVersion, unknown sessionKind,
 *   or a missing/invalid sessionCategory is never guessed into S&C.
 *
 * @param {object} session
 * @returns {{ label: string, className: string }}
 */
export function categoryBadge(session) {
    if (session == null || typeof session !== 'object') return UNKNOWN_BADGE

    if (!('payloadVersion' in session)) {
        const sessionType = session.sessionType
        if (sessionType === 'S&C') return { label: 'S&C', className: 'badge-green' }
        if (sessionType === 'Combat') return { label: 'Combat', className: 'badge-red' }
        if (sessionType === undefined || sessionType === null) return { label: 'S&C', className: 'badge-green' }
        return { label: sessionType, className: 'badge-amber' }
    }

    if (!isReadableCartridgeRow(session)) return UNKNOWN_BADGE
    const category = session.sessionCategory
    const label = CARTRIDGE_CATEGORY_LABELS[category]
    if (!label) return UNKNOWN_BADGE
    return { label, className: BADGE_BY_BUCKET[BUCKET_BY_CATEGORY[category]].className }
}

/**
 * fixedCategoryForDayType — A7b: a cartridge day's `type` determines its
 * `sessionCategory` outright for `rest`/`recovery`/`training` (every shipped
 * training day is strength/conditioning work — the cartridge format has no
 * other training flavor). Returns `null` for `custom`, which has no single
 * implied category (a "Fight" day, a recovery-studio day, a bonus class —
 * genuinely different real-world activities) and must be asked via
 * `PICKER_CATEGORIES` instead. Never guesses for an unrecognized dayType.
 *
 * @param {string} dayType
 * @returns {string|null}
 */
export function fixedCategoryForDayType(dayType) {
    if (dayType === 'training') return 'strength-conditioning'
    if (dayType === 'rest') return 'rest'
    if (dayType === 'recovery') return 'recovery'
    return null
}

/**
 * PICKER_CATEGORIES — the choices CategorySheet offers for a `custom` day.
 * Deliberately excludes `rest`/`recovery` (schema §3: those are dedicated
 * dayTypes with their own fixed category, never a custom-day user choice).
 */
export const PICKER_CATEGORIES = ['strength-conditioning', 'combat', 'custom']
