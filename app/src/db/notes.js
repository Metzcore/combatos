/**
 * db/notes.js — Notes hub data layer (W23). LOCAL-ONLY.
 *
 * Plain async Dexie CRUD over the two W23 stores (noteGroups, notes) — no
 * React. The thin React wrapper is hooks/useNotes.js; this module is what
 * gets unit-tested directly with fake-indexeddb (same pattern as
 * checklist.test.js).
 *
 * HARD BOUNDARY: this feature never syncs. Nothing in this file (or any
 * notes file) may import from sync/syncQueue.js or touch webhook payloads.
 *
 * Conventions (D4 connector-ready discipline, mirroring db/checklist.js):
 * - ids are stable string UUIDs (never Dexie autoincrement integers)
 * - every row carries createdAt / updatedAt ISO timestamps
 * - deletes are SOFT: rows get a `deletedAt` ISO timestamp and are filtered
 *   from every view by the single query entry point (getNotesViewModel) —
 *   data is never destroyed
 * - tags are normalized on every write via utils/noteTags.js (the app-wide
 *   tag convention) and stored as a string array under the `*tags`
 *   multiEntry index
 * - exportNotes() returns the documented plain-JSON export shape
 *
 * "Today" (the daily note) uses the SAME logical-day clock as the
 * checklist: logicalDateStr + the `checklistResetTime` setting — one clock
 * for the whole hub. The daily note is created ON DEMAND only (never
 * auto-provisioned empty), prefilled from the EDITABLE `notesDailyTemplate`
 * setting, read at creation time — never hardcoded into the row.
 */

import { db, getSetting } from './index.jsx'
import { normalizeTags } from '../utils/noteTags.js'

export const DEFAULT_NOTE_GROUP_NAME = 'Inbox'
export const DAILY_GROUP_NAME = 'Daily'

export const DEFAULT_DAILY_TEMPLATE =
    "## What went well\n\n## What to fix\n\n## Tomorrow's focus"

function newId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function nowIso() {
    return new Date().toISOString()
}

// ─── Daily-note template setting ──────────────────────────────────────────────
// Lives in the EXISTING key-value `settings` store (no extra schema surface).
// DBProvider never reads this key — the notes layer is its only consumer.

const DAILY_TEMPLATE_KEY = 'notesDailyTemplate'

export async function getDailyTemplate() {
    const v = await getSetting(DAILY_TEMPLATE_KEY)
    return typeof v === 'string' && v ? v : DEFAULT_DAILY_TEMPLATE
}

export async function setDailyTemplate(value) {
    await db.settings.put({ key: DAILY_TEMPLATE_KEY, value })
}

// ─── Groups ───────────────────────────────────────────────────────────────────

async function activeGroups() {
    const all = await db.noteGroups.orderBy('order').toArray()
    return all.filter(g => !g.deletedAt)
}

export async function createNoteGroup(name) {
    const existing = await activeGroups()
    const ts = nowIso()
    const group = {
        id: newId(),
        name,
        order: existing.length > 0 ? Math.max(...existing.map(g => g.order)) + 1 : 0,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
    }
    await db.noteGroups.add(group)
    return group
}

/**
 * Returns the active group with `name`, creating it if absent. Quick
 * capture funnels through here with DEFAULT_NOTE_GROUP_NAME ('Inbox'); the
 * daily note with DAILY_GROUP_NAME ('Daily').
 */
export async function ensureNoteGroup(name) {
    const groups = await activeGroups()
    const found = groups.find(g => g.name === name)
    if (found) return found
    return createNoteGroup(name)
}

export async function renameNoteGroup(id, name) {
    await db.noteGroups.update(id, { name, updatedAt: nowIso() })
}

/**
 * Moves a group up (delta -1) or down (delta +1) among ACTIVE groups by
 * swapping `order` with its neighbor. No-op at either end of the list.
 * Same rule as db/checklist.js moveGroup.
 */
export async function moveNoteGroup(id, delta) {
    const groups = await activeGroups()
    const idx = groups.findIndex(g => g.id === id)
    if (idx === -1) return
    const swapIdx = idx + delta
    if (swapIdx < 0 || swapIdx >= groups.length) return
    const a = groups[idx]
    const b = groups[swapIdx]
    const ts = nowIso()
    await db.noteGroups.update(a.id, { order: b.order, updatedAt: ts })
    await db.noteGroups.update(b.id, { order: a.order, updatedAt: ts })
}

/**
 * Soft-deletes a group AND cascade-soft-deletes every note in it (the
 * delete confirm states this). Data is never destroyed, only hidden from
 * the view layer — same cascade rule as the checklist.
 */
export async function deleteNoteGroup(id) {
    const ts = nowIso()
    const notes = await db.notes.where('groupId').equals(id).toArray()
    for (const n of notes) {
        if (!n.deletedAt) {
            await db.notes.update(n.id, { deletedAt: ts, updatedAt: ts })
        }
    }
    await db.noteGroups.update(id, { deletedAt: ts, updatedAt: ts })
}

// ─── Notes ────────────────────────────────────────────────────────────────────

/**
 * Creates a note. Title is optional (untitled notes show a body excerpt in
 * the list). Tags are normalized here — every write path funnels through
 * the same convention. `dailyDate` is only ever set by getOrCreateDailyNote.
 */
export async function createNote({ title = '', body = '', tags = [], groupId = null, pinned = false, dailyDate = null }) {
    const gid = groupId || (await ensureNoteGroup(DEFAULT_NOTE_GROUP_NAME)).id
    const ts = nowIso()
    const note = {
        id: newId(),
        groupId: gid,
        title,
        body,
        tags: normalizeTags(tags),
        pinned: !!pinned,
        dailyDate,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
    }
    await db.notes.add(note)
    return note
}

