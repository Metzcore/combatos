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
import { createWorkoutDraftController, loadActiveDraft } from './workoutDrafts.js'
import { buildDraftRow, buildLegacyIdentity, buildLegacyDefinitionSnapshot } from '../utils/workoutDraftState.js'

vi.stubGlobal('navigator', { onLine: true })

const OWNER_A = '11111111-1111-4111-8111-111111111111'
const OWNER_B = '22222222-2222-4222-8222-222222222222'

beforeEach(async () => {
    await db.workoutDrafts.clear()
})

// ─── Schema / upgrade safety ────────────────────────────────────────────────

describe('schema — version 4 wiring on the real db instance', () => {
    it('is at version 4 with workoutDrafts present and every prior table intact', () => {
        // A6.5 is the newest feature — it owns the exact version pin.
        expect(db.verno).toBe(4)
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

    it('one failed write does not wedge the chain for the next write', async () => {
        const controller = createWorkoutDraftController({ debounceMs: TEST_DEBOUNCE_MS })
        // Force a failure: a row missing required primary-key fields.
        await controller.saveNow({ broken: true }).catch(() => {})
        await controller.saveNow(makeRow(OWNER_A, 'recovered'))
        expect((await db.workoutDrafts.get([OWNER_A, 'active'])).state.fields.notes).toBe('recovered')
    })
})
