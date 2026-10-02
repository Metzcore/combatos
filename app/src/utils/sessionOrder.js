/**
 * utils/sessionOrder.js — W34: one ordering for logged sessions, by TRAINING
 * DAY rather than entry order. A workout logged after the fact carries a
 * `date` earlier than its `completedAt`; ordering by `completedAt` (or by
 * Dexie id) alone would treat that late entry as the newest session.
 *
 * Key: training day (`date`, falling back to the day part of `completedAt`
 * for fixtures/rows that lack one), then `completedAt`, then `id`.
 *
 * For every row the cartridge builder ever wrote, `date` is the first 10
 * characters of the fixed-width ISO `completedAt` (both come from one
 * `nowDate`), so this order is identical to ordering by `completedAt` alone.
 * Pure — no React, no Dexie.
 */

/** The session's training-day string, or '' when it has neither field. */
export function trainingDayOf(session) {
    return session?.date || (session?.completedAt || '').slice(0, 10)
}

/** Ascending comparator (oldest first). */
export function compareSessionOrder(a, b) {
    const dayA = trainingDayOf(a)
    const dayB = trainingDayOf(b)
    if (dayA !== dayB) return dayA < dayB ? -1 : 1
    const doneA = a?.completedAt || ''
    const doneB = b?.completedAt || ''
    if (doneA !== doneB) return doneA < doneB ? -1 : 1
    return (a?.id ?? 0) - (b?.id ?? 0)
}

/** Descending comparator (newest first) — for Array.prototype.sort. */
export function compareNewestFirst(a, b) {
    return compareSessionOrder(b, a)
}

export default { trainingDayOf, compareSessionOrder, compareNewestFirst }
