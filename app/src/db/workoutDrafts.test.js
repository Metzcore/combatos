/**
 * workoutDrafts.test.js — A6.5 schema/upgrade safety + controller behavior.
 *
 * Same harness pattern as notes.test.js: fake-indexeddb/auto, browser
 * globals via vi.stubGlobal, driving Dexie tables and the controller
 * factory directly (no React rendering).
 *
 * The upgrade-path test uses an ISOLATED Dexie database name — never the
 * shared 'FightersOS' instance other test files manipulate — so cross-test
 * pollution can't fake a pass or a fail. It seeds real-shaped rows across
 * EVERY v3 table and proves they survive the v4 bump byte-for-byte.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './index.jsx'
import { createWorkoutDraftController, loadActiveDraft, workoutDraftController, commitLoggedSession } from './workoutDrafts.js'
import {
    buildDraftRow, buildLegacyIdentity, buildCartridgeIdentity,
    buildLegacyDefinitionSnapshot, buildCartridgeDefinitionSnapshot,
    validateDraftRow,
} from '../utils/workoutDraftState.js'

vi.stubGlobal('navigator', { onLine: true })

const OWNER_A = '11111111-1111-4111-8111-111111111111'
const OWNER_B = '22222222-2222-4222-8222-222222222222'

beforeEach(async () => {
    await db.workoutDrafts.clear()
    await db.sessions.clear()
    await db.syncQueue.clear()
})

// ─── Schema / upgrade safety ────────────────────────────────────────────────

describe('schema — version 4 wiring on the real db instance', () => {
    it('is at version 4 or later with workoutDrafts present and every prior table intact', () => {
        // Never hardcode the CURRENT version — a later feature bumps
        // further, exactly how A6.5 itself broke notes.test.js/
        // cartridgeAccess.test.js's old toBe(3) assertions. Every schema
        // test in this repo declares its own minimum, never an exact pin.
        expect(db.verno).toBeGreaterThanOrEqual(4)
        const names = db.tables.map(t => t.name)
        expect(names).toContain('workoutDrafts')
        expect(names).toContain('sessions')
        expect(names).toContain('syncQueue')
        expect(names).toContain('settings')
        expect(names).toContain('checklistGroups')
        expect(names).toContain('checklistTasks')
        expect(names).toContain('checklistCompletions')
        expect(names).toContain('noteGroups')
        expect(names).toContain('notes')
    })
})

describe('schema — upgrade path from a DB created at version 3', () => {
    const NAME = 'FightersOS-a65-upgrade-test'

    const V1_STORES = {
        sessions: '++id, date, day, phase, hipScore',
        syncQueue: '++id, sessionId, attempts',
        settings: 'key',
    }
    const V2_STORES = {
        ...V1_STORES,
        checklistGroups: 'id, order',
        checklistTasks: 'id, groupId, [groupId+order], deletedAt',
        checklistCompletions: '[taskId+date], taskId',
    }
    const V3_STORES = {
        ...V2_STORES,
        noteGroups: 'id, order',
        notes: 'id, groupId, deletedAt, *tags',
    }
    const V4_STORES = {
        ...V3_STORES,
        workoutDrafts: '[ownerUserId+slot], ownerUserId, updatedAt',
    }

    it('preserves v3 data (every table) byte-for-byte and adds an empty workoutDrafts table', async () => {
        await Dexie.delete(NAME)

        // 1. Create a database exactly as version(3) shipped it, with
        //    real-shaped rows across every era of data.
        const v3 = new Dexie(NAME)
        v3.version(1).stores(V1_STORES)
        v3.version(2).stores(V2_STORES)
        v3.version(3).stores(V3_STORES)

        const sessionRow = {
            sessionId: 'real-session-uuid', date: '2026-07-01',
            day: 1, phase: 2, hipScore: 4, sessionType: 'S&C', completeness: 90,
        }
        const rowId = await v3.sessions.add(sessionRow)
        const syncRow = { sessionId: rowId, attempts: 0, payload: { action: 'log', sessionId: 'real-session-uuid' } }
        const syncId = await v3.syncQueue.add(syncRow)
        await v3.settings.put({ key: 'currentPhase', value: 2 })
        const groupRow = {
            id: 'g-real', name: 'Health', order: 0,
            createdAt: '2026-07-10T08:00:00.000Z', updatedAt: '2026-07-10T08:00:00.000Z', deletedAt: null,
        }
        const taskRow = {
            id: 't-real', groupId: 'g-real', title: 'Hydrate', note: '',
            scheduledTime: '07:00', repeatDaily: true, order: 0,
            createdAt: '2026-07-10T08:00:00.000Z', updatedAt: '2026-07-10T08:00:00.000Z', deletedAt: null,
        }
        const completionRow = { taskId: 't-real', date: '2026-07-11', completedAt: '2026-07-11T09:00:00.000Z' }
        await v3.checklistGroups.add(groupRow)
        await v3.checklistTasks.add(taskRow)
        await v3.checklistCompletions.add(completionRow)
        const noteGroupRow = {
            id: 'ng-real', name: 'Inbox', order: 0,
            createdAt: '2026-07-12T00:00:00.000Z', updatedAt: '2026-07-12T00:00:00.000Z', deletedAt: null,
        }
        const noteRow = {
            id: 'n-real', groupId: 'ng-real', title: 'T', body: 'B', tags: ['a'],
            pinned: false, dailyDate: null,
            createdAt: '2026-07-12T00:00:00.000Z', updatedAt: '2026-07-12T00:00:00.000Z', deletedAt: null,
        }
        await v3.noteGroups.add(noteGroupRow)
        await v3.notes.add(noteRow)
        v3.close()

        // 2. Reopen it with the v4 declaration EXACTLY as db/index.jsx has it.
        const v4 = new Dexie(NAME)
        v4.version(1).stores(V1_STORES)
        v4.version(2).stores(V2_STORES)
        v4.version(3).stores(V3_STORES)
        v4.version(4).stores(V4_STORES)
        await v4.open()

        // 3. Existing data intact, byte for byte, across every table.
        expect(v4.verno).toBe(4)
        expect(await v4.sessions.get(rowId)).toEqual({ id: rowId, ...sessionRow })
        expect(await v4.syncQueue.get(syncId)).toEqual({ id: syncId, ...syncRow })
        expect((await v4.settings.get('currentPhase')).value).toBe(2)
        expect(await v4.checklistGroups.get('g-real')).toEqual(groupRow)
        expect(await v4.checklistTasks.get('t-real')).toEqual(taskRow)
        expect(await v4.checklistCompletions.get(['t-real', '2026-07-11'])).toEqual(completionRow)
        expect(await v4.noteGroups.get('ng-real')).toEqual(noteGroupRow)
        expect(await v4.notes.get('n-real')).toEqual(noteRow)

        // 4. New table exists and is empty.
        expect(await v4.workoutDrafts.count()).toBe(0)

        v4.close()
        await Dexie.delete(NAME)
    })
})

// ─── Direct row access ───────────────────────────────────────────────────────

describe('loadActiveDraft', () => {
    it('returns undefined when no row exists, and null when no ownerUserId given', async () => {
        expect(await loadActiveDraft(OWNER_A)).toBeUndefined()
        expect(await loadActiveDraft(null)).toBeNull()
    })

    it('returns the owner-scoped row and never another owner\'s', async () => {
        const row = buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            definitionSnapshot: buildLegacyDefinitionSnapshot({}),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'hi' } },
        })
        await db.workoutDrafts.put(row)
        expect(await loadActiveDraft(OWNER_A)).toEqual(row)
        expect(await loadActiveDraft(OWNER_B)).toBeUndefined()
    })
})

// ─── Controller ───────────────────────────────────────────────────────────────

function makeRow(ownerUserId, notes) {
    return buildDraftRow({
        ownerUserId,
        workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
        definitionSnapshot: buildLegacyDefinitionSnapshot({}),
        state: { kind: 'legacy-hud-v1', fields: { notes } },
    })
}

// fake-indexeddb's internal machinery relies on real timer/microtask
// scheduling; vi.useFakeTimers() globally replaces setTimeout and deadlocks
// against it (Dexie transactions never resolve). So debounce timing is
// tested with REAL timers against a short injected debounceMs instead of
// faking the clock — createWorkoutDraftController() accepts debounceMs
// precisely so tests don't have to wait on the real 700ms everywhere.
const TEST_DEBOUNCE_MS = 30

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

describe('createWorkoutDraftController — isolated instance', () => {
    it('debounces schedule() — no write before the interval, one write after', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        controller.schedule(makeRow(OWNER_A, 'draft in progress'))

        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()

        await wait(TEST_DEBOUNCE_MS + 50)
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('draft in progress')
    })

    it('the production singleton debounces at exactly 700ms (NoteEditor precedent)', async () => {
        const controller = createWorkoutDraftController() // default options — no debounceMs override
        controller.schedule(makeRow(OWNER_A, 'production timing'))

        await wait(650)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()

        await wait(100) // crosses 700ms total
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('production timing')
    }, 2000)

    it('saveNow() persists immediately and cancels any pending debounce', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        controller.schedule(makeRow(OWNER_A, 'stale pending'))
        await controller.saveNow(makeRow(OWNER_A, 'immediate'))

        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('immediate')

        // The earlier debounce must not still be armed and overwrite this.
        await wait(TEST_DEBOUNCE_MS + 50)
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('immediate')
    })

    it('flush() forces a pending debounce through without waiting', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        controller.schedule(makeRow(OWNER_A, 'flushed'))
        await controller.flush()
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('flushed')
    })

    it('flush() with nothing pending resolves cleanly (used by visibilitychange/unmount)', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await expect(controller.flush()).resolves.toBeUndefined()
    })

    it('reports saving then idle status via subscribe()', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        const statuses = []
        controller.subscribe(s => statuses.push(s.status))
        await controller.saveNow(makeRow(OWNER_A, 'x'))
        expect(statuses).toContain('saving')
        expect(statuses[statuses.length - 1]).toBe('idle')
    })

    it('reports a persistent error status (with the error) on a failed write — the mechanism the "Draft not saved" + Retry banner reads', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        const statuses = []
        controller.subscribe(s => statuses.push(s))

        const spy = vi.spyOn(db.workoutDrafts, 'put').mockRejectedValueOnce(new Error('quota exceeded'))
        try {
            // saveNow() itself does NOT reject on a write failure (unlike
            // discardDraft) — a background autosave failure is reported via
            // status, not thrown at the caller of an autosave effect.
            await expect(controller.saveNow(makeRow(OWNER_A, 'will fail'))).resolves.toBeUndefined()
        } finally {
            spy.mockRestore()
        }

        const last = statuses[statuses.length - 1]
        expect(last.status).toBe('error')
        expect(last.error).toBeInstanceOf(Error)
        expect(controller.getStatus().status).toBe('error')

        // In-memory values are never lost — a subsequent retry (the same
        // saveNow the UI's Retry button calls) recovers cleanly.
        await controller.saveNow(makeRow(OWNER_A, 'retried'))
        expect(controller.getStatus().status).toBe('idle')
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('retried')
    })

    it('invalidate() clears a stale error status — a successful discard/log must not leave "Draft not saved" stuck on screen', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        const spy = vi.spyOn(db.workoutDrafts, 'put').mockRejectedValueOnce(new Error('quota exceeded'))
        try {
            await controller.saveNow(makeRow(OWNER_A, 'will fail'))
        } finally {
            spy.mockRestore()
        }
        expect(controller.getStatus().status).toBe('error')

        controller.invalidate()

        expect(controller.getStatus()).toEqual({ status: 'idle', error: null })
    })

    it('invalidate() notifies subscribers when it clears a stale error (not just a silent internal reset)', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        const spy = vi.spyOn(db.workoutDrafts, 'put').mockRejectedValueOnce(new Error('boom'))
        try {
            await controller.saveNow(makeRow(OWNER_A, 'will fail'))
        } finally {
            spy.mockRestore()
        }

        const statuses = []
        controller.subscribe(s => statuses.push(s.status))
        controller.invalidate()
        expect(statuses).toEqual(['idle'])
    })

    it('invalidate() is a no-op on status when already idle (no spurious notify)', () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        const statuses = []
        controller.subscribe(s => statuses.push(s.status))
        controller.invalidate()
        expect(statuses).toEqual([])
    })

    it('a stale in-flight write cannot restore "Draft not saved" after invalidate + a successful discard (deferred put)', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })

        // Control exactly when the put settles, so invalidate() can run
        // WHILE it's still in flight — commitRow's generation check at the
        // top already passed by the time put() is called; the only thing
        // that can still save this write from resurrecting stale status is
        // a SECOND check after the await.
        let rejectPut
        let putStarted
        const startedPromise = new Promise(resolve => { putStarted = resolve })
        const spy = vi.spyOn(db.workoutDrafts, 'put').mockImplementationOnce(() => {
            putStarted()
            return new Promise((_, reject) => { rejectPut = reject })
        })

        const stalePromise = controller.saveNow(makeRow(OWNER_A, 'stale in-flight'))
        await startedPromise // commitRow has passed its pre-await generation check

        // Discard runs (and, in this test, SUCCEEDS) while that put is still
        // hanging: invalidate() bumps generation and resets status to idle;
        // the delete is queued behind the still-running commitRow task
        // (same write chain, FIFO), so it hasn't executed yet either.
        const discardPromise = controller.discardDraft(OWNER_A)

        // NOW the stale put finally settles — with a FAILURE specifically,
        // since that's the exact branch that used to unconditionally set
        // status='error' regardless of how stale the write had become.
        rejectPut(new Error('stale put finally fails'))
        spy.mockRestore()

        await stalePromise // commitRow itself never rejects, stale or not
        await discardPromise

        expect(controller.getStatus()).toEqual({ status: 'idle', error: null })
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
    })

    it('a failed discard re-persists the cancelled pending snapshot instead of losing it forever', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await controller.saveNow(makeRow(OWNER_A, 'saved baseline'))

        // A new edit is mid-debounce (never yet written) when discard fires.
        controller.schedule(makeRow(OWNER_A, 'mid-edit, about to be cancelled'))

        const spy = vi.spyOn(db.workoutDrafts, 'delete').mockRejectedValueOnce(new Error('storage boom'))
        try {
            await expect(controller.discardDraft(OWNER_A)).rejects.toThrow('storage boom')
        } finally {
            spy.mockRestore()
        }

        // The cancelled edit must not be lost — it's re-persisted under the
        // failed-discard recovery path, not silently dropped by invalidate().
        expect((await db.workoutDrafts.get([OWNER_A, 'active']))?.state.fields.notes)
            .toBe('mid-edit, about to be cancelled')
    })

    it('a failed discard with nothing pending recovers nothing extra (no phantom write)', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await controller.saveNow(makeRow(OWNER_A, 'saved baseline'))

        const spy = vi.spyOn(db.workoutDrafts, 'delete').mockRejectedValueOnce(new Error('storage boom'))
        try {
            await expect(controller.discardDraft(OWNER_A)).rejects.toThrow('storage boom')
        } finally {
            spy.mockRestore()
        }

        // Nothing was pending at the time of discard — the baseline row
        // (never actually deleted, since the delete failed) survives as-is.
        expect((await db.workoutDrafts.get([OWNER_A, 'active']))?.state.fields.notes).toBe('saved baseline')
    })

    it('surfaces an error status when BOTH the delete and the pending-snapshot recovery fail — must not look idle while data is at risk', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await controller.saveNow(makeRow(OWNER_A, 'saved baseline'))
        controller.schedule(makeRow(OWNER_A, 'mid-edit, about to be cancelled'))

        const deleteSpy = vi.spyOn(db.workoutDrafts, 'delete').mockRejectedValueOnce(new Error('storage boom'))
        const putSpy = vi.spyOn(db.workoutDrafts, 'put').mockRejectedValueOnce(new Error('recovery also fails'))
        try {
            await expect(controller.discardDraft(OWNER_A)).rejects.toThrow('storage boom')
        } finally {
            deleteSpy.mockRestore()
            putSpy.mockRestore()
        }

        // The controller must NOT look idle here — both the discard and the
        // attempt to save the user's latest edit failed, a genuine risk of
        // losing it, and that must surface exactly like a failed autosave.
        const status = controller.getStatus()
        expect(status.status).toBe('error')
        expect(status.error).toBeInstanceOf(Error)
        expect(status.error.message).toBe('recovery also fails')
    })

    it('a save scheduled before discardDraft() cannot resurrect the deleted row', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await controller.saveNow(makeRow(OWNER_A, 'will be discarded'))
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeTruthy()

        // A new edit debounces...
        controller.schedule(makeRow(OWNER_A, 'stale edit after discard'))
        // ...then discard fires before the debounce would have.
        await controller.discardDraft(OWNER_A)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()

        // Letting the stale debounce's timer elapse must NOT recreate the row.
        await wait(TEST_DEBOUNCE_MS + 50)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
    })

    it('a save scheduled before invalidate() (sign-out path) cannot resurrect after a later delete', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await controller.saveNow(makeRow(OWNER_A, 'signed in'))

        controller.schedule(makeRow(OWNER_A, 'edit racing sign-out'))
        controller.invalidate() // synchronous — mirrors signOut()'s direct call
        await db.workoutDrafts.delete([OWNER_A, 'active']) // mirrors the idempotent SIGNED_OUT re-run

        await wait(TEST_DEBOUNCE_MS + 50)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
    })

    it('discardDraft() is safe to call with nothing to delete (idempotent, e.g. double sign-out event)', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await expect(controller.discardDraft(OWNER_A)).resolves.toBeUndefined()
        await expect(controller.discardDraft(OWNER_A)).resolves.toBeUndefined()
    })

    it('discardDraft() rejects when the underlying delete fails — interactive callers must see this and preserve context', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        await controller.saveNow(makeRow(OWNER_A, 'must survive a failed discard'))

        const spy = vi.spyOn(db.workoutDrafts, 'delete').mockRejectedValueOnce(new Error('storage boom'))
        try {
            await expect(controller.discardDraft(OWNER_A)).rejects.toThrow('storage boom')
        } finally {
            spy.mockRestore()
        }

        // The row must still be there — a caller that reacted to the
        // rejection by NOT clearing continueDraft/draftIssue is correct.
        expect((await db.workoutDrafts.get([OWNER_A, 'active']))?.state.fields.notes)
            .toBe('must survive a failed discard')
    })

    it('one failed write does not wedge the chain for the next write', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        // Force a failure: a row missing required primary-key fields.
        await controller.saveNow({ broken: true }).catch(() => {})
        await controller.saveNow(makeRow(OWNER_A, 'recovered'))
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('recovered')
    })

    it('the exported production singleton (the exact object AuthProvider imports) resists the same resurrection race', async () => {
        // Distinct from the isolated-instance tests above: this exercises
        // workoutDraftController itself, so a bug specific to the shared
        // singleton (vs. a fresh factory instance) would show up here.
        // Real debounce timing (700ms) is required since the singleton
        // can't take a custom debounceMs.
        await workoutDraftController.saveNow(makeRow(OWNER_A, 'singleton signed in'))
        workoutDraftController.schedule(makeRow(OWNER_A, 'singleton edit racing sign-out'))
        await workoutDraftController.discardDraft(OWNER_A) // mirrors AuthProvider's signOut()/SIGNED_OUT call

        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
        await wait(750)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
    }, 2000)
})

// ─── Discriminated draft round-trip (plan v2 §12) ───────────────────────────

describe('draft representations round-trip raw values through Dexie', () => {
    it('legacy-hud-v1 round-trips every field untouched', async () => {
        const fields = {
            mobChecked: { 1: true, 2: false }, clrChecked: { 1: true },
            strSets: { 'ex1-s1': { kg: '80', reps: '5', papReps: '3' } },
            coreSets: { 1: { ex: 'Plank', sets: '3', reps: '30' } },
            bagRounds: '6', bagCourse: 'Varga', bagModules: 'Counters 1', bagWorkouts: '4.1',
            notes: 'felt strong', gymSessionType: 'Combat',
            altRows: [{ id: 1, name: 'Sprints', v1: '10', v2: '20', v3: '30' }],
            altDuration: '45', hudScrollY: 320,
            bagBlockOpen: true, coreBlockOpen: false, mobBlockOpen: true, strBlockOpen: true, clrBlockOpen: false,
        }
        const row = buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildLegacyIdentity({ day: 2, phase: 1, hipScore: 4 }),
            definitionSnapshot: buildLegacyDefinitionSnapshot({ dailyFocus: 'Push' }),
            state: { kind: 'legacy-hud-v1', fields },
        })
        await db.workoutDrafts.put(row)
        const loaded = await loadActiveDraft(OWNER_A)
        expect(loaded).toEqual(row)
        expect(validateDraftRow(loaded, OWNER_A)).toEqual({ ok: true, row: loaded })
    })

    it('cartridge-workout-v1 round-trips every field untouched', async () => {
        const fields = {
            itemStateById: { 'd1-str-1': { checked: true, kg: '100', reps: '5' } },
            substitutions: { 'd1-str-1': 'Front Squat' },
            itemNotes: { 'd1-str-1': 'felt heavy' },
            notes: 'good session', customSessionContent: '',
            conditioningProgress: { 'd1-bag-1': { roundsDone: 3 } },
            blockOpen: { strength: true }, scrollY: 100,
        }
        const row = buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildCartridgeIdentity({
                cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3, day: 1,
            }),
            definitionSnapshot: buildCartridgeDefinitionSnapshot({ day: 1, label: 'Day 1', blocks: [] }),
            state: { kind: 'cartridge-workout-v1', fields },
        })
        await db.workoutDrafts.put(row)
        const loaded = await loadActiveDraft(OWNER_A)
        // Dexie round-trip fidelity — the row itself is stored/read intact.
        expect(loaded).toEqual(row)
        // But NOT offered: the legacy HUD (the only renderer before A7) must
        // never hydrate a cartridge-kind draft, even a well-formed one.
        expect(validateDraftRow(loaded, OWNER_A)).toEqual({ ok: false, reason: 'unsupported-state' })
    })
})

// ─── Hydration never writes ─────────────────────────────────────────────────

describe('hydration is read-only', () => {
    it('reading and validating a stored row for Continue never mutates it', async () => {
        const row = makeRow(OWNER_A, 'untouched by hydration')
        await db.workoutDrafts.put(row)
        const before = await db.workoutDrafts.get([OWNER_A, 'active'])

        // Simulates exactly what DBProvider's hydration effect does: read,
        // then validate. Neither step is a write.
        const loaded = await loadActiveDraft(OWNER_A)
        validateDraftRow(loaded, OWNER_A)

        const after = await db.workoutDrafts.get([OWNER_A, 'active'])
        expect(after).toEqual(before)
        expect(after.updatedAt).toBe(row.updatedAt) // untouched, not re-stamped
    })
})

// ─── Atomic local logging (plan v2 §8, §12) ─────────────────────────────────
// Exercises the REAL commitLoggedSession — the exact function db/index.jsx's
// logSession calls — not a hand-copied mirror. This repo has no React-render
// test infra to exercise DBProvider.logSession directly, so importing and
// calling the production function here is what keeps this test honest; the
// full flow (including the freshest-snapshot flush before it) was
// additionally verified end-to-end in-browser.

describe('commitLoggedSession — atomic local logging transaction', () => {
    it('a successful commit writes the session, enqueues the sync envelope, and clears the draft', async () => {
        const row = makeRow(OWNER_A, 'about to be logged')
        await db.workoutDrafts.put(row)
        const sessionData = { date: '2026-07-24', day: 1, phase: 1, hipScore: 3, sessionType: 'S&C', completeness: 50 }

        const id = await commitLoggedSession({ ownerUserId: OWNER_A, sessionData, sessionId: 'uuid-log-1' })

        expect(await db.sessions.count()).toBe(1)
        const queue = await db.syncQueue.toArray()
        expect(queue).toHaveLength(1)
        expect(queue[0].payload).toEqual({ action: 'log', sessionId: 'uuid-log-1', payload: sessionData })
        expect(queue[0].sessionId).toBe(id) // permanent payload/envelope shape unchanged
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
    })

    it('a failure inside the transaction rolls back all three operations, leaving the draft intact', async () => {
        const row = makeRow(OWNER_A, 'must survive a failed log')
        await db.workoutDrafts.put(row)
        // Force a real Dexie failure (ConstraintError on a duplicate
        // explicit primary key) rather than an artificial injected-error
        // flag, so the rollback is exercised exactly as it would happen.
        await db.sessions.add({ id: 999, date: '2026-01-01', day: 1, phase: 1, hipScore: 3 })
        const sessionData = { id: 999, date: '2026-07-24', day: 1, phase: 1, hipScore: 3, sessionType: 'S&C', completeness: 50 }

        await expect(commitLoggedSession({
            ownerUserId: OWNER_A, sessionData, sessionId: 'uuid-log-2',
        })).rejects.toThrow()

        expect(await db.sessions.count()).toBe(1) // only the pre-seeded row — the failed add never landed
        expect(await db.syncQueue.count()).toBe(0)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toEqual(row) // untouched, no success
    })
})
