/**
 * noteFilter.js — search + tag filtering over the Notes view model (W23).
 * Pure, no React, no Dexie — unit-tested in noteFilter.test.js.
 *
 * Rules (W23 ruling): case-insensitive SUBSTRING match over title + body,
 * combinable (AND) with a single active tag chip. No search libraries —
 * a live JS scan is sub-millisecond at this app's scale (low hundreds of
 * notes; see db/backup.js's memory note for the established scale
 * argument). Groups left with zero matching notes under an active filter
 * are dropped entirely (ruled: hidden, not shown-empty).
 */

/**
 * Filters a getNotesViewModel() result.
 *
 * @param {Array} groups - [{ ...group, notes: [...] }]
 * @param {{ query?: string, tag?: string }} filter - `query` is freeform
 *   search text ('' / null = no-op); `tag` is an already-normalized tag
 *   ('' / null = no-op).
 * @returns {Array} same shape, notes filtered, empty groups dropped.
 *   With no active filter, returns the input untouched (same reference).
 */
export function filterNotesViewModel(groups, { query = '', tag = '' } = {}) {
    const q = typeof query === 'string' ? query.trim().toLowerCase() : ''
    const t = typeof tag === 'string' ? tag : ''
    if (!q && !t) return groups

    return groups
        .map(group => ({
            ...group,
            notes: group.notes.filter(note => {
                if (t && !(note.tags || []).includes(t)) return false
                if (q) {
                    const title = (note.title || '').toLowerCase()
                    const body = (note.body || '').toLowerCase()
                    if (!title.includes(q) && !body.includes(q)) return false
                }
                return true
            })
        }))
        .filter(group => group.notes.length > 0)
}
