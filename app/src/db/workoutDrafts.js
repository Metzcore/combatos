/**
 * db/workoutDrafts.js — A6.5 durable active-workout draft persistence.
 *
 * Owns the write path for the `workoutDrafts` Dexie table at MODULE scope
 * (mirrors sync/syncQueue.js's `_syncInFlight`/listener pattern): a debounce
 * timer, the latest pending snapshot, a monotonically increasing generation,
 * and a serialized write chain. React only binds to controller status via
 * useWorkoutDraftPersistence.js — it never owns timers or the write chain.
 *
 * Why module scope, not the hook: AuthProvider (signOut, the SIGNED_OUT
 * event) is an ANCESTOR of the hook in the component tree
 * (AuthProvider > AuthGate > CartridgeAccessProvider > DBProvider > hook).
 * React context/state only flows downward, so a hook-resident controller
 * could never be reached synchronously from signOut() — a save already
 * scheduled just before sign-out could land after the auth event and
 * resurrect the draft under the just-signed-out owner. A module singleton
 * has no such direction constraint: AuthProvider, the conflict preflight,
 * and logSession all import and call the same object directly.
 *
 * Generation discipline: every write captures the generation active when it
 * was SCHEDULED and re-checks it immediately before committing (synchronous
 * check, no await between check and Dexie call — invalidate() cannot
 * interleave). invalidate() bumps the generation synchronously (no Dexie
 * access), so a debounced edit queued before a discard/sign-out/log can
 * never resurrect the cleared row — it silently no-ops when its turn in the
 * write chain comes up. A delete, unlike a put, is always safe to run
 * regardless of generation (it never resurrects content), so discardDraft
 * does not gate the delete itself — only invalidate()'s effect on FUTURE
 * puts matters.
 *
 * Must not touch Dexie at module-evaluation time — only inside controller
 * method calls — so importing this module has no side effects.
 */

import { db } from './index.jsx'
import { enqueueSync } from '../sync/syncQueue.js'

const AUTOSAVE_MS = 700

