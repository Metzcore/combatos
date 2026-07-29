/**
 * utils/extraSetState.js — A7b extra-set removal (Android acceptance
 * remediation plan §4.1). Pure, non-mutating helpers that own the safety
 * invariant for removing a performed "extra" set (a performed entry at an
 * index AT OR BEYOND the item's authored/prescribed set count):
 *
 * - Prescribed slots (index < prescribedSets) are NEVER removable, even if a
 *   caller passes such an index — refusal is a pure return value, not a
 *   thrown error, so the UI mutator can no-op cleanly.
 * - Missing, fractional, negative, or otherwise invalid prescribed counts
 *   fail closed: no set is removable when the authored boundary is unknown.
 * - Negative, non-integer, and out-of-range indexes are likewise refused.
 * - A successful removal returns a NEW array with exactly the selected
 *   entry dropped; every other entry keeps its identity, order, and values,
 *   and the input array/entries are never mutated.
 *
 * Nothing here knows about completeness, payloads, or persistence — the
 * existing CartridgeToday mutator stays the only writer of
 * itemStateById[itemId].sets, and completeness remains capped at the
 * prescribed count exactly as before.
 */

/**
 * hasMeaningfulSetValue — blank vs populated, for the confirm-before-discard
 * decision. A set entry is POPULATED if any recorded field holds a real
 * value: numeric `0` counts as populated (a deliberate entry), while empty
 * string, `null`, and `undefined` do not. A missing/non-object entry is
 * blank. Any non-empty value — including one on an unexpected key — counts,
 * so unknown data can never be discarded silently.
 *
 * @param {object|undefined|null} entry
 * @returns {boolean}
 */
export function hasMeaningfulSetValue(entry) {
    if (!entry || typeof entry !== 'object') return false
    return Object.values(entry).some((v) => v !== '' && v !== null && v !== undefined)
}

/**
 * removeExtraSetAtIndex — non-mutating removal of one EXTRA performed set.
 *
 * @param {Array|*} sets            the item's existing performed sets array
 * @param {number|*} prescribedSets the item's authored/prescribed set count
 * @param {number|*} index          the set index to remove
 * @returns {{ removed: boolean, sets: Array }}
 *   removed=false (with the ORIGINAL array reference, unchanged) when the
 *   prescribed count is invalid or the index is prescribed, negative,
 *   non-integer, or out of range;
 *   removed=true with a new array missing exactly that entry otherwise.
 */
export function removeExtraSetAtIndex(sets, prescribedSets, index) {
    const list = Array.isArray(sets) ? sets : []
    const prescribedIsValid = Number.isInteger(prescribedSets) && prescribedSets >= 0

    if (!prescribedIsValid || !Number.isInteger(index) || index < prescribedSets || index >= list.length) {
        return { removed: false, sets: list }
    }

    return { removed: true, sets: list.filter((_, i) => i !== index) }
}
