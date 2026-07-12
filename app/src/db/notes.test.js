/**
 * notes.test.js — W23 notes data layer + schema-upgrade safety.
 *
 * Same harness pattern as checklist.test.js: fake-indexeddb/auto, browser
 * globals via vi.stubGlobal, driving the exported CRUD functions and Dexie
 * tables directly (no React rendering).
 *
 * The upgrade-path test uses an ISOLATED Dexie database name — never the
 * shared 'FightersOS' instance other test files manipulate — so cross-test
 * pollution can't fake a pass or a fail. It seeds REAL-SHAPED session AND
 * checklist rows at v2 (the developer's phone has months of both) and
 * proves they survive the v3 bump byte-for-byte.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './index.jsx'
import {
    DEFAULT_NOTE_GROUP_NAME, DAILY_GROUP_NAME, DEFAULT_DAILY_TEMPLATE,
    createNoteGroup, ensureNoteGroup, renameNoteGroup, moveNoteGroup, deleteNoteGroup,
    createNote, quickCaptureNote, updateNote, setNotePinned, moveNote, softDeleteNote,
    getOrCreateDailyNote, deriveTagCounts, getNotesViewModel, exportNotes,
    getDailyTemplate, setDailyTemplate
} from './notes.js'

// db/index.jsx registers sync listeners at module-eval time and trySyncQueue
// consults navigator.onLine — stub it exactly like checklist.test.js does.
vi.stubGlobal('navigator', { onLine: true })

const TODAY = '2026-07-12'

beforeEach(async () => {
    await db.noteGroups.clear()
    await db.notes.clear()
})

// ─── Schema / upgrade safety ──────────────────────────────────────────────────

describe('schema — version 3 wiring on the real db instance', () => {
    it('is at version 3 with the two notes tables present', () => {
        expect(db.verno).toBe(3)
        const names = db.tables.map(t => t.name)
        expect(names).toContain('noteGroups')
        expect(names).toContain('notes')
        // Every pre-existing table is still there, untouched
        expect(names).toContain('sessions')
        expect(names).toContain('syncQueue')
        expect(names).toContain('settings')
        expect(names).toContain('checklistGroups')
        expect(names).toContain('checklistTasks')
        expect(names).toContain('checklistCompletions')
    })

    it('indexes tags as multiEntry — a note is findable by any one tag', async () => {
        const n = await createNote({ title: 'T', tags: ['alpha', 'bravo'] })
        expect(await db.notes.where('tags').equals('alpha').primaryKeys()).toEqual([n.id])
        expect(await db.notes.where('tags').equals('bravo').primaryKeys()).toEqual([n.id])
        expect(await db.notes.where('tags').equals('charlie').count()).toBe(0)
    })
})

describe('schema — upgrade path from a DB created at version 2', () => {
    const NAME = 'FightersOS-w23-upgrade-test'

    const V1_STORES = {
        sessions: '++id, date, day, phase, hipScore',
        syncQueue: '++id, sessionId, attempts',
        settings: 'key'
    }
    const V2_STORES = {
        ...V1_STORES,
        checklistGroups: 'id, order',
        checklistTasks: 'id, groupId, [groupId+order], deletedAt',
        checklistCompletions: '[taskId+date], taskId'
    }
    const V3_STORES = {
        ...V2_STORES,
        noteGroups: 'id, order',
        notes: 'id, groupId, deletedAt, *tags'
    }

    it('preserves v2 data (sessions + checklist) and adds empty notes tables', async () => {
        await Dexie.delete(NAME)

        // 1. Create a database exactly as version(2) shipped it, with
        //    real-shaped rows across BOTH eras of data.
        const v2 = new Dexie(NAME)
        v2.version(1).stores(V1_STORES)
        v2.version(2).stores(V2_STORES)
        const sessionRow = {
            sessionId: 'real-session-uuid', date: '2026-07-01',
            day: 1, phase: 2, hipScore: 4, sessionType: 'S&C', completeness: 90
        }
        const rowId = await v2.sessions.add(sessionRow)
        await v2.settings.put({ key: 'currentPhase', value: 2 })
        await v2.settings.put({ key: 'checklistResetTime', value: '04:00' })
        const groupRow = {
            id: 'g-real', name: 'Health', order: 0,
            createdAt: '2026-07-10T08:00:00.000Z',
            updatedAt: '2026-07-10T08:00:00.000Z', deletedAt: null
        }
        const taskRow = {
            id: 't-real', groupId: 'g-real', title: 'Hydrate 💧', note: '',
            scheduledTime: '07:00', repeatDaily: true, order: 0,
            createdAt: '2026-07-10T08:00:00.000Z',
            updatedAt: '2026-07-10T08:00:00.000Z', deletedAt: null
        }
        const completionRow = {
            taskId: 't-real', date: '2026-07-11',
            completedAt: '2026-07-11T09:00:00.000Z'
        }
        await v2.checklistGroups.add(groupRow)
        await v2.checklistTasks.add(taskRow)
        await v2.checklistCompletions.add(completionRow)
        v2.close()

        // 2. Reopen it with the v3 declaration EXACTLY as db/index.jsx has it.
        const v3 = new Dexie(NAME)
        v3.version(1).stores(V1_STORES)
        v3.version(2).stores(V2_STORES)
        v3.version(3).stores(V3_STORES)
        await v3.open()

        // 3. Existing data intact, byte for byte.
        expect(v3.verno).toBe(3)
        expect(await v3.sessions.get(rowId)).toEqual({ id: rowId, ...sessionRow })
        expect((await v3.settings.get('currentPhase')).value).toBe(2)
        expect((await v3.settings.get('checklistResetTime')).value).toBe('04:00')
        expect(await v3.checklistGroups.get('g-real')).toEqual(groupRow)
        expect(await v3.checklistTasks.get('t-real')).toEqual(taskRow)
        expect(await v3.checklistCompletions.get(['t-real', '2026-07-11'])).toEqual(completionRow)

        // 4. New tables exist and are empty.
        expect(await v3.noteGroups.count()).toBe(0)
        expect(await v3.notes.count()).toBe(0)

        v3.close()
        await Dexie.delete(NAME)
    })
})

// ─── Groups ───────────────────────────────────────────────────────────────────

describe('note groups — CRUD, reorder, cascade soft-delete', () => {
    it('creates groups with string ids, timestamps, and sequential order', async () => {
        const a = await createNoteGroup('Alpha')
        const b = await createNoteGroup('Bravo')
        expect(typeof a.id).toBe('string')
        expect(a.createdAt).toBeTruthy()
        expect(a.updatedAt).toBeTruthy()
        expect(a.order).toBe(0)
        expect(b.order).toBe(1)
    })

    it('ensureNoteGroup creates each named group exactly once', async () => {
        const g1 = await ensureNoteGroup(DEFAULT_NOTE_GROUP_NAME)
        const g2 = await ensureNoteGroup(DEFAULT_NOTE_GROUP_NAME)
        expect(g1.name).toBe('Inbox')
        expect(g2.id).toBe(g1.id)
        expect(await db.noteGroups.count()).toBe(1)
    })

    it('renames a group', async () => {
        const g = await createNoteGroup('Old')
        await renameNoteGroup(g.id, 'New')
        expect((await db.noteGroups.get(g.id)).name).toBe('New')
    })

    it('moveNoteGroup swaps neighbors and no-ops at the ends', async () => {
        const a = await createNoteGroup('A')
        const b = await createNoteGroup('B')

        await moveNoteGroup(b.id, -1) // B up
        let view = await getNotesViewModel()
        expect(view.groups.map(g => g.name)).toEqual(['B', 'A'])

        await moveNoteGroup(b.id, -1) // B already first — no-op
        view = await getNotesViewModel()
        expect(view.groups.map(g => g.name)).toEqual(['B', 'A'])

        await moveNoteGroup(a.id, 1) // A already last — no-op
        view = await getNotesViewModel()
        expect(view.groups.map(g => g.name)).toEqual(['B', 'A'])
    })

    it('deleteNoteGroup cascade-SOFT-deletes its notes; nothing is destroyed', async () => {
        const g = await createNoteGroup('Doomed')
        const n = await createNote({ title: 'In doomed group', groupId: g.id })

        await deleteNoteGroup(g.id)

        // Gone from the view…
        const view = await getNotesViewModel()
        expect(view.groups.find(x => x.id === g.id)).toBeUndefined()

        // …but every row still exists, tombstoned.
        expect((await db.noteGroups.get(g.id)).deletedAt).toBeTruthy()
        expect((await db.notes.get(n.id)).deletedAt).toBeTruthy()
        expect(await db.notes.count()).toBe(1)
    })
})

// ─── Notes ────────────────────────────────────────────────────────────────────

describe('notes — create, quick capture, update, pin, move, soft-delete', () => {
    it('createNote defaults into the Inbox group, auto-creating it', async () => {
        const n = await createNote({ title: 'Loose thought' })
        const view = await getNotesViewModel()
        expect(view.groups).toHaveLength(1)
        expect(view.groups[0].name).toBe(DEFAULT_NOTE_GROUP_NAME)
        expect(view.groups[0].notes.map(x => x.id)).toEqual([n.id])
        expect(typeof n.id).toBe('string')
        expect(n.pinned).toBe(false)
        expect(n.dailyDate).toBeNull()
    })

    it('quickCaptureNote splits first line → title, rest → body, lands in Inbox', async () => {
        const n = await quickCaptureNote('Gym idea\nsuperset A\nsuperset B')
        expect(n.title).toBe('Gym idea')
        expect(n.body).toBe('superset A\nsuperset B')
        const single = await quickCaptureNote('just a line')
        expect(single.title).toBe('just a line')
        expect(single.body).toBe('')
        const view = await getNotesViewModel()
        expect(view.groups).toHaveLength(1) // one Inbox for both
        expect(view.groups[0].notes).toHaveLength(2)
    })

    it('updateNote updates fields and bumps updatedAt; untouched fields survive', async () => {
        const n = await createNote({ title: 'Before', body: 'b', pinned: true })
        await updateNote(n.id, { title: 'After', body: 'new body' })
        const row = await db.notes.get(n.id)
        expect(row.title).toBe('After')
        expect(row.body).toBe('new body')
        expect(row.pinned).toBe(true)
        expect(row.updatedAt >= n.updatedAt).toBe(true)
    })

    it('normalizes tags on create AND update (the app-wide convention)', async () => {
        const n = await createNote({ title: 'T', tags: ['  Leg Day ', 'IDEAS', 'leg-day'] })
        expect((await db.notes.get(n.id)).tags).toEqual(['leg-day', 'ideas'])
        await updateNote(n.id, { tags: ['Deep   Work', ''] })
        expect((await db.notes.get(n.id)).tags).toEqual(['deep-work'])
    })

    it('setNotePinned toggles and moveNote reparents', async () => {
        const a = await createNoteGroup('A')
        const b = await createNoteGroup('B')
        const n = await createNote({ title: 'Mover', groupId: a.id })

        await setNotePinned(n.id, true)
        expect((await db.notes.get(n.id)).pinned).toBe(true)

        await moveNote(n.id, b.id)
        const view = await getNotesViewModel()
        expect(view.groups.find(g => g.id === a.id).notes).toHaveLength(0)
        expect(view.groups.find(g => g.id === b.id).notes.map(x => x.id)).toEqual([n.id])
    })

    it('softDeleteNote hides the note but keeps the row', async () => {
        const n = await createNote({ title: 'Ephemeral' })
        await softDeleteNote(n.id)
        const view = await getNotesViewModel()
        expect(view.groups[0].notes).toHaveLength(0)
        expect((await db.notes.get(n.id)).deletedAt).toBeTruthy()
    })
})

// ─── View model ───────────────────────────────────────────────────────────────

describe('getNotesViewModel — single query entry point', () => {
    it('sorts pinned notes first, then by updatedAt desc', async () => {
        const g = await createNoteGroup('G')
        const older = await createNote({ title: 'older', groupId: g.id })
        await db.notes.update(older.id, { updatedAt: '2026-07-01T00:00:00.000Z' })
        const newer = await createNote({ title: 'newer', groupId: g.id })
        await db.notes.update(newer.id, { updatedAt: '2026-07-10T00:00:00.000Z' })
        const pinnedOld = await createNote({ title: 'pinned-old', groupId: g.id, pinned: true })
        await db.notes.update(pinnedOld.id, { updatedAt: '2026-06-01T00:00:00.000Z' })

        const view = await getNotesViewModel()
        expect(view.groups[0].notes.map(n => n.title))
            .toEqual(['pinned-old', 'newer', 'older'])
    })

    it('derives tagCounts from ACTIVE notes only, count desc then name asc', async () => {
        await createNote({ title: 'a', tags: ['boxing', 'ideas'] })
        await createNote({ title: 'b', tags: ['boxing'] })
        const dead = await createNote({ title: 'c', tags: ['boxing', 'ghost'] })
        await softDeleteNote(dead.id)

        const view = await getNotesViewModel()
        expect(view.tagCounts).toEqual([
            { tag: 'boxing', count: 2 },
            { tag: 'ideas', count: 1 }
        ])
    })

    it('deriveTagCounts ties break alphabetically', () => {
        expect(deriveTagCounts([
            { tags: ['zulu'] }, { tags: ['alpha'] }
        ])).toEqual([
            { tag: 'alpha', count: 1 },
            { tag: 'zulu', count: 1 }
        ])
    })
})

// ─── Daily note ───────────────────────────────────────────────────────────────

describe('daily note — on-demand, idempotent, template-driven', () => {
    beforeEach(async () => {
        // Scoped cleanup: the file-level beforeEach only clears the two
        // notes tables; this key lives in `settings`.
        await db.settings.delete('notesDailyTemplate')
    })

    it('two Today taps on the same logical day return ONE note', async () => {
        const first = await getOrCreateDailyNote(TODAY)
        const second = await getOrCreateDailyNote(TODAY)
        expect(second.id).toBe(first.id)
        const dailies = (await db.notes.toArray()).filter(n => n.dailyDate === TODAY)
        expect(dailies).toHaveLength(1)
    })

    it('lands in an auto-provisioned Daily group, titled with the logical date', async () => {
        const n = await getOrCreateDailyNote(TODAY)
        expect(n.title).toBe(TODAY)
        expect(n.dailyDate).toBe(TODAY)
        const group = await db.noteGroups.get(n.groupId)
        expect(group.name).toBe(DAILY_GROUP_NAME)
        // Second daily on ANOTHER day reuses the same group
        const other = await getOrCreateDailyNote('2026-07-13')
        expect(other.id).not.toBe(n.id)
        expect(other.groupId).toBe(n.groupId)
    })

    it('prefills from the default template when the setting is unset', async () => {
        const n = await getOrCreateDailyNote(TODAY)
        expect(n.body).toBe(DEFAULT_DAILY_TEMPLATE)
    })

    it('an edited template affects the NEXT daily note, never existing ones', async () => {
        const before = await getOrCreateDailyNote(TODAY)
        await setDailyTemplate('## Custom\n\n- [ ] one thing')
        expect(await getDailyTemplate()).toBe('## Custom\n\n- [ ] one thing')

        // Same day: the existing note comes back untouched.
        const same = await getOrCreateDailyNote(TODAY)
        expect(same.id).toBe(before.id)
        expect((await db.notes.get(before.id)).body).toBe(DEFAULT_DAILY_TEMPLATE)

        // Next day: the new template is used.
        const next = await getOrCreateDailyNote('2026-07-13')
        expect(next.body).toBe('## Custom\n\n- [ ] one thing')
    })

    it('a soft-deleted daily is not resurrected — a fresh note is created', async () => {
        const first = await getOrCreateDailyNote(TODAY)
        await softDeleteNote(first.id)
        const second = await getOrCreateDailyNote(TODAY)
        expect(second.id).not.toBe(first.id)
        expect((await db.notes.get(first.id)).deletedAt).toBeTruthy() // tombstone kept
    })

    it('degrades a corrupt template setting to the default', async () => {
        await db.settings.put({ key: 'notesDailyTemplate', value: '' })
        expect(await getDailyTemplate()).toBe(DEFAULT_DAILY_TEMPLATE)
        await db.settings.put({ key: 'notesDailyTemplate', value: 123 })
        expect(await getDailyTemplate()).toBe(DEFAULT_DAILY_TEMPLATE)
    })
})

// ─── Export (D4 connector contract) ───────────────────────────────────────────

describe('exportNotes — plain-JSON shape stability', () => {
    it('returns the documented shape with exact key sets', async () => {
        const g = await createNoteGroup('Training')
        const n = await createNote({
            title: 'Sparring debrief', body: '- [ ] fix guard\nnotes…',
            tags: ['Boxing', 'camp 2026'], groupId: g.id, pinned: true
        })
        await softDeleteNote(n.id) // tombstones must be included, with deletedAt

        const out = await exportNotes()

        expect(out.version).toBe(1)
        expect(typeof out.exportedAt).toBe('string')

        expect(Object.keys(out.groups[0]).sort()).toEqual(
            ['createdAt', 'deletedAt', 'id', 'name', 'order', 'updatedAt']
        )
        expect(out.groups[0].deletedAt).toBeNull()

        expect(Object.keys(out.notes[0]).sort()).toEqual(
            ['body', 'createdAt', 'dailyDate', 'deletedAt', 'groupId',
                'id', 'pinned', 'tags', 'title', 'updatedAt'].sort()
        )
        expect(out.notes[0].deletedAt).toBeTruthy() // tombstone included
        expect(out.notes[0].groupId).toBe(g.id)     // stable string FK
        expect(out.notes[0].tags).toEqual(['boxing', 'camp-2026']) // normalized
        expect(out.notes[0].pinned).toBe(true)
        expect(out.notes[0].dailyDate).toBeNull()

        // Round-trips through JSON without loss (plain data only)
        expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    })
})
