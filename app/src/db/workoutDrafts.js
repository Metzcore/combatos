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
            status = 'idle'
            lastError = null
        } catch (err) {
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
     */
    function invalidate() {
        generation += 1
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        pending = null
    }

    /**
     * Discard / sign-out / log path: invalidate, then delete the owner's
     * row behind whatever write is already in flight.
     */
    function discardDraft(ownerUserId) {
        invalidate()
        return enqueue(async () => {
            try {
                await db.workoutDrafts.delete([ownerUserId, 'active'])
            } catch (err) {
                // A failed local delete must never block the caller (sign-out
                // in particular) — the composite owner key still prevents a
                // later identity from ever hydrating this row.
                console.error('workoutDrafts: delete failed', err)
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
