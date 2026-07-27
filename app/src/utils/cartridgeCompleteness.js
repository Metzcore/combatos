/**
 * utils/cartridgeCompleteness.js — A7a completeness (schema §7).
 *
 * Pure, side-effect free. Only strength/core main sets and a prescribed
 * PAP/pair's own sets count — mobility, cooldown, and conditioning
 * contribute nothing to the denominator (corrected from the first attempt,
 * which counted all three). Extra performed sets beyond the prescribed count
 * are retained in the payload elsewhere but never inflate completeness past
 * its cap.
 */

const HOLD_OR_CONDITIONING_KINDS = new Set(['mobility', 'cooldown', 'conditioning'])
const LOADED_KINDS = new Set(['strength', 'core'])

function isFilledSet(entry) {
    if (!entry || typeof entry !== 'object') return false
    const hasKg = typeof entry.kg === 'number' && Number.isFinite(entry.kg)
    const hasReps = typeof entry.reps === 'number' && Number.isFinite(entry.reps)
    return hasKg || hasReps // an RPE/RIR-only entry does NOT count as filled
}

function countFilledSets(sets) {
    if (!Array.isArray(sets)) return 0
    return sets.reduce((n, entry) => n + (isFilledSet(entry) ? 1 : 0), 0)
}

/**
 * itemCompleteness — units/done for a single item, per its block kind.
 *
 * @returns {{ units: number, done: number }}
 */
export function itemCompleteness(kind, prescribed, performed) {
    if (HOLD_OR_CONDITIONING_KINDS.has(kind)) {
        return { units: 0, done: 0 } // always — no denominator contribution
    }
    if (!LOADED_KINDS.has(kind)) {
        return { units: 0, done: 0 } // unknown kind — contributes nothing, never throws
    }

    const mainCap = typeof prescribed?.sets === 'number' ? prescribed.sets : 0
    const mainDone = Math.min(countFilledSets(performed?.sets), mainCap)

    const pairCap = typeof prescribed?.pair?.sets === 'number' ? prescribed.pair.sets : 0
    const pairDone = Math.min(countFilledSets(performed?.pair?.sets), pairCap)

    return { units: mainCap + pairCap, done: mainDone + pairDone }
}

/**
 * computeCartridgeCompleteness — the single function driving both a live
 * progress display (A7b) and the stored payload value (A7a's builder).
 *
 * Returns `null` (never `0`) when there is nothing to measure: a
 * `custom`/`rest`/`recovery` day, or a `training` day whose blocks are all
 * mobility/cooldown/conditioning (zero total units).
 *
 * @param {Array<{kind: string, items: Array<{prescribed: object, performed: object}>}>} blocks
 * @param {string} dayType
 * @returns {number|null}
 */
export function computeCartridgeCompleteness(blocks, dayType) {
    if (dayType === 'custom' || dayType === 'rest' || dayType === 'recovery') return null

    let totalUnits = 0
    let totalDone = 0
    for (const block of blocks || []) {
        for (const item of block.items || []) {
            const { units, done } = itemCompleteness(block.kind, item.prescribed, item.performed)
            totalUnits += units
            totalDone += done
        }
    }

    if (totalUnits === 0) return null
    return Math.round((totalDone / totalUnits) * 100 * 10) / 10
}
