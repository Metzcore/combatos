/**
 * checklist.test.js — W21 checklist data layer + schema-upgrade safety.
 *
 * Same harness pattern as syncQueue.test.js: fake-indexeddb/auto, browser
 * globals via vi.stubGlobal, driving the exported CRUD functions and Dexie
 * tables directly (no React rendering).
 *
 * The upgrade-path test uses an ISOLATED Dexie database name — never the
 * shared 'FightersOS' instance other test files manipulate — so cross-test
 * pollution can't fake a pass or a fail.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './index.jsx'
import {
    DEFAULT_GROUP_NAME,
    createGroup, ensureDefaultGroup, renameGroup, moveGroup, deleteGroup,
    createTask, quickAddTask, updateTask, stopRepeating, moveTask, softDeleteTask,
    setCompletion, getGroupsWithTasks, exportChecklist,
    getResetTime, setResetTime
} from './checklist.js'

// db/index.jsx registers sync listeners at module-eval time and trySyncQueue
// consults navigator.onLine — stub it exactly like syncQueue.test.js does.
vi.stubGlobal('navigator', { onLine: true })

const TODAY = '2026-07-11'

beforeEach(async () => {
    await db.checklistGroups.clear()
    await db.checklistTasks.clear()
    await db.checklistCompletions.clear()
})

// ─── Schema / upgrade safety ──────────────────────────────────────────────────

describe('schema — checklist wiring on the real db instance', () => {
    it('is at version 2 or later with the three checklist tables present', () => {
        // Checklist tables arrived in v2; later features bump further (W23 → v3).
        // The exact current version is pinned by the newest feature's own tests.
        expect(db.verno).toBeGreaterThanOrEqual(2)
        const names = db.tables.map(t => t.name)
        expect(names).toContain('checklistGroups')
        expect(names).toContain('checklistTasks')
        expect(names).toContain('checklistCompletions')
        // The pre-existing tables are still there, untouched
        expect(names).toContain('sessions')
        expect(names).toContain('syncQueue')
        expect(names).toContain('settings')
    })
})

describe('schema — upgrade path from a DB created at version 1', () => {
    const NAME = 'FightersOS-w21-upgrade-test'

    it('preserves existing v1 data and adds empty checklist tables', async () => {
        await Dexie.delete(NAME)

        // 1. Create a database exactly as version(1) shipped it, with a
        //    real-shaped session row (months of real data on the dev phone).
        const v1 = new Dexie(NAME)
        v1.version(1).stores({
            sessions: '++id, date, day, phase, hipScore',
            syncQueue: '++id, sessionId, attempts',
            settings: 'key'
        })
        const sessionRow = {
            sessionId: 'real-session-uuid', date: '2026-07-01',
            day: 1, phase: 2, hipScore: 4, sessionType: 'S&C', completeness: 90
        }
        const rowId = await v1.sessions.add(sessionRow)
        await v1.settings.put({ key: 'currentPhase', value: 2 })
        v1.close()

        // 2. Reopen it with the v2 declaration EXACTLY as db/index.jsx has it.
        const v2 = new Dexie(NAME)
        v2.version(1).stores({
            sessions: '++id, date, day, phase, hipScore',
            syncQueue: '++id, sessionId, attempts',
            settings: 'key'
        })
        v2.version(2).stores({
            sessions: '++id, date, day, phase, hipScore',
            syncQueue: '++id, sessionId, attempts',
            settings: 'key',
            checklistGroups: 'id, order',
            checklistTasks: 'id, groupId, [groupId+order], deletedAt',
            checklistCompletions: '[taskId+date], taskId'
        })
        await v2.open()

        // 3. Existing data intact, byte for byte.
        expect(v2.verno).toBe(2)
        const survived = await v2.sessions.get(rowId)
        expect(survived).toEqual({ id: rowId, ...sessionRow })
        const phase = await v2.settings.get('currentPhase')
        expect(phase.value).toBe(2)

        // 4. New tables exist and are empty.
        expect(await v2.checklistGroups.count()).toBe(0)
        expect(await v2.checklistTasks.count()).toBe(0)
        expect(await v2.checklistCompletions.count()).toBe(0)

        v2.close()
        await Dexie.delete(NAME)
    })
})

// ─── Groups ───────────────────────────────────────────────────────────────────

describe('groups — CRUD, reorder, cascade soft-delete', () => {
    it('creates groups with string ids, timestamps, and sequential order', async () => {
        const a = await createGroup('Alpha')
        const b = await createGroup('Bravo')
        expect(typeof a.id).toBe('string')
        expect(a.createdAt).toBeTruthy()
        expect(a.updatedAt).toBeTruthy()
        expect(a.order).toBe(0)
        expect(b.order).toBe(1)
    })

    it('ensureDefaultGroup creates General exactly once', async () => {
        const g1 = await ensureDefaultGroup()
        const g2 = await ensureDefaultGroup()
        expect(g1.name).toBe(DEFAULT_GROUP_NAME)
        expect(g2.id).toBe(g1.id)
        expect(await db.checklistGroups.count()).toBe(1)
    })

    it('renames a group', async () => {
        const g = await createGroup('Old')
        await renameGroup(g.id, 'New')
        const row = await db.checklistGroups.get(g.id)
        expect(row.name).toBe('New')
    })

    it('moveGroup swaps neighbors and no-ops at the ends', async () => {
        const a = await createGroup('A')
        const b = await createGroup('B')

        await moveGroup(b.id, -1) // B up
        let view = await getGroupsWithTasks(TODAY)
        expect(view.map(g => g.name)).toEqual(['B', 'A'])

        await moveGroup(b.id, -1) // B already first — no-op
        view = await getGroupsWithTasks(TODAY)
        expect(view.map(g => g.name)).toEqual(['B', 'A'])

        await moveGroup(a.id, 1) // A already last — no-op
        view = await getGroupsWithTasks(TODAY)
        expect(view.map(g => g.name)).toEqual(['B', 'A'])
    })

    it('deleteGroup cascade-SOFT-deletes its tasks; nothing is destroyed', async () => {
        const g = await createGroup('Doomed')
        const t = await createTask({ title: 'Task in doomed group', groupId: g.id })
        await setCompletion(t.id, TODAY, true)

        await deleteGroup(g.id)

        // Gone from the view…
        const view = await getGroupsWithTasks(TODAY)
        expect(view.find(x => x.id === g.id)).toBeUndefined()

        // …but every row still exists, tombstoned.
        const groupRow = await db.checklistGroups.get(g.id)
        const taskRow = await db.checklistTasks.get(t.id)
        expect(groupRow.deletedAt).toBeTruthy()
        expect(taskRow.deletedAt).toBeTruthy()
        expect(await db.checklistCompletions.count()).toBe(1) // history kept
    })
})

// ─── Tasks ────────────────────────────────────────────────────────────────────

describe('tasks — quick-add, edit, move, soft-delete', () => {
    it('quickAddTask lands in the default General group, auto-creating it', async () => {
        const t = await quickAddTask('Hydrate 💧')
        const view = await getGroupsWithTasks(TODAY)
        expect(view).toHaveLength(1)
        expect(view[0].name).toBe(DEFAULT_GROUP_NAME)
        expect(view[0].tasks.map(x => x.id)).toEqual([t.id])
        expect(typeof t.id).toBe('string')
    })

    it('two quick-adds reuse ONE General group', async () => {
        await quickAddTask('One')
        await quickAddTask('Two')
        const view = await getGroupsWithTasks(TODAY)
        expect(view).toHaveLength(1)
        expect(view[0].tasks).toHaveLength(2)
    })

    it('updateTask updates fields and bumps updatedAt', async () => {
        const t = await createTask({ title: 'Before', repeatDaily: true })
        await updateTask(t.id, { title: 'After', note: 'a note', scheduledTime: '06:30' })
        const row = await db.checklistTasks.get(t.id)
        expect(row.title).toBe('After')
        expect(row.note).toBe('a note')
        expect(row.scheduledTime).toBe('06:30')
        expect(row.repeatDaily).toBe(true) // untouched field survives
    })

    it('stopRepeating flips repeatDaily off', async () => {
        const t = await createTask({ title: 'Daily thing', repeatDaily: true })
        await stopRepeating(t.id)
        const row = await db.checklistTasks.get(t.id)
        expect(row.repeatDaily).toBe(false)
    })

    it('moveTask reparents to the new group', async () => {
        const a = await createGroup('A')
        const b = await createGroup('B')
        const t = await createTask({ title: 'Mover', groupId: a.id })

        await moveTask(t.id, b.id)

        const view = await getGroupsWithTasks(TODAY)
        expect(view.find(g => g.id === a.id).tasks).toHaveLength(0)
        expect(view.find(g => g.id === b.id).tasks.map(x => x.id)).toEqual([t.id])
    })

    it('softDeleteTask hides the task but keeps the row and its completions', async () => {
        const t = await quickAddTask('Ephemeral')
        await setCompletion(t.id, TODAY, true)
        await softDeleteTask(t.id)

        const view = await getGroupsWithTasks(TODAY)
        expect(view[0].tasks).toHaveLength(0)
        expect((await db.checklistTasks.get(t.id)).deletedAt).toBeTruthy()
        expect(await db.checklistCompletions.count()).toBe(1)
    })
})

// ─── Completions & streaks ────────────────────────────────────────────────────

describe('completions — idempotence and view annotation', () => {
    it('setting done twice produces exactly ONE row; off is idempotent too', async () => {
        const t = await createTask({ title: 'Habit', repeatDaily: true })

        await setCompletion(t.id, TODAY, true)
        await setCompletion(t.id, TODAY, true) // recheck — must not duplicate
        expect(await db.checklistCompletions.count()).toBe(1)

        await setCompletion(t.id, TODAY, false)
        await setCompletion(t.id, TODAY, false) // double-uncheck — no-op
        expect(await db.checklistCompletions.count()).toBe(0)

        await setCompletion(t.id, TODAY, true)
        expect(await db.checklistCompletions.count()).toBe(1)
    })

    it('annotates doneToday and a completions-derived streak', async () => {
        const t = await createTask({ title: 'Habit', repeatDaily: true })
        await setCompletion(t.id, '2026-07-09', true)
        await setCompletion(t.id, '2026-07-10', true)
        await setCompletion(t.id, TODAY, true)

        const [group] = await getGroupsWithTasks(TODAY)
        const task = group.tasks[0]
        expect(task.doneToday).toBe(true)
        expect(task.streak).toBe(3)
    })

    it('today-incomplete keeps yesterday-anchored streak; a recurring task resets next day', async () => {
        const t = await createTask({ title: 'Habit', repeatDaily: true })
        await setCompletion(t.id, '2026-07-10', true) // "yesterday"

        const [group] = await getGroupsWithTasks(TODAY)
        const task = group.tasks[0]
        expect(task.doneToday).toBe(false) // reset for the new day
        expect(task.streak).toBe(1)        // but the streak is not zeroed
    })

    it('a completed ONE-OFF task leaves the view but stays in data', async () => {
        const t = await createTask({ title: 'One shot', repeatDaily: false })
        await setCompletion(t.id, TODAY, true)

        const [group] = await getGroupsWithTasks(TODAY)
        expect(group.tasks).toHaveLength(0)
        expect(await db.checklistTasks.get(t.id)).toBeTruthy()
        expect((await db.checklistTasks.get(t.id)).deletedAt).toBeNull()
    })

    it('completions from another task never affect a task\'s streak', async () => {
        const a = await createTask({ title: 'A', repeatDaily: true })
        const b = await createTask({ title: 'B', repeatDaily: true })
        await setCompletion(a.id, '2026-07-10', true)
        await setCompletion(a.id, TODAY, true)
        await setCompletion(b.id, TODAY, true)

        const [group] = await getGroupsWithTasks(TODAY)
        const streaks = Object.fromEntries(group.tasks.map(t => [t.title, t.streak]))
        expect(streaks).toEqual({ A: 2, B: 1 })
    })
})

// ─── Export (D4 connector contract) ───────────────────────────────────────────

describe('exportChecklist — plain-JSON shape stability', () => {
    it('returns the documented shape with exact key sets', async () => {
        const g = await createGroup('Health')
        const t = await createTask({
            title: 'Hydrate 💧', note: 'big bottle', scheduledTime: '07:00',
            repeatDaily: true, groupId: g.id
        })
        await setCompletion(t.id, TODAY, true)
        await softDeleteTask(t.id) // tombstones must be included, with deletedAt

        const out = await exportChecklist()

        expect(out.version).toBe(1)
        expect(typeof out.exportedAt).toBe('string')

        expect(Object.keys(out.groups[0]).sort()).toEqual(
            ['createdAt', 'deletedAt', 'id', 'name', 'order', 'updatedAt']
        )
        expect(out.groups[0].deletedAt).toBeNull()

        expect(Object.keys(out.tasks[0]).sort()).toEqual(
            ['createdAt', 'deletedAt', 'groupId', 'id', 'note', 'order',
                'repeatDaily', 'scheduledTime', 'title', 'updatedAt'].sort()
        )
        expect(out.tasks[0].deletedAt).toBeTruthy() // tombstone included
        expect(out.tasks[0].groupId).toBe(g.id)     // stable string FK

        expect(Object.keys(out.completions[0]).sort()).toEqual(
            ['completedAt', 'date', 'taskId']
        )
        expect(out.completions[0]).toMatchObject({ taskId: t.id, date: TODAY })

        // Round-trips through JSON without loss (plain data only)
        expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    })
})

// ─── Reset-time setting (W22) ─────────────────────────────────────────────────

describe('reset-time setting — key-value store, no schema involvement', () => {
    beforeEach(async () => {
        // Scoped cleanup: the file-level beforeEach only clears the three
        // checklist tables; this key lives in `settings`.
        await db.settings.delete('checklistResetTime')
    })

    it('defaults to 00:00 (midnight — W21 behavior) when unset', async () => {
        expect(await getResetTime()).toBe('00:00')
    })

    it('round-trips through setResetTime', async () => {
        await setResetTime('04:30')
        expect(await getResetTime()).toBe('04:30')
        await setResetTime('23:15') // overwrite, no duplicate rows
        expect(await getResetTime()).toBe('23:15')
        expect(await db.settings.where('key').equals('checklistResetTime').count()).toBe(1)
    })

    it('degrades corrupt stored values to the default instead of propagating them', async () => {
        await db.settings.put({ key: 'checklistResetTime', value: '' })
        expect(await getResetTime()).toBe('00:00')
        await db.settings.put({ key: 'checklistResetTime', value: 123 })
        expect(await getResetTime()).toBe('00:00')
    })

    it('never touches the three checklist tables (no schema involvement)', async () => {
        const vernoBefore = db.verno
        await setResetTime('06:00')
        await getResetTime()
        expect(db.verno).toBe(vernoBefore)
        expect(await db.checklistGroups.count()).toBe(0)
        expect(await db.checklistTasks.count()).toBe(0)
        expect(await db.checklistCompletions.count()).toBe(0)
    })
})
