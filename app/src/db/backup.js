/**
 * db/backup.js — full-app backup export (W23.5). LOCAL-ONLY, read-only.
 *
 * Dumps EVERY Dexie table into one plain-JSON document. Tables are
 * enumerated DYNAMICALLY via `db.tables` — never hardcoded — so when a
 * future schema version adds stores (e.g. W23 notes), they are included
 * automatically with zero changes to this file.
 *
 * Shape (pinned by backup.test.js — this is both disaster recovery and the
 * future Supabase (D7) migration seed, so shape stability matters):
 * {
 *   format: 'combatos-full-backup',
 *   version: 2,
 *   exportedAt: ISO timestamp,
 *   schemaVersion: db.verno,
 *   tables: { <tableName>: [rows...] }   // every table, empty ones included
 *   redactedSettings: [ 'settingKey', ... ]  // NAMES only, never values
 * }
 *
 * VERSION 2 (W29) narrows the promise from "every table, every row" to "all
 * recoverable user data, EXCLUDING device credentials". Device secrets — the
 * Agent backup endpoint and its token — live in the `settings` table, and
 * dynamic enumeration would otherwise put the credential for writing to an
 * endpoint inside the very backup sent to it. See db/backupRedaction.js for
 * the full reasoning. `redactedSettings` lists the withheld KEY NAMES so a
 * future restore can tell the user what to reconfigure instead of silently
 * producing a half-working device.
 *
 * RESTORE IS EXPLICITLY OUT OF SCOPE (W23.5 ruling): merge semantics —
 * ids colliding with live rows, tombstone reconciliation, partial imports —
 * are the Supabase era's problem. Until then this file is a one-way export.
 *
 * Memory: everything is materialized in RAM before stringify. Fine at this
 * app's scale — a single user logging a few hundred sessions/year plus
 * low-hundreds of checklist rows is tens to a few hundred KB of JSON, well
 * within what the File/Blob path in checklistShare.js already handles.
 * Revisit only if row counts ever reach the tens of thousands.
 */

import { db } from './index.jsx'
import { redactSettingsRows } from './backupRedaction.js'

export const BACKUP_FORMAT = 'combatos-full-backup'
export const BACKUP_VERSION = 2

/** Settings key holding the ISO timestamp of the last DELIVERED manual backup. */
export const LAST_BACKUP_KEY = 'lastFullBackupAt'

export async function exportFullBackup() {
    const tables = {}
    let redactedSettings = []

    for (const table of db.tables) {
        const rows = await table.toArray()
        if (table.name === 'settings') {
            // The ONLY table carrying device credentials today. Matched by
            // table name rather than by scanning every row of every table:
            // a value-shaped heuristic ("looks like a token") would both miss
            // real secrets and redact innocent user data.
            const { rows: safe, redactedKeys } = redactSettingsRows(rows)
            tables[table.name] = safe
            redactedSettings = redactedKeys
        } else {
            tables[table.name] = rows
        }
    }

    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        schemaVersion: db.verno,
        tables,
        redactedSettings
    }
}

/**
 * runFullBackup — export, deliver, and record the delivery. Callable.
 *
 * Extracted from the Settings/Backup click handler so the same "did this
 * actually land?" bookkeeping serves both the manual button and any automated
 * caller, instead of being duplicated (and drifting) per call site.
 *
 * `deliver` is INJECTED rather than imported so this stays DOM-free and
 * testable: the manual path passes the share-or-download helper, an automated
 * path passes a network sender, and a test passes a stub. It must resolve to a
 * string result; anything other than 'cancelled' counts as delivered.
 *
 * The delivered-vs-cancelled distinction is the whole point and predates this
 * refactor (reviewer ruling, 2026-07-12): a user who opens the share sheet and
 * backs out has NOT backed up, and recording that they did would quietly erode
 * the "last backup: N days ago" signal into a lie.
 */
export async function runFullBackup({ deliver }) {
    if (typeof deliver !== 'function') {
        throw new TypeError('runFullBackup requires a deliver(data) function')
    }
    const data = await exportFullBackup()
    const result = await deliver(data)

    if (result !== 'cancelled') {
        await db.settings.put({ key: LAST_BACKUP_KEY, value: new Date().toISOString() })
    }
    return result
}
