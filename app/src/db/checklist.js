/**
 * db/checklist.js — Checklist hub data layer (W21). LOCAL-ONLY.
 *
 * Plain async Dexie CRUD over the three W21 stores (checklistGroups,
 * checklistTasks, checklistCompletions) — no React. The thin React wrapper
 * is hooks/useChecklist.js; this module is what gets unit-tested directly
 * with fake-indexeddb (same pattern as syncQueue.test.js).
 *
 * HARD BOUNDARY: this feature never syncs. Nothing in this file (or any
 * checklist file) may import from sync/syncQueue.js or touch webhook
 * payloads.
 *
 * Conventions (D4 connector-ready discipline):
 * - ids are stable string UUIDs (never Dexie autoincrement integers)
 * - every row carries createdAt / updatedAt ISO timestamps
 * - deletes are SOFT: rows get a `deletedAt` ISO timestamp and are filtered
 *   from every view by the single query entry point (getGroupsWithTasks) —
 *   data is never destroyed
 * - exportChecklist() returns the documented plain-JSON export shape
 */

import { db, getSetting } from './index.jsx'
import { computeStreak } from '../utils/checklistStreak.js'
import { logicalDateStr, DEFAULT_RESET_TIME } from '../utils/checklistDate.js'

export const DEFAULT_GROUP_NAME = 'General'

function newId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function nowIso() {
    return new Date().toISOString()
}

// ─── Reset-time setting (W22) ─────────────────────────────────────────────────
// Lives in the EXISTING key-value `settings` store (no Dexie schema bump).
// DBProvider never reads this key, so the checklist hook is its only
// consumer — keep it that way, or two in-memory copies could go stale.

const RESET_TIME_KEY = 'checklistResetTime'

export async function getResetTime() {
    const v = await getSetting(RESET_TIME_KEY)
    return typeof v === 'string' && v ? v : DEFAULT_RESET_TIME
}

export async function setResetTime(value) {
    await db.settings.put({ key: RESET_TIME_KEY, value })
}

// ─── Groups ───────────────────────────────────────────────────────────────────

async function activeGroups() {
    const all = await db.checklistGroups.orderBy('order').toArray()
    return all.filter(g => !g.deletedAt)
}

export async function createGroup(name) {
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
    await db.checklistGroups.add(group)
    return group
}

/**
 * Returns the default "General" group, creating it if it doesn't exist yet.
 * Quick-add and orphan-safety both funnel through here.
 */
export async function ensureDefaultGroup() {
    const groups = await activeGroups()
    const general = groups.find(g => g.name === DEFAULT_GROUP_NAME)
    if (general) return general
    return createGroup(DEFAULT_GROUP_NAME)
}

export async function renameGroup(id, name) {
    await db.checklistGroups.update(id, { name, updatedAt: nowIso() })
}

/**
 * Moves a group up (delta -1) or down (delta +1) among ACTIVE groups by
 * swapping `order` with its neighbor. No-op at either end of the list.
 */
export async function moveGroup(id, delta) {
    const groups = await activeGroups()
    const idx = groups.findIndex(g => g.id === id)
    if (idx === -1) return
    const swapIdx = idx + delta
    if (swapIdx < 0 || swapIdx >= groups.length) return
    const a = groups[idx]
    const b = groups[swapIdx]
    const ts = nowIso()
    await db.checklistGroups.update(a.id, { order: b.order, updatedAt: ts })
    await db.checklistGroups.update(b.id, { order: a.order, updatedAt: ts })
}

/**
 * Soft-deletes a group AND cascade-soft-deletes every task in it (reviewer
 * ruling #1). Completion history rows are kept untouched — data is never
 * destroyed, only hidden from the view layer.
 */
