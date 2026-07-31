/**
 * hooks/useBackupPushScheduler.js — Agent auto-push scheduler (W29 PR E).
 *
 * Mirrors the sync/syncQueue.js PATTERN — a single module-level in-flight
 * guard, app-open/focus/online triggers — WITHOUT touching that module (it is
 * a protected file; see AGENTS.md/the W29 PR E task). It does NOT reuse
 * syncQueue's contract: this pushes a whole-database snapshot via
 * sync/backupPush.js, not a session envelope to Supabase.
 *
 * NEVER setInterval, Background Sync, Periodic Background Sync, push
 * notifications, or a service worker — iOS supports none of them.
 * app-open/focus/online is the only scheduler that works on both platforms
 * (settled; see the W29 PR E task).
 *
 * Inert by construction: when auto-push is off or no endpoint is configured,
 * the effect below registers NO listeners and does NO work — not even a
 * single settings read beyond the two values the caller already holds via
 * useDB(). A user who never opens the Agent screen pays nothing for this
 * hook existing.
 */
import { useEffect } from 'react'
import { useDB, db, getSetting } from '../db/index.jsx'
import { pushBackup, LAST_PUSH_OK_KEY, LAST_PUSH_ERROR_KEY } from '../sync/backupPush.js'
import { localDateStr } from '../utils/checklistDate.js'
import { isPushDue } from '../utils/backupSchedule.js'

// Single in-flight guard, module-level so overlapping triggers (e.g. a
// 'focus' and 'online' event arriving together) cannot double-send — the
// same shape as sync/syncQueue.js's `_syncInFlight`, deliberately not shared
// with it (a backup push and a session drain are unrelated in-flight sets).
let _pushInFlight = false

/**
 * runAgentPush — send one push and durably record the outcome. Exported so
 * AgentScreen's "Send now" button and this scheduler share the EXACT same
 * "did this succeed, and can a failure ever look like a success?" logic
 * instead of two hand-copied (and driftable) implementations.
 *
 * On success: LAST_PUSH_OK_KEY is written and LAST_PUSH_ERROR_KEY is
 * cleared. On failure: LAST_PUSH_ERROR_KEY is written (the PUSH_ERRORS code,
 * never a raw message — backupPush.js already guarantees that) and the
 * last-success timestamp is left completely untouched, so a failed push can
 * never overwrite evidence of the last real success.
 */
export async function runAgentPush({ endpoint, token }) {
    const result = await pushBackup({ endpoint, token })
    if (result.ok) {
        await db.settings.put({ key: LAST_PUSH_OK_KEY, value: new Date().toISOString() })
        await db.settings.delete(LAST_PUSH_ERROR_KEY)
    } else {
        await db.settings.put({ key: LAST_PUSH_ERROR_KEY, value: result.error })
    }
    return result
}

/**
 * useBackupPushScheduler — mount once at the app root, inside DBProvider
 * (needs useDB() for the current config). See App.jsx.
 */
export default function useBackupPushScheduler() {
    const { agentEndpointUrl, agentEndpointToken, agentAutoPush } = useDB()

    useEffect(() => {
        // Nothing configured / feature off: no timer, no listener, no network.
        if (!agentAutoPush || !agentEndpointUrl) return undefined

        async function maybePush() {
            if (_pushInFlight) return
            const lastSuccessIso = await getSetting(LAST_PUSH_OK_KEY)
            const due = isPushDue({
                lastSuccessIso,
                today: localDateStr(),
                endpoint: agentEndpointUrl,
                autoPush: agentAutoPush,
            })
            if (!due) return

            _pushInFlight = true
            try {
                await runAgentPush({ endpoint: agentEndpointUrl, token: agentEndpointToken })
            } finally {
                _pushInFlight = false
            }
        }

        // App-open trigger — fires once when this effect first sees a
        // configured+enabled state (including the initial mount after init()
        // resolves the persisted settings).
        maybePush()

        const onFocus = () => { maybePush() }
        const onOnline = () => { maybePush() }
        window.addEventListener('focus', onFocus)
        window.addEventListener('online', onOnline)
        return () => {
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('online', onOnline)
        }
    }, [agentAutoPush, agentEndpointUrl, agentEndpointToken])
}
