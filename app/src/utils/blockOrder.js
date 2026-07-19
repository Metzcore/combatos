/**
 * blockOrder.js — pure ordering logic for the Basic Timer blocks (W15).
 *
 * The user can reorder the Stopwatch / Rest Timer cards on the Timer hub's
 * Basic tab. The chosen order persists in the Dexie `settings` table under
 * key `basicTimerBlockOrder` (flat key/value — no schema bump), following
 * the savedRoundsTimers / bookmarkedIgnitions fallback-on-read pattern.
 *
 * A stored order is DATA FROM A PAST APP VERSION, so it can disagree with
 * the block set the current build knows about. normalizeBlockOrder is the
 * single reconciliation point:
 *   - not an array / non-string entries / duplicates → default order
 *     (never throw — a corrupt setting must not brick the Timer tab)
 *   - unknown ids (block removed in a later build)  → filtered out
 *   - missing known ids (block added in a later build) → appended at the
 *     end in default order (never silently dropped)
 *
 * moveBlock follows the navState.js identity convention: invalid or no-op
 * moves return the SAME array reference, so a bad call can never corrupt
 * state or cause a spurious re-render/persist.
 */

// Default order — MUST match the pre-W15 fixed JSX order in BasicTimer.jsx
// (Stopwatch first, Rest Timer second) so users with no stored setting see
// exactly what they saw before.
export const BASIC_TIMER_BLOCKS = ['stopwatch', 'rest']

export function normalizeBlockOrder(stored, known = BASIC_TIMER_BLOCKS) {
    if (!Array.isArray(stored)) return [...known]
    if (stored.some(id => typeof id !== 'string')) return [...known]
    if (new Set(stored).size !== stored.length) return [...known]

    const filtered = stored.filter(id => known.includes(id))
    const missing = known.filter(id => !filtered.includes(id))
    return [...filtered, ...missing]
}

export function moveBlock(order, id, delta) {
    const idx = order.indexOf(id)
    if (idx === -1) return order
    const swapIdx = idx + delta
    if (swapIdx < 0 || swapIdx >= order.length) return order
    const next = [...order]
    next[idx] = order[swapIdx]
    next[swapIdx] = order[idx]
    return next
}
