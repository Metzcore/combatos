/**
 * sync/syncQueue.js — outbound sync queue, draining to Supabase (M2).
 *
 *   - trySyncQueue      — drains the Dexie syncQueue table to Supabase
 *   - enqueueSync       — adds a pending envelope to the syncQueue table
 *   - initSyncListeners — registers the window online/focus auto-sync hooks
 *
 * History: this used to POST each envelope to a Google Sheets webhook with
 * `mode: 'no-cors'` (opaque response — success was inferred, failures were
 * invisible). M2 repoints the drain to Supabase: real ok/error responses,
 * per-user rows protected by RLS, idempotent retries via the
 * unique(user_id, client_session_id) constraint. This deliberately supersedes
 * AGENTS.md rule 2 for the WRITE path (see SUPABASE-MIGRATION-PLAN §6–§7);
 * the old webhook (`scripts/webhook.gs`) is left in place but no longer called.
 *
 * Queue mechanics, retry/attempts, offline handling, and the online/focus
 * listeners are all unchanged — only the per-item drain target differs.
 *
 * The Dexie `db` instance stays owned by db/index.jsx; this module imports it.
 * Both cross-module references only occur inside function bodies, so the
 * db/index.jsx <-> sync/syncQueue.js import cycle is safe in ESM.
 */

import { db } from '../db/index.jsx'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const MAX_ATTEMPTS = 5
let _syncInFlight = false  // prevent concurrent sync runs
// `var` (not `let`): initSyncListeners() runs at db/index.jsx module-eval time,
// which can execute mid-cycle before this module's top level finishes if a
// future module imports sync/syncQueue.js first — var hoists to undefined
// (falsy, correct) instead of throwing a TDZ ReferenceError.
var _listenersInitialized = false  // guard against accidental double-registration

/**
 * enqueueSync — add a pending sync envelope to the syncQueue table.
 * `entry` is the full queue row: { sessionId, attempts, payload }, where
 * `payload` is the action envelope { action, sessionId, payload? }.
 */
export async function enqueueSync(entry) {
    await db.syncQueue.add(entry)
}

/**
 * pushEnvelope — send one action envelope to Supabase.
 * Returns 'ok' (drop from queue) or 'retry' (increment attempts).
 * `userId` is the authenticated user's id, stamped onto inserted rows so RLS
 * (`with check (user_id = auth.uid())`) accepts them.
 */
async function pushEnvelope(envelope, userId) {
    if (envelope.action === 'delete') {
        // RLS scopes this to the caller's own rows; deleting a row that isn't
        // there (already gone, never synced) is not an error — idempotent.
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('client_session_id', envelope.sessionId)
        return error ? 'retry' : 'ok'
    }

    // action === 'log' (the default/legacy shape)
    const { error } = await supabase.from('sessions').insert({
        user_id: userId,
        client_session_id: envelope.sessionId,
        cartridge_id: envelope.payload?.cartridgeId ?? null,  // null today; future-proofing
        payload: envelope.payload,
    })
    if (error) {
        // 23505 = unique_violation: this client_session_id is already synced,
        // so a re-sent row is a no-op success (idempotent retry, plan §6/§12).
        if (error.code === '23505') return 'ok'
        return 'retry'
    }
    return 'ok'
}

export async function trySyncQueue(onComplete) {
    if (_syncInFlight) return  // already running — bail out
    if (!navigator.onLine) return
    if (!isSupabaseConfigured) return  // no backend configured (e.g. local-only build)

    // Auth guard: only drain when signed in — an unauthenticated insert would
    // be rejected by RLS anyway, so don't burn attempts on it.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const userId = session.user.id

    _syncInFlight = true
    try {
        const pending = await db.syncQueue.toArray()
        for (const item of pending) {
            if (item.attempts >= MAX_ATTEMPTS) continue
            try {
                const result = await pushEnvelope(item.payload, userId)
                if (result === 'ok') {
                    await db.syncQueue.delete(item.id)
                } else {
                    await db.syncQueue.update(item.id, { attempts: item.attempts + 1 })
                }
            } catch {
                await db.syncQueue.update(item.id, { attempts: item.attempts + 1 })
            }
        }
    } finally {
        _syncInFlight = false
        if (onComplete) onComplete()
    }
}

/**
 * initSyncListeners — auto-sync on tab focus and online event.
 * Called exactly once (from db/index.jsx at module-eval time, matching the
 * pre-refactor registration timing); the guard flag is defense-in-depth
 * against any future accidental double-call.
 */
export function initSyncListeners() {
    if (_listenersInitialized) return
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => trySyncQueue())
        window.addEventListener('focus', () => trySyncQueue())
        _listenersInitialized = true
    }
}