/**
 * Quick capture: typed text becomes a new note in the default Inbox group —
 * first line → title, remaining lines → body.
 */
export async function quickCaptureNote(text) {
    const raw = typeof text === 'string' ? text : ''
    const nl = raw.indexOf('\n')
    const title = (nl === -1 ? raw : raw.slice(0, nl)).trim()
    const body = nl === -1 ? '' : raw.slice(nl + 1).trim()
    return createNote({ title, body })
}

export async function updateNote(id, fields) {
    const patch = { ...fields, updatedAt: nowIso() }
    if ('tags' in patch) patch.tags = normalizeTags(patch.tags)
    await db.notes.update(id, patch)
}

export async function setNotePinned(id, pinned) {
    await updateNote(id, { pinned: !!pinned })
}

export async function moveNote(id, newGroupId) {
    await updateNote(id, { groupId: newGroupId })
}

export async function softDeleteNote(id) {
    const ts = nowIso()
    await db.notes.update(id, { deletedAt: ts, updatedAt: ts })
}

// ─── Daily note ───────────────────────────────────────────────────────────────

/**
 * Returns the daily note for the given LOGICAL day, creating it on demand
 * in the auto-provisioned "Daily" group, prefilled from the editable
 * template setting (read NOW, never hardcoded at creation time).
 *
 * Idempotent: two "Today" taps on the same logical day return the SAME
 * note. Lookup includes soft-deleted dailies' absence — a daily note the
 * user deleted is NOT resurrected; a fresh one is created instead (the
 * tombstone keeps its data).
 *
 * @param {string} todayStr - the logical `YYYY-MM-DD` (caller computes it
 *   via logicalDateStr + the checklist reset-time setting — one clock for
 *   the whole hub)
 */
export async function getOrCreateDailyNote(todayStr) {
    const all = await db.notes.toArray()
    const existing = all.find(n => n.dailyDate === todayStr && !n.deletedAt)
    if (existing) return existing
    const group = await ensureNoteGroup(DAILY_GROUP_NAME)
    const template = await getDailyTemplate()
    return createNote({
        title: todayStr,
        body: template,
        groupId: group.id,
        dailyDate: todayStr
    })
}

// ─── View model ───────────────────────────────────────────────────────────────

/**
 * Derives the tag-chip filter row from live notes: the union of tags in
 * use across ACTIVE (non-deleted) notes, with per-tag note counts, sorted
 * by count desc then name asc. No separate tags table — always computed.
 *
 * @param {Array} activeNotes - already soft-delete-filtered note rows
 * @returns {Array<{ tag: string, count: number }>}
 */
export function deriveTagCounts(activeNotes) {
    const counts = new Map()
    for (const n of activeNotes) {
        for (const tag of n.tags || []) {
            counts.set(tag, (counts.get(tag) || 0) + 1)
        }
    }
    return [...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/**
 * Assembles the Notes tab's entire view model in one place — the SINGLE
 * query entry point, so the soft-delete filter can never be missed by one
 * component and applied by another (same discipline as getGroupsWithTasks).
 *
 * Returns:
 * {
 *   groups: [{ ...group, notes: [...] }],  // active groups, order-sorted;
 *                                          // notes pinned-first then
 *                                          // updatedAt desc
 *   tagCounts: [{ tag, count }]            // derived chip row
 * }
 */
export async function getNotesViewModel() {
    const groups = await activeGroups()
    const allNotes = await db.notes.toArray()
    const activeNotes = allNotes.filter(n => !n.deletedAt)

    const byPinnedThenRecency = (a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1
        return (b.updatedAt || '').localeCompare(a.updatedAt || '')
    }

    return {
        groups: groups.map(group => ({
            ...group,
            notes: activeNotes
                .filter(n => n.groupId === group.id)
                .sort(byPinnedThenRecency)
        })),
        tagCounts: deriveTagCounts(activeNotes)
    }
}

// ─── Export (D4 connector contract) ───────────────────────────────────────────

/**
 * exportNotes() — the documented plain-JSON export shape the future
 * Personal-OS / Hermes connector codes against. No export UI in v1 (the
 * W23.5 full backup already delivers these tables; this is the
 * feature-scoped contract, mirroring exportChecklist()).
 *
 * Shape (all keys always present; `deletedAt` is null when live,
 * `dailyDate` is null for non-daily notes):
 * {
 *   version: 1,
 *   exportedAt: ISO timestamp,
 *   groups: [{ id, name, order, createdAt, updatedAt, deletedAt }],
 *   notes:  [{ id, groupId, title, body, tags, pinned, dailyDate,
 *              createdAt, updatedAt, deletedAt }]
 * }
 *
 * Soft-deleted rows ARE included (with their deletedAt) — the export is
 * the full data set; the consumer decides what to do with tombstones.
 */
export async function exportNotes() {
    const [groups, notes] = await Promise.all([
        db.noteGroups.toArray(),
        db.notes.toArray()
    ])
    return {
        version: 1,
        exportedAt: nowIso(),
        groups: groups.map(g => ({
            id: g.id,
            name: g.name,
            order: g.order,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
            deletedAt: g.deletedAt ?? null
        })),
        notes: notes.map(n => ({
            id: n.id,
            groupId: n.groupId,
            title: n.title,
            body: n.body,
            tags: n.tags ?? [],
            pinned: !!n.pinned,
            dailyDate: n.dailyDate ?? null,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
            deletedAt: n.deletedAt ?? null
        }))
    }
}
