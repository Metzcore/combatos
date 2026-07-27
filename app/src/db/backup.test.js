/**
 * backup.test.js — W23.5 full-backup shape pinning.
 *
 * Same harness pattern as checklist.test.js: fake-indexeddb/auto, navigator
 * stub (db/index.jsx registers sync listeners at module-eval time), driving
 * the exported function and Dexie tables directly (no React).
 *
 * The table-set assertion is derived FROM `db.tables` at test time — not a
 * hardcoded list — so it keeps proving "every table is included" even after
 * future schema versions add stores (e.g. W23 notes).
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './index.jsx'
import { exportFullBackup, BACKUP_FORMAT } from './backup.js'
import { buildDraftRow, buildLegacyIdentity, buildLegacyDefinitionSnapshot } from '../utils/workoutDraftState.js'

vi.stubGlobal('navigator', { onLine: true })

beforeEach(async () => {
    for (const table of db.tables) {
        await table.clear()
    }
})

describe('exportFullBackup — combatos-full-backup shape stability', () => {
    it('pins the exact top-level envelope', async () => {
        const out = await exportFullBackup()

        expect(Object.keys(out).sort()).toEqual(
            ['exportedAt', 'format', 'schemaVersion', 'tables', 'version']
        )
        expect(out.format).toBe(BACKUP_FORMAT)
        expect(out.format).toBe('combatos-full-backup')
        expect(out.version).toBe(1)
        expect(typeof out.exportedAt).toBe('string')
        expect(new Date(out.exportedAt).toString()).not.toBe('Invalid Date')
        expect(out.schemaVersion).toBe(db.verno)
    })

    it('enumerates EVERY Dexie table dynamically — empty ones included', async () => {
        const out = await exportFullBackup()

        // Derived from db.tables, NOT hardcoded: this assertion follows the
        // schema automatically when future versions add stores.
        expect(Object.keys(out.tables).sort()).toEqual(
            db.tables.map(t => t.name).sort()
        )
        for (const table of db.tables) {
            expect(Array.isArray(out.tables[table.name])).toBe(true)
            expect(out.tables[table.name]).toEqual([]) // seeded nothing
        }
        // Sanity: the current schema's known tables are in there.
        expect(Object.keys(out.tables)).toEqual(
            expect.arrayContaining(['sessions', 'syncQueue', 'settings',
                'checklistGroups', 'checklistTasks', 'checklistCompletions', 'workoutDrafts'])
        )
    })

    it('A6.5 — a seeded workoutDrafts row appears in the backup dynamically, no code change needed', async () => {
        const row = buildDraftRow({
            ownerUserId: '11111111-1111-4111-8111-111111111111',
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            definitionSnapshot: buildLegacyDefinitionSnapshot({}),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'backup me' } },
        })
        await db.workoutDrafts.put(row)

        const out = await exportFullBackup()

        expect(out.tables.workoutDrafts).toEqual([row])
    })

    it('round-trips seeded rows across stores, byte for byte', async () => {
        const session = {
            sessionId: 'uuid-1', date: '2026-07-01',
            day: 1, phase: 2, hipScore: 4, sessionType: 'S&C', completeness: 90
        }
        const rowId = await db.sessions.add(session)
        await db.settings.put({ key: 'currentPhase', value: 2 })
        await db.checklistGroups.add({
            id: 'g1', name: 'Health', order: 0,
            createdAt: '2026-07-10T08:00:00.000Z',
            updatedAt: '2026-07-10T08:00:00.000Z',
            deletedAt: null
        })

        const out = await exportFullBackup()

        expect(out.tables.sessions).toEqual([{ id: rowId, ...session }])
        expect(out.tables.settings).toEqual([{ key: 'currentPhase', value: 2 }])
        expect(out.tables.checklistGroups).toHaveLength(1)
        expect(out.tables.checklistGroups[0].id).toBe('g1')
        expect(out.tables.syncQueue).toEqual([]) // untouched stores stay empty arrays

        // Plain data only — survives JSON without loss (the file IS JSON).
        expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    })

    // A7a — mixed legacy/v1/v2 session-shape regression (no code change:
    // exportFullBackup dumps db.tables dynamically and was already
    // payload-shape-agnostic; this proves it explicitly with real fixtures).
    it('includes legacy, payloadVersion:1, and payloadVersion:2 session rows side by side, byte for byte', async () => {
        const legacyRow = { date: '2026-07-01', day: 1, phase: 1, hipScore: 3, sessionType: 'S&C', completeness: 80 }
        const v1Row = {
            payloadVersion: 1, sessionKind: 'cartridge', sessionId: 'v1-real', date: '2026-06-01',
            completedAt: '2026-06-01T10:00:00.000Z', sessionCategory: 'strength-conditioning',
            cartridgeId: 'apex-protocol-phase1', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: 'phase1',
            completeness: 90, blocks: [],
        }
        const v2Row = {
            payloadVersion: 2, sessionKind: 'cartridge', sessionId: 'v2-real', date: '2026-08-01',
            completedAt: '2026-08-01T10:00:00.000Z', sessionCategory: 'combat',
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2', dayType: 'custom', phaseId: null,
            blocks: [], sessionActivities: ['bag-workout'],
        }
        const legacyId = await db.sessions.add(legacyRow)
        const v1Id = await db.sessions.add(v1Row)
        const v2Id = await db.sessions.add(v2Row)

        const out = await exportFullBackup()

        expect(out.tables.sessions).toEqual(expect.arrayContaining([
            { id: legacyId, ...legacyRow },
            { id: v1Id, ...v1Row },
            { id: v2Id, ...v2Row },
        ]))
        expect(out.tables.sessions).toHaveLength(3)
        // Plain data only — survives JSON without loss, including the mixed shapes.
        expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    })

    it('is read-only — exporting mutates nothing', async () => {
        await db.sessions.add({ date: '2026-07-01', day: 1, phase: 1, hipScore: 3 })
        const vernoBefore = db.verno
        await exportFullBackup()
        await exportFullBackup() // twice, for good measure
        expect(await db.sessions.count()).toBe(1)
        expect(db.verno).toBe(vernoBefore)
    })
})
