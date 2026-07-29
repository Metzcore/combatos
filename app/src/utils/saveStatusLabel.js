/**
 * utils/saveStatusLabel.js — A7b save-state honesty (corrective plan §9,
 * D11 point 5 / finding J3).
 *
 * The draft controller's bare 'idle' status is ambiguous: it means EITHER
 * "nothing has ever been saved yet for this workout" OR "the last save
 * succeeded" — the module-scope controller (db/workoutDrafts.js) has no
 * memory of which. Mapping 'idle' unconditionally to "Saved on device ✓"
 * (the first attempt's bug) asserts a saved state before any write has
 * happened. `hasKnownPersistedRow` disambiguates: true only when the caller
 * can PROVE a durable row exists (resumed from an existing draft, or has
 * observed at least one successful save transition since this workout
 * became active) — never inferred from 'idle' alone.
 *
 * Pure, side-effect free — CartridgeToday.jsx computes `hasKnownPersistedRow`
 * and calls this; TodayHeader only renders whatever label comes back
 * (or nothing, for the neutral pre-save state).
 */

export const SAVE_STATUS_TEXT = {
    saving: 'Saving…',
    error: 'Not saved — Retry',
    saved: 'Saved on device ✓',
}

/**
 * mapSaveStatusToLabel — returns the label to show, or `null` for "no badge"
 * (the neutral state before any save has genuinely happened — never an
 * alarming error, never a false success claim).
 *
 * @param {{ status: 'idle'|'saving'|'error', hasKnownPersistedRow: boolean }} args
 * @returns {string|null}
 */
export function mapSaveStatusToLabel({ status, hasKnownPersistedRow }) {
    if (status === 'saving') return SAVE_STATUS_TEXT.saving
    if (status === 'error') return SAVE_STATUS_TEXT.error
    if (status === 'idle' && hasKnownPersistedRow) return SAVE_STATUS_TEXT.saved
    return null // idle with no proof yet, or an unrecognized status — neutral, never guessed
}
