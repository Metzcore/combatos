/**
 * utils/guideCard.js — the first-run "New here? Start with the guide." card
 * on Today (W39). Pure decision and storage helpers.
 *
 * The dismissed flag is a per-device UI convenience, so it lives in
 * localStorage (like W38's install-banner dismissal), not in Dexie: no store,
 * no schema bump, and a backup restore does not carry it between phones.
 */

export const GUIDE_CARD_STORAGE_KEY = 'combatos.guideCardDismissed'

/**
 * Show the card only until it has been tapped or dismissed, and never in the
 * middle of an active workout.
 */
export function shouldShowGuideCard({ dismissed, workoutActive } = {}) {
    return !dismissed && !workoutActive
}

/** Interpret a stored value. Anything other than "1" counts as not dismissed. */
export function parseDismissed(raw) {
    return raw === '1'
}
