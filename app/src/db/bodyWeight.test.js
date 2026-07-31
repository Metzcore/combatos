/**
 * bodyWeight.test.js — W30 store + the v4→v5 upgrade (the big one).
 *
 * The upgrade suite is the most important thing in this PR. Dexie treats every
 * version declaration as the COMPLETE schema, so omitting or mistyping any
 * prior store in the v5 block is read as a request to DELETE it — on real
 * installed data, on a device that is mid-programme. The new table is the easy
 * part; not destroying the other nine is the risk.
 *
 * Modelled on workoutDrafts.test.js's v3→v4 suite: seed EVERY prior store,
 * reopen at the new version, assert every old row survives byte-for-byte and
 * only the new table is empty.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './index.jsx'
import {
    saveWeight, listWeights, latestWeightRow, deleteWeight,
    pendingWeights, markSynced, markSyncError,
    SYNC_PENDING, SYNC_SYNCED,
} from './bodyWeight.js'

vi.stubGlobal('navigator', { onLine: true })

const OWNER_A = '11111111-1111-4111-8111-111111111111'
const OWNER_B = '22222222-2222-4222-8222-222222222222'

beforeEach(async () => {
    for (const table of db.tables) await table.clear()
})

describe('schema — version 5 wiring on the real db instance', () => {
    it('is at version 5 or later with bodyWeight present and every prior table intact', () => {
        // Minimum, never an exact pin — a later feature bumps further, which
        // is exactly how A6.5 broke the old toBe(3) assertions elsewhere.
        expect(db.verno).toBeGreaterThanOrEqual(5)
        const names = db.tables.map(t => t.name)
        for (const t of ['sessions', 'syncQueue', 'settings', 'checklistGroups',
            'checklistTasks', 'checklistCompletions', 'noteGroups', 'notes',
            'workoutDrafts', 'bodyWeight']) {
            expect(names).toContain(t)
        }
    })

    it('keys bodyWeight by [ownerUserId+date], not date alone', () => {
        // A date-only key would assert the device has exactly one owner. It
        // does not — this is the protection that stops one identity's pending
        // row uploading under another.
        const table = db.tables.find(t => t.name === 'bodyWeight')
        expect(table.schema.primKey.keyPath).toEqual(['ownerUserId', 'date'])
    })
})

describe('schema — upgrade path from a DB created at version 4', () => {
    const NAME = 'FightersOS-w30-upgrade-test'

    const V4_STORES = {
        sessions: '++id, date, day, phase, hipScore',
        syncQueue: '++id, sessionId, attempts',
        settings: 'key',
        checklistGroups: 'id, order',
        checklistTasks: 'id, groupId, [groupId+order], deletedAt',
        checklistCompletions: '[taskId+date], taskId',
        noteGroups: 'id, order',
        notes: 'id, groupId, deletedAt, *tags',
        workoutDrafts: '[ownerUserId+slot], ownerUserId, updatedAt',
    }
    const V5_STORES = {
        ...V4_STORES,
        bodyWeight: '[ownerUserId+date], ownerUserId, date, syncState, updatedAt',
    }

    it('preserves EVERY seeded v4 row byte for byte, and starts bodyWeight empty', async () => {
        await Dexie.delete(NAME)

        // ── seed a populated v4 database, every store non-empty ──
        const v4 = new Dexie(NAME)
        v4.version(4).stores(V4_STORES)
        await v4.open()

        const seed = {
            session: { date: '2026-07-01', day: 1, phase: 2, hipScore: 4, sessionType: 'S&C', completeness: 90 },
            queue: { sessionId: 'q-1', attempts: 2, payload: { action: 'log', sessionId: 'q-1' } },
            setting: { key: 'currentPhase', value: 3 },
            group: { id: 'g1', name: 'Health', order: 0, createdAt: 'x', updatedAt: 'y', deletedAt: null },
            task: { id: 't1', groupId: 'g1', order: 0, title: 'Water', deletedAt: null },
            completion: { taskId: 't1', date: '2026-07-01', count: 3 },
            noteGroup: { id: 'ng1', name: 'Ideas', order: 0 },
            note: { id: 'n1', groupId: 'ng1', title: 'T', body: 'B', tags: ['a', 'b'], deletedAt: null },
            draft: { ownerUserId: OWNER_A, slot: 'active', updatedAt: '2026-07-01T10:00:00.000Z', state: { k: 'v' } },
        }
        const sessionId = await v4.sessions.add(seed.session)
        const queueId = await v4.syncQueue.add(seed.queue)
        await v4.settings.put(seed.setting)
        await v4.checklistGroups.add(seed.group)
        await v4.checklistTasks.add(seed.task)
        await v4.checklistCompletions.add(seed.completion)
        await v4.noteGroups.add(seed.noteGroup)
        await v4.notes.add(seed.note)
        await v4.workoutDrafts.put(seed.draft)
        await v4.close()

        // ── reopen at v5 (the real migration) ──
        const v5 = new Dexie(NAME)
        v5.version(4).stores(V4_STORES)
        v5.version(5).stores(V5_STORES)
        await v5.open()

        expect(v5.verno).toBe(5)

        // Every prior store still exists...
        const names = v5.tables.map(t => t.name).sort()
        expect(names).toEqual(Object.keys(V5_STORES).sort())

        // ...and every row survived, byte for byte.
        expect(await v5.sessions.toArray()).toEqual([{ id: sessionId, ...seed.session }])
        expect(await v5.syncQueue.toArray()).toEqual([{ id: queueId, ...seed.queue }])
        expect(await v5.settings.get('currentPhase')).toEqual(seed.setting)
        expect(await v5.checklistGroups.toArray()).toEqual([seed.group])
        expect(await v5.checklistTasks.toArray()).toEqual([seed.task])
        expect(await v5.checklistCompletions.toArray()).toEqual([seed.completion])
        expect(await v5.noteGroups.toArray()).toEqual([seed.noteGroup])
        expect(await v5.notes.toArray()).toEqual([seed.note])
        expect(await v5.workoutDrafts.toArray()).toEqual([seed.draft])

        // Only the NEW table is empty.
        expect(await v5.bodyWeight.toArray()).toEqual([])

        // The compound key survives the upgrade too — a draft is still
        // reachable by [owner, slot], not just by scan.
        expect(await v5.workoutDrafts.get([OWNER_A, 'active'])).toEqual(seed.draft)

        await v5.close()
        await Dexie.delete(NAME)
    })

    it('the v5 declaration lists exactly the v4 stores plus one', () => {
        // Guards the specific mistake: editing the v5 block later and dropping
        // a line. Dexie would read that as "delete this store".
        const added = Object.keys(V5_STORES).filter(k => !(k in V4_STORES))
        const removed = Object.keys(V4_STORES).filter(k => !(k in V5_STORES))
        expect(added).toEqual(['bodyWeight'])
        expect(removed).toEqual([])
        for (const [name, spec] of Object.entries(V4_STORES)) {
            expect(V5_STORES[name]).toBe(spec)   // unchanged, character for character
        }
    })
})

describe('saveWeight', () => {
    it('stores a valid measurement as pending', async () => {
        const row = await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        expect(row).toMatchObject({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6, syncState: SYNC_PENDING })
        expect(await db.bodyWeight.get([OWNER_A, '2026-07-30'])).toEqual(row)
    })

    it('is idempotent per owner/day — a same-day re-log REPLACES, never duplicates', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.9 })
        const rows = await db.bodyWeight.where('ownerUserId').equals(OWNER_A).toArray()
        expect(rows).toHaveLength(1)
        expect(rows[0].kg).toBe(81.9)
    })

    it('keeps createdAt and clientId stable across a correction, but moves updatedAt', async () => {
        const first = await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6, now: () => 'T1' })
        const second = await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.9, now: () => 'T2' })
        expect(second.createdAt).toBe('T1')          // "first recorded" stays truthful
        expect(second.updatedAt).toBe('T2')
        expect(second.clientId).toBe(first.clientId) // same logical measurement
    })

    it('puts a CORRECTION back in the pending queue', async () => {
        // If a corrected row stayed 'synced' it would never be re-sent — the
        // coach would keep reading the old number while the athlete sees the new.
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await markSynced(OWNER_A, '2026-07-30')
        expect((await db.bodyWeight.get([OWNER_A, '2026-07-30'])).syncState).toBe(SYNC_SYNCED)

        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 82.4 })
        expect((await db.bodyWeight.get([OWNER_A, '2026-07-30'])).syncState).toBe(SYNC_PENDING)
    })

    it('keeps different owners on the same date completely separate', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await saveWeight({ ownerUserId: OWNER_B, date: '2026-07-30', kg: 64.2 })
        expect((await listWeights(OWNER_A)).map(r => r.kg)).toEqual([81.6])
        expect((await listWeights(OWNER_B)).map(r => r.kg)).toEqual([64.2])
    })

    it('rejects invalid input instead of storing garbage', async () => {
        await expect(saveWeight({ ownerUserId: null, date: '2026-07-30', kg: 81 })).rejects.toThrow(TypeError)
        await expect(saveWeight({ ownerUserId: OWNER_A, date: 'nope', kg: 81 })).rejects.toThrow(TypeError)
        await expect(saveWeight({ ownerUserId: OWNER_A, date: '2026-02-30', kg: 81 })).rejects.toThrow(TypeError)
        await expect(saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 0 })).rejects.toThrow(TypeError)
        await expect(saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: NaN })).rejects.toThrow(TypeError)
        expect(await db.bodyWeight.count()).toBe(0)
    })
})

describe('reads are owner-scoped', () => {
    beforeEach(async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-28', kg: 81.0 })
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await saveWeight({ ownerUserId: OWNER_B, date: '2026-07-29', kg: 64.2 })
    })

    it('listWeights returns only this owner, newest first', async () => {
        expect((await listWeights(OWNER_A)).map(r => r.date)).toEqual(['2026-07-30', '2026-07-28'])
    })

    it('latestWeightRow never crosses owners', async () => {
        expect((await latestWeightRow(OWNER_A)).kg).toBe(81.6)
        expect((await latestWeightRow(OWNER_B)).kg).toBe(64.2)
    })

    it('returns empty for an unknown or missing owner rather than everything', async () => {
        expect(await listWeights('nobody')).toEqual([])
        expect(await listWeights(null)).toEqual([])
        expect(await latestWeightRow(null)).toBeNull()
    })
})

describe('sync bookkeeping', () => {
    it('lists pending rows oldest first, scoped to the owner', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-28', kg: 81.0 })
        await saveWeight({ ownerUserId: OWNER_B, date: '2026-07-29', kg: 64.2 })
        expect((await pendingWeights(OWNER_A)).map(r => r.date)).toEqual(['2026-07-28', '2026-07-30'])
    })

    it('markSynced removes a row from the pending set', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        expect(await markSynced(OWNER_A, '2026-07-30')).toBe(true)
        expect(await pendingWeights(OWNER_A)).toEqual([])
    })

    it('markSynced REFUSES when the row changed mid-flight', async () => {
        // Otherwise a correction made while the request was in flight would be
        // marked synced without ever having been sent — silent data loss for
        // the coach, who keeps seeing the stale value.
        const row = await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6, now: () => 'T1' })
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 82.9, now: () => 'T2' })

        expect(await markSynced(OWNER_A, '2026-07-30', { expectUpdatedAt: row.updatedAt })).toBe(false)
        expect((await db.bodyWeight.get([OWNER_A, '2026-07-30'])).syncState).toBe(SYNC_PENDING)
    })

    it('markSyncError keeps the row pending and records a code', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await markSyncError(OWNER_A, '2026-07-30', 'network')
        const row = await db.bodyWeight.get([OWNER_A, '2026-07-30'])
        expect(row.syncState).toBe(SYNC_PENDING)   // still retryable
        expect(row.syncError).toBe('network')
    })

    it('mark* on a vanished row is a no-op, not a crash', async () => {
        expect(await markSynced(OWNER_A, '2026-07-30')).toBe(false)
        expect(await markSyncError(OWNER_A, '2026-07-30', 'x')).toBe(false)
    })
})

describe('deleteWeight', () => {
    it('removes only the addressed owner/day', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        await saveWeight({ ownerUserId: OWNER_B, date: '2026-07-30', kg: 64.2 })

        expect(await deleteWeight(OWNER_A, '2026-07-30')).toBe(true)

        expect(await listWeights(OWNER_A)).toEqual([])
        expect((await listWeights(OWNER_B))).toHaveLength(1)   // B untouched
    })

    it('rejects malformed input without touching anything', async () => {
        await saveWeight({ ownerUserId: OWNER_A, date: '2026-07-30', kg: 81.6 })
        expect(await deleteWeight(null, '2026-07-30')).toBe(false)
        expect(await deleteWeight(OWNER_A, 'nope')).toBe(false)
        expect(await db.bodyWeight.count()).toBe(1)
    })
})
