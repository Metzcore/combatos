/**
 * sync/bodyWeightSync.js — drains local body-weight rows to Supabase (W30).
 *
 * A SIBLING of syncQueue.js, deliberately not part of it. Weight rows are
 * queue-shaped — small, per-row, idempotent, auth-gated, worth retrying
 * offline — so the temptation to add an action type to the existing drain is
 * real. It is wrong for six concrete reasons, and one of them is a silent
 * data-loss bug:
 *
 *   1. `pushEnvelope` hardcodes the Supabase `sessions` table, and an UNKNOWN
 *      action falls through to the session INSERT path. Extending it means
 *      editing the protected workout drain to add an unrelated feature.
 *   2. Weight rows have no sessionId; the local queue schema indexes one.
 *   3. syncQueue rows are themselves included in a full backup, so a weight
 *      action there would disclose the measurement twice.
 *   4. Its five-attempt dead-letter silently skips forever — for a weekly
 *      check-in that reads to the coach as "the athlete stopped logging".
 *   5. ── THE IMPORTANT ONE ──
 *      syncQueue converts EVERY 23505 unique violation into success. That is
 *      correct there only because a logged session is immutable, so "already
 *      present" genuinely means "already done". WEIGHT IS MUTABLE PER DAY: a
 *      corrected value hits the same (user_id, measured_on) constraint, and
 *      treating that as success would mean the correction NEVER reaches the
 *      server. The athlete would see the new number, the coach would keep
 *      reading the old one, and nothing anywhere would report an error.
 *      So this module UPSERTS on conflict rather than swallowing it.
 *   6. syncQueue rows are not owner-keyed and the drain stamps whoever is
 *      authenticated at drain time. For health data shared with a coach that
 *      is not acceptable.
 *
 * What IS reused is the PATTERN, not the contract: an auth gate, one in-flight
 * run, and app-open/focus/online triggers.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { pendingWeights, markSynced, markSyncError } from '../db/bodyWeight.js'

export const WEIGHT_SYNC_ERRORS = Object.freeze({
    OFFLINE: 'offline',
    NOT_CONFIGURED: 'not-configured',
    NOT_AUTHENTICATED: 'not-authenticated',
    REJECTED: 'rejected',   // server refused (RLS, constraint, validation)
    NETWORK: 'network',
})

let _inFlight = false

/**
 * pushWeightRow — send ONE row. Exported for targeted retry from the UI.
 *
 * Upserts on (user_id, measured_on): the row is the owner's single measurement
 * for that day, so a conflict means "correct it", never "skip it". See reason
 * 5 in the header — this is the whole reason the module exists separately.
 */
export async function pushWeightRow(row, userId, client = supabase) {
    // Guard against ever stamping the current identity onto another owner's
    // row. Ownership is decided by the row, never by who happens to be signed
    // in when the drain runs.
    if (!row || row.ownerUserId !== userId) {
        return { ok: false, error: WEIGHT_SYNC_ERRORS.REJECTED }
    }

    try {
        const { error } = await client
            .from('body_metrics')
            .upsert({
                user_id: userId,
                measured_on: row.date,
                kg: row.kg,
                client_id: row.clientId,
            }, { onConflict: 'user_id,measured_on' })

        if (error) {
            // Deliberately NOT special-casing 23505 as success. See header.
            return { ok: false, error: WEIGHT_SYNC_ERRORS.REJECTED, detail: error.code ?? null }
        }
        return { ok: true }
    } catch {
        return { ok: false, error: WEIGHT_SYNC_ERRORS.NETWORK }
    }
}

/**
 * syncBodyWeight — drain this owner's pending rows.
 *
 * Bails BEFORE recording any failure when offline, unconfigured or signed out.
 * Those are ambient states, not errors the user should see attached to their
 * weight entry — surfacing "sync failed" because they walked into a basement
 * would train them to ignore a signal that should mean something.
 */
export async function syncBodyWeight({
    client = supabase,
    configured = isSupabaseConfigured,
    isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    getPending = pendingWeights,
    onSynced = markSynced,
    onError = markSyncError,
} = {}) {
    if (_inFlight) return { ok: false, error: 'already-running', synced: 0 }
    if (!configured) return { ok: false, error: WEIGHT_SYNC_ERRORS.NOT_CONFIGURED, synced: 0 }
    if (!isOnline()) return { ok: false, error: WEIGHT_SYNC_ERRORS.OFFLINE, synced: 0 }

    let userId
    try {
        const { data } = await client.auth.getSession()
        userId = data?.session?.user?.id
    } catch {
        return { ok: false, error: WEIGHT_SYNC_ERRORS.NETWORK, synced: 0 }
    }
    if (!userId) return { ok: false, error: WEIGHT_SYNC_ERRORS.NOT_AUTHENTICATED, synced: 0 }

    _inFlight = true
    let synced = 0
    let failed = 0
    try {
        const rows = await getPending(userId)
        for (const row of rows) {
            const result = await pushWeightRow(row, userId, client)
            if (result.ok) {
                // Pass the updatedAt we sent so a correction made mid-flight is
                // NOT marked synced — it must stay pending and go again.
                const marked = await onSynced(row.ownerUserId, row.date, { expectUpdatedAt: row.updatedAt })
                if (marked) synced++
            } else {
                failed++
                await onError(row.ownerUserId, row.date, result.error)
            }
        }
    } finally {
        _inFlight = false
    }

    return { ok: failed === 0, synced, failed }
}

/** Test-only: clear the in-flight guard between cases. */
export function __resetInFlightForTests() {
    _inFlight = false
}
