/**
 * sync/syncQueue.js — outbound sync queue for the Google Sheets webhook
 *
 * Extracted from db/index.jsx (W8) with zero behavior change:
 *   - trySyncQueue      — drains the Dexie syncQueue table to the webhook
 *   - enqueueSync       — adds a pending envelope to the syncQueue table
 *   - initSyncListeners — registers the window online/focus auto-sync hooks
 *
 * The Dexie `db` instance stays owned by db/index.jsx; this module imports
 * it. Both cross-module references only occur inside function bodies, so
 * the db/index.jsx <-> sync/syncQueue.js import cycle is safe in ESM.
 */

import { db, getSetting } from '../db/index.jsx'

const MAX_ATTEMPTS = 5
let _syncInFlight = false  // prevent concurrent sync runs
// `var` (not `let`): initSyncListeners() runs at db/index.jsx module-eval time,
// which can execute mid-cycle before this module's top level finishes if a
// future module imports sync/syncQueue.js first — var hoists to undefined
// (falsy, correct) instead of throwing a TDZ ReferenceError.
var _listenersInitialized = false  // guard against accidental double-registration

/**
 * enqueueSync — add a pending webhook envelope to the syncQueue table.
 * `entry` is the full queue row: { sessionId, attempts, payload }.
 */
export async function enqueueSync(entry) {
    await db.syncQueue.add(entry)
}

export async function trySyncQueue(onComplete) {
    if (_syncInFlight) return  // already running — bail out
    if (!navigator.onLine) return
    const webhookUrl = await getSetting('webhookUrl')
    if (!webhookUrl) return  // webhook not configured yet

    _syncInFlight = true
    try {
        const pending = await db.syncQueue.toArray()
        for (const item of pending) {
            if (item.attempts >= MAX_ATTEMPTS) continue
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(item.payload)
                })
                // no-cors returns an opaque response (type: 'opaque', res.ok is false, status is 0)
                // If we don't hit the catch block, the request was successfully sent.
                if (res.type === 'opaque' || res.ok) {
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
