/**
 * utils/sessionActivityLabels.js — the ONE display vocabulary for the nine
 * `sessionActivities` ids (W26 Stage 1).
 *
 * Extracted verbatim from the local `PREPARATION` / `ACTIVITY_CHIPS` consts
 * that were private to `components/today/SessionSummary.jsx`. The Log hub's
 * Overview needs the same labels, and a second hand-written map would drift
 * the moment one surface renamed a chip — so both now read from here.
 *
 * The ids and their ORDER mirror `SESSION_ACTIVITIES` in
 * `utils/cartridgeSessionPayload.js` (the frozen schema §4 closed set).
 * That correspondence is asserted by a test rather than enforced at runtime:
 * this module stays plain data with no import of the payload contract, so a
 * presentation concern can never pull the frozen schema module into a new
 * dependency path.
 *
 * The preparation/activity split is PRESENTATIONAL ONLY — schema §4 is
 * explicit that all nine ids write into one flat `sessionActivities` array.
 * Do not treat the two groups as a payload distinction.
 */

/** Rendered as checkboxes in the session summary ("Preparation"). */
export const PREPARATION_ACTIVITIES = [
    { id: 'warmup', label: 'Warm-up' },
    { id: 'cooldown', label: 'Cooldown' },
]

/** Rendered as chips in the session summary ("Activities"). */
export const CHIP_ACTIVITIES = [
    { id: 'weights', label: 'Weights' },
    { id: 'bag-workout', label: 'Bag work' },
    { id: 'cardio', label: 'Cardio' },
    { id: 'mobility', label: 'Mobility' },
    { id: 'abs', label: 'Abs' },
    { id: 'corrective-exercises', label: 'Corrective' },
    { id: 'other', label: 'Other' },
]

/** All nine, in frozen-schema order. */
export const ALL_ACTIVITIES = [...PREPARATION_ACTIVITIES, ...CHIP_ACTIVITIES]

const LABEL_BY_ID = Object.fromEntries(ALL_ACTIVITIES.map(a => [a.id, a.label]))

/**
 * Display label for an activity id. An UNRECOGNIZED id returns the raw id
 * rather than a guess or a blank — a row carrying an id this build doesn't
 * know about (a hand-edited row, or a future id read by an older client)
 * should still be visible as itself, never silently rendered as nothing.
 *
 * @param {string} id
 * @returns {string}
 */
export function activityLabel(id) {
    return LABEL_BY_ID[id] ?? id
}