export function createWorkoutDraftController({ debounceMs = AUTOSAVE_MS } = {}) {
    let generation = 0
    let timer = null
    let pending = null // { row, generation }
    let writeChain = Promise.resolve()
    let status = 'idle' // 'idle' | 'saving' | 'error'
    let lastError = null
    const listeners = new Set()

    function notify() {
        for (const listener of listeners) listener({ status, error: lastError })
    }

    function subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
    }

    function enqueue(task) {
        // Chain onto BOTH branches so one failed write never wedges
        // everything queued after it.
        writeChain = writeChain.then(task, task)
        return writeChain
    }

    async function commitRow(entry) {
        if (entry.generation !== generation) return // stale — must never resurrect
        status = 'saving'
        notify()
        try {
            await db.workoutDrafts.put(entry.row)
            // Re-check AFTER the await, not just before it: invalidate()
            // (discard/sign-out/log) can run while this put is still in
            // flight. Without this recheck, a write that went stale mid-
            // flight would still land its own status update once the put
            // settles — most dangerously on FAILURE, which would silently
            // restore "Draft not saved" even though invalidate() already
            // reset status to idle and the draft may have already been
            // successfully discarded/logged.
            if (entry.generation !== generation) return
            status = 'idle'
            lastError = null
        } catch (err) {
            if (entry.generation !== generation) return
            status = 'error'
            lastError = err
        }
        notify()
    }

    /** Debounced save — text/numeric edits (700ms, NoteEditor precedent). */
    function schedule(row) {
        pending = { row, generation }
        if (timer) clearTimeout(timer)
        timer = setTimeout(flush, debounceMs)
    }

    /** Immediate save — discrete actions (checks, substitution choices). */
    function saveNow(row) {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        pending = null
        const entry = { row, generation }
        return enqueue(() => commitRow(entry))
    }

    /**
     * Force the currently pending debounced write through now (or, if
     * nothing is pending, resolve once whatever is already in flight
     * settles). Used on visibilitychange/pagehide/unmount, and to persist
     * the newest snapshot before a log attempt.
     */
    function flush() {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        if (pending) {
            const entry = pending
            pending = null
            return enqueue(() => commitRow(entry))
        }
        return enqueue(() => {})
    }

    /**
     * Synchronously cancel any pending debounce and bump the generation so
     * every write scheduled before this call is stale from here on. Pure
     * in-memory — never touches Dexie — so it can run from signOut() (an
     * AuthProvider ancestor) without awaiting anything.
     *
     * Also clears a stale 'error' status: every caller (discard, sign-out,
     * log) is ending this draft's write lifecycle, so a report about a
     * PRIOR save no longer describes anything live. Safe against a stale
     * in-flight write completing afterward and re-setting it — commitRow's
     * generation check runs before it touches status, so an already-stale
     * write never reaches that code once its generation stops matching.
     */
    function invalidate() {
        generation += 1
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        pending = null
        if (status !== 'idle') {
            status = 'idle'
            lastError = null
            notify()
        }
    }

    /**
     * Discard / sign-out / log path: invalidate, then delete the owner's
     * row behind whatever write is already in flight.
     *
     * Rejects if the delete itself fails. Interactive callers (Discard,
     * Discard-and-switch, Reset HUD) must see that failure and preserve
     * the current workout/context rather than proceeding as if the row
     * were gone. Only sign-out is exempt from this — AuthProvider wraps
     * its two calls in their own best-effort catch, because blocking
     * sign-out on a local delete failure is worse than a stray row that
     * the composite owner key already prevents another identity from ever
     * hydrating.
     *
     * invalidate() cancels whatever debounced edit was still pending —
     * correct when the delete SUCCEEDS (the whole draft is intentionally
     * gone), but if the delete FAILS the row (and this owner's draft)
     * still exists, so that cancelled edit must not be silently lost
     * forever. On failure it's re-persisted under the new generation
     * before the rejection propagates.
     */
    function discardDraft(ownerUserId) {
        const cancelledPending = pending
        invalidate()
        return enqueue(async () => {
            try {
                await db.workoutDrafts.delete([ownerUserId, 'active'])
            } catch (err) {
                if (cancelledPending) {
                    try {
                        await db.workoutDrafts.put(cancelledPending.row)
                    } catch (recoveryErr) {
                        // The delete AND the recovery attempt both failed —
                        // the user's latest edit is now genuinely at risk of
                        // being lost, not just cancelled. Surface this the
                        // same way a failed autosave would (status/notify),
                        // so "Draft not saved" + Retry appears — leaving the
                        // controller idle here would silently hide a real
                        // data-loss risk.
                        status = 'error'
                        lastError = recoveryErr
                        notify()
                        console.error('workoutDrafts: failed to recover cancelled pending snapshot', recoveryErr)
                    }
                }
                throw err
            }
        })
    }

    function getStatus() {
        return { status, error: lastError }
    }

    return {
        schedule,
        saveNow,
        flush,
        invalidate,
        discardDraft,
        getStatus,
        subscribe,
    }
}

export const workoutDraftController = createWorkoutDraftController()

// ─── Direct row access (hydration) ─────────────────────────────────────────
// A read before anything is scheduled — not routed through the write chain.

export async function loadActiveDraft(ownerUserId) {
    if (!ownerUserId) return null
    return db.workoutDrafts.get([ownerUserId, 'active'])
}

/**
 * commitLoggedSession — the exact atomic transaction logSession() uses:
 * add the session, enqueue the sync envelope, delete the owner's draft, all
 * in one Dexie transaction. Extracted here (rather than inlined in
 * db/index.jsx's DBProvider) so it's the SAME function exercised by
 * db/workoutDrafts.test.js as by production — this repo has no React-render
 * test infrastructure, so without this extraction the transaction pattern
 * could only be verified by a hand-copied mirror in the test file, which
 * could silently drift from what logSession actually does.
 *
 * On failure (any step throws) the transaction rolls back all three
 * operations together and this rejects; the draft row is left untouched.
 */
export async function commitLoggedSession({ sessionData, sessionId, ownerUserId }) {
    let id
    await db.transaction('rw', db.sessions, db.syncQueue, db.workoutDrafts, async () => {
        id = await db.sessions.add(sessionData)
        const payloadEnvelope = { action: 'log', sessionId, payload: sessionData }
        await enqueueSync({ sessionId: id, attempts: 0, payload: payloadEnvelope })
        if (ownerUserId) await db.workoutDrafts.delete([ownerUserId, 'active'])
    })
    return id
}