export async function deleteGroup(id) {
    const ts = nowIso()
    const tasks = await db.checklistTasks.where('groupId').equals(id).toArray()
    for (const t of tasks) {
        if (!t.deletedAt) {
            await db.checklistTasks.update(t.id, { deletedAt: ts, updatedAt: ts })
        }
    }
    await db.checklistGroups.update(id, { deletedAt: ts, updatedAt: ts })
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

async function nextTaskOrder(groupId) {
    const siblings = await db.checklistTasks.where('groupId').equals(groupId).toArray()
    const active = siblings.filter(t => !t.deletedAt)
    return active.length > 0 ? Math.max(...active.map(t => t.order)) + 1 : 0
}

export async function createTask({ title, note = '', scheduledTime = '', repeatDaily = false, groupId = null }) {
    const gid = groupId || (await ensureDefaultGroup()).id
    const ts = nowIso()
    const task = {
        id: newId(),
        groupId: gid,
        title,
        note,
        scheduledTime,
        repeatDaily,
        order: await nextTaskOrder(gid),
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
    }
    await db.checklistTasks.add(task)
    return task
}

/** Quick-add: title only, straight into the default group. */
export async function quickAddTask(title) {
    return createTask({ title })
}

export async function updateTask(id, fields) {
    await db.checklistTasks.update(id, { ...fields, updatedAt: nowIso() })
}

export async function stopRepeating(id) {
    await updateTask(id, { repeatDaily: false })
}

export async function moveTask(id, newGroupId) {
    await db.checklistTasks.update(id, {
        groupId: newGroupId,
        order: await nextTaskOrder(newGroupId),
        updatedAt: nowIso()
    })
}

export async function softDeleteTask(id) {
    const ts = nowIso()
    await db.checklistTasks.update(id, { deletedAt: ts, updatedAt: ts })
}

// ─── Completions ──────────────────────────────────────────────────────────────

/**
 * Sets a task's completion for a given local date. Idempotent by
 * construction: the completions table's primary key is [taskId+date], so
 * `put` overwrites the same row (never duplicates) and `delete` of a
 * missing row is a no-op.
 */
export async function setCompletion(taskId, dateStr, done) {
    if (done) {
        await db.checklistCompletions.put({ taskId, date: dateStr, completedAt: nowIso() })
    } else {
        await db.checklistCompletions.delete([taskId, dateStr])
    }
}

// ─── View model ───────────────────────────────────────────────────────────────

/**
 * Assembles the hub's entire view model in one place — the SINGLE query
 * entry point, so the soft-delete filter can never be missed by one
 * component and applied by another.
 *
 * Returns active groups (order-sorted), each with its visible tasks
 * (order-sorted), each task annotated with:
 *   - doneToday: boolean
 *   - streak: consecutive-day count (recurring tasks only; 0 for one-offs)
 *
 * One-off (non-repeating) tasks with ANY completion are hidden from the
 * view (kept in data), per the W21 scope.
 *
 * @param {string} [todayStr] - injectable for tests; defaults to the
 *   default-midnight logical "today" (recomputed on every call — never
 *   cached across midnight). useChecklist.js always passes the reset-aware
 *   value explicitly: `logicalDateStr(new Date(), resetTime)`.
 */
export async function getGroupsWithTasks(todayStr = logicalDateStr()) {
    const groups = await activeGroups()
    const allTasks = await db.checklistTasks.toArray()
    const allCompletions = await db.checklistCompletions.toArray()

    const completionsByTask = new Map()
    for (const c of allCompletions) {
        if (!completionsByTask.has(c.taskId)) completionsByTask.set(c.taskId, new Set())
        completionsByTask.get(c.taskId).add(c.date)
    }

    return groups.map(group => {
        const tasks = allTasks
            .filter(t => t.groupId === group.id && !t.deletedAt)
            .sort((a, b) => a.order - b.order)
            .map(t => {
                const dates = completionsByTask.get(t.id) || new Set()
                return {
                    ...t,
                    doneToday: dates.has(todayStr),
                    streak: t.repeatDaily ? computeStreak(dates, todayStr) : 0,
                    everCompleted: dates.size > 0
                }
            })
            .filter(t => t.repeatDaily || !t.everCompleted) // completed one-offs leave the view
        return { ...group, tasks }
    })
}

// ─── Export (D4 connector contract) ───────────────────────────────────────────

/**
 * exportChecklist() — the documented plain-JSON export shape the future
 * Personal-OS / Hermes connector codes against. No export UI in v1.
 *
 * Shape (all keys always present; `deletedAt` is null when live):
 * {
 *   version: 1,
 *   exportedAt: ISO timestamp,
 *   groups:      [{ id, name, order, createdAt, updatedAt, deletedAt }],
 *   tasks:       [{ id, groupId, title, note, scheduledTime, repeatDaily,
 *                   order, createdAt, updatedAt, deletedAt }],
 *   completions: [{ taskId, date, completedAt }]
 * }
 *
 * Soft-deleted rows ARE included (with their deletedAt) — the export is the
 * full data set, and the consumer decides what to do with tombstones.
 */
export async function exportChecklist() {
    const [groups, tasks, completions] = await Promise.all([
        db.checklistGroups.toArray(),
        db.checklistTasks.toArray(),
        db.checklistCompletions.toArray()
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
        tasks: tasks.map(t => ({
            id: t.id,
            groupId: t.groupId,
            title: t.title,
            note: t.note,
            scheduledTime: t.scheduledTime,
            repeatDaily: t.repeatDaily,
            order: t.order,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            deletedAt: t.deletedAt ?? null
        })),
        completions: completions.map(c => ({
            taskId: c.taskId,
            date: c.date,
            completedAt: c.completedAt
        }))
    }
}
