/**
 * db/bodyWeight.js — local body-weight store (W30).
 *
 * The device is the SOURCE OF TRUTH. A row is written here first and drains to
 * Supabase `body_metrics` separately (sync/bodyWeightSync.js), so logging works
 * with no signal at the gym — the same discipline the workout log already uses.
 *
 * OWNER-KEYED, always. The primary key is [ownerUserId+date], mirroring
 * workoutDrafts. The Dexie database is single-named and account switching is
 * possible, so an un-owned row could be read — or worse, UPLOADED — under
 * whoever happens to be signed in later. Body weight is health-adjacent data
 * shared with a coach; that must not be able to happen by accident.
 *
 * `date` is the user's LOCAL calendar date string from localDateStr(), never a
 * UTC-derived one, and is never parsed with `new Date('YYYY-MM-DD')`.
 *
 * syncState is one of: 'pending' | 'synced'. Any write or rewrite sets
 * 'pending' — a corrected value that stayed 'synced' would never be re-sent,
 * leaving the coach reading a stale number while the athlete sees the new one.
 */

import { db } from './index.jsx'
import { isValidKg } from '../utils/weightValue.js'
import { isValidDateStr } from '../utils/dateMath.js'

export const SYNC_PENDING = 'pending'
export const SYNC_SYNCED = 'synced'

/**
 * saveWeight — insert or correct one owner/day measurement.
 *
 * Idempotent per owner/day by construction: the compound primary key makes a
 * same-day re-log a replace, not a second row. Returns the stored row.
 */
export async function saveWeight({ ownerUserId, date, kg, note = null, now = () => new Date().toISOString() }) {
    if (!ownerUserId) throw new TypeError('saveWeight requires an ownerUserId')
    if (!isValidDateStr(date)) throw new TypeError(`saveWeight requires a YYYY-MM-DD date, got: ${date}`)
    if (!isValidKg(kg)) throw new TypeError(`saveWeight requires a valid weight in kg, got: ${kg}`)

    const existing = await db.bodyWeight.get([ownerUserId, date])
    const row = {
        ownerUserId,
        date,
        kg,
        note: note ?? null,
        // Preserved across corrections so "first recorded" stays truthful;
        // updatedAt is what moves.
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
        // A correction must go back in the queue. See the header.
        syncState: SYNC_PENDING,
        syncError: null,
        // Stable per owner/day across corrections, so the server can dedupe a
        // retry of the SAME logical measurement without treating an edit as a
        // new one.
        clientId: existing?.clientId ?? cryptoRandomId(),
    }
    await db.bodyWeight.put(row)
    return row
}

/** All of this owner's rows, newest first. Never returns another owner's. */
export async function listWeights(ownerUserId) {
    if (!ownerUserId) return []
    const rows = await db.bodyWeight.where('ownerUserId').equals(ownerUserId).toArray()
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** The newest row for this owner, or null. */
export async function latestWeightRow(ownerUserId) {
    const rows = await listWeights(ownerUserId)
    return rows[0] ?? null
}

/**
 * deleteWeight — remove one owner/day measurement locally.
 *
 * NOTE the deliberate gap: this deletes the LOCAL row only. Server-side
 * deletion is a separate concern and the Supabase policy grants owner DELETE
 * precisely so it can be honoured — but until a caller wires that up, a
 * deleted row can still exist remotely. Do not present this to the user as
 * "deleted everywhere" until that path exists.
 */
export async function deleteWeight(ownerUserId, date) {
    if (!ownerUserId || !isValidDateStr(date)) return false
    await db.bodyWeight.delete([ownerUserId, date])
    return true
}

/** Rows awaiting sync for this owner, oldest first (fair drain order). */
export async function pendingWeights(ownerUserId) {
    if (!ownerUserId) return []
    const rows = await db.bodyWeight
        .where('ownerUserId').equals(ownerUserId)
        .filter(r => r.syncState !== SYNC_SYNCED)
        .toArray()
    return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Mark a row synced. No-op if it vanished or was corrected meanwhile. */
export async function markSynced(ownerUserId, date, { expectUpdatedAt } = {}) {
    const row = await db.bodyWeight.get([ownerUserId, date])
    if (!row) return false
    // If the row changed while the request was in flight, the newer value is
    // still unsent — marking it synced here would strand the correction.
    if (expectUpdatedAt && row.updatedAt !== expectUpdatedAt) return false
    await db.bodyWeight.put({ ...row, syncState: SYNC_SYNCED, syncError: null })
    return true
}

/** Record a terminal sync failure so the UI can surface it and offer retry. */
export async function markSyncError(ownerUserId, date, errorCode) {
    const row = await db.bodyWeight.get([ownerUserId, date])
    if (!row) return false
    await db.bodyWeight.put({ ...row, syncState: SYNC_PENDING, syncError: errorCode ?? 'unknown' })
    return true
}

function cryptoRandomId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
