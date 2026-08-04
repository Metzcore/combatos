/**
 * restore.test.js — device-migration restore (sibling of backup.test.js).
 *
 * Same harness pattern: fake-indexeddb/auto, navigator stub, driving Dexie
 * tables directly. Uses a real db.transaction, so these run against the real
 * `db` instance from db/index.jsx rather than a mock.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './index.jsx'
import { exportFullBackup, BACKUP_FORMAT } from './backup.js'
import { restoreFullBackup, RestoreError } from './restore.js'

vi.stubGlobal('navigator', { onLine: true })

beforeEach(async () => {
    for (const table of db.tables) {
        await table.clear()
    }
})

function backupDoc(overrides = {}) {
    return {
        format: BACKUP_FORMAT,
        version: 2,
        exportedAt: '2026-08-04T09:49:22.256Z',
        schemaVersion: db.verno,
        tables: {},
        redactedSettings: [],
        ...overrides,
    }
}

describe('restoreFullBackup', () => {
    it('requires a targetDb', async () => {
        await expect(restoreFullBackup(backupDoc())).rejects.toThrow(TypeError)
    })

    it('rejects a non-object payload', async () => {
        await expect(restoreFullBackup(null, { targetDb: db })).rejects.toThrow(RestoreError)
    })

    it('rejects the wrong format', async () => {
        await expect(
            restoreFullBackup(backupDoc({ format: 'something-else' }), { targetDb: db })
        ).rejects.toThrow(/Not a CombatOS backup file/)
    })

    it('refuses a schemaVersion mismatch rather than guessing at a migration', async () => {
        await expect(
            restoreFullBackup(backupDoc({ schemaVersion: db.verno - 1 }), { targetDb: db })
        ).rejects.toThrow(/schema version/)
    })

    it('rejects a payload with no tables object', async () => {
        await expect(
            restoreFullBackup(backupDoc({ tables: null }), { targetDb: db })
        ).rejects.toThrow(/no table data/)
    })

    it('restores rows into matching tables and reports counts', async () => {
        const doc = backupDoc({
            tables: {
                sessions: [{ id: 1, date: '2026-07-01', day: 1, phase: 1, hipScore: 3 }],
                checklistGroups: [
                    { id: 'g1', name: 'Health', order: 0, createdAt: 't', updatedAt: 't', deletedAt: null },
                ],
                syncQueue: [],
            },
        })

        const result = await restoreFullBackup(doc, { targetDb: db })

        expect(result.restored).toEqual({ sessions: 1, checklistGroups: 1 })
        expect(result.skipped).toEqual([])
        expect(await db.sessions.count()).toBe(1)
        expect(await db.checklistGroups.count()).toBe(1)
        expect(await db.syncQueue.count()).toBe(0) // empty array in the backup: no-op, not an error
    })

    it('skips unknown table names instead of throwing', async () => {
        const doc = backupDoc({
            tables: { sessions: [{ id: 1, date: '2026-07-01', day: 1, phase: 1, hipScore: 3 }], notATable: [{ x: 1 }] },
        })

        const result = await restoreFullBackup(doc, { targetDb: db })

        expect(result.restored).toEqual({ sessions: 1 })
        expect(result.skipped).toEqual(['notATable'])
    })

    it('leaves tables absent from the backup untouched', async () => {
        await db.settings.put({ key: 'currentPhase', value: 2 })
        const doc = backupDoc({ tables: { sessions: [{ id: 1, date: '2026-07-01', day: 1, phase: 1, hipScore: 3 }] } })

        await restoreFullBackup(doc, { targetDb: db })

        expect(await db.settings.get('currentPhase')).toEqual({ key: 'currentPhase', value: 2 })
    })

    it('is upsert-by-key: restoring twice does not duplicate rows', async () => {
        const doc = backupDoc({
            tables: { checklistGroups: [{ id: 'g1', name: 'Health', order: 0, createdAt: 't', updatedAt: 't', deletedAt: null }] },
        })

        await restoreFullBackup(doc, { targetDb: db })
        await restoreFullBackup(doc, { targetDb: db })

        expect(await db.checklistGroups.count()).toBe(1)
    })

    it('overwrites a matching-key row already on the device (upsert, not merge)', async () => {
        await db.settings.put({ key: 'currentPhase', value: 99 })
        const doc = backupDoc({ tables: { settings: [{ key: 'currentPhase', value: 2 }] } })

        await restoreFullBackup(doc, { targetDb: db })

        expect(await db.settings.get('currentPhase')).toEqual({ key: 'currentPhase', value: 2 })
    })

    it('round-trips a real exportFullBackup() output back into an empty db', async () => {
        await db.sessions.add({ date: '2026-07-01', day: 1, phase: 1, hipScore: 3, sessionType: 'S&C', completeness: 90 })
        await db.checklistGroups.add({ id: 'g1', name: 'Health', order: 0, createdAt: 't', updatedAt: 't', deletedAt: null })
        const exported = await exportFullBackup()

        for (const table of db.tables) await table.clear()
        expect(await db.sessions.count()).toBe(0)

        const result = await restoreFullBackup(exported, { targetDb: db })

        expect(await db.sessions.count()).toBe(1)
        expect(await db.checklistGroups.count()).toBe(1)
        expect(result.restored.sessions).toBe(1)
    })
})
