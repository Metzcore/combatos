/**
 * utils/lastPerformance.js — A7a last-performance recall (schema §9).
 *
 * Pure, side-effect free — no Dexie, no React. `findLastPerformance` reads
 * from an already-loaded array of session payload objects (any mix of
 * legacy/v1/v2 rows tolerated — non-cartridge or non-matching rows are
 * simply skipped, never thrown on); the caller (A7b, later) is responsible
 * for supplying `db.sessions.toArray()`.
 */

import { isReadableCartridgeRow } from './cartridgeSessionPayload.js'

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasMeaningfulSet(sets) {
    if (!Array.isArray(sets)) return false
    return sets.some(entry => {
        if (!isPlainObject(entry)) return false
        return (typeof entry.kg === 'number' && Number.isFinite(entry.kg))
            || (typeof entry.reps === 'number' && Number.isFinite(entry.reps))
    })
}

function sessionSortKey(session) {
    // completedAt is always present on a well-formed cartridge row; date is
    // the fallback for anything unusual. Newest first.
    return session.completedAt || session.date || ''
}

function findItem(session, itemId) {
    for (const block of session.blocks || []) {
        for (const item of block.items || []) {
            if (item.itemId === itemId) return item
        }
    }
    return null
}

/**
 * findLastPerformance — the newest session matching BOTH cartridgeId and
 * itemId whose performed.sets (main sets) contains at least one entry with
 * kg or reps present — skipping any newer matching-but-empty candidate
 * (a day the item was left untouched, or substituted to something recorded
 * with no numbers) so it never masks an earlier session with real numbers.
 *
 * @param {Array<object>} sessions - raw rows (any shape; non-matching rows are skipped)
 * @param {{ cartridgeId: string, itemId: string }} args
 * @returns {{ date: string, prescribedName: string, sets: Array, substitutedTo?: string } | null}
 */
export function findLastPerformance(sessions, { cartridgeId, itemId }) {
    if (!Array.isArray(sessions) || !cartridgeId || !itemId) return null

    const candidates = sessions
        .filter(s => isReadableCartridgeRow(s) && s.cartridgeId === cartridgeId)
        .sort((a, b) => (sessionSortKey(b) < sessionSortKey(a) ? -1 : sessionSortKey(b) > sessionSortKey(a) ? 1 : 0))

    for (const session of candidates) {
        const item = findItem(session, itemId)
        if (!item) continue
        const sets = item.performed?.sets
        if (!hasMeaningfulSet(sets)) continue // real match, but no meaningful data — keep looking older

        const result = {
            date: session.date,
            prescribedName: item.prescribed?.name,
            sets,
        }
        if (item.substituted && item.performed?.name) result.substitutedTo = item.performed.name
        return result
    }

    return null
}

/**
 * resolveUseLastValues — the pure "Use Last Values" helper A7b's UI calls
 * (schema §9), never duplicated in the component layer.
 *
 * Copies only when the effective exercise matches: today's effective name
 * (the current substitution if one exists today, else the prescribed name)
 * must equal the recalled record's effective name (`substitutedTo` if that
 * historical record was itself substituted, else its `prescribedName`).
 * Copies at most the CURRENT prescribed set count — never the historical
 * record's set count if that was larger. A single explicit call; never
 * auto-applied.
 *
 * @param {{ todayEffectiveName: string, lastRecord: ReturnType<typeof findLastPerformance>, currentPrescribedSetCount: number }} args
 * @returns {Array|null} the sets to copy, capped, or null if no copy should happen
 */
export function resolveUseLastValues({ todayEffectiveName, lastRecord, currentPrescribedSetCount }) {
    if (!lastRecord) return null
    const recordEffectiveName = lastRecord.substitutedTo || lastRecord.prescribedName
    if (!todayEffectiveName || recordEffectiveName !== todayEffectiveName) return null
    const cap = typeof currentPrescribedSetCount === 'number' && currentPrescribedSetCount >= 0
        ? currentPrescribedSetCount
        : 0
    return (lastRecord.sets || []).slice(0, cap)
}
