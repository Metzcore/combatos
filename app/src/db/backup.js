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
 *   version: 1,
 *   exportedAt: ISO timestamp,
 *   schemaVersion: db.verno,
 *   tables: { <tableName>: [rows...] }   // every table, empty ones included
 * }
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

export const BACKUP_FORMAT = 'combatos-full-backup'

export async function exportFullBackup() {
    const tables = {}
    for (const table of db.tables) {
        tables[table.name] = await table.toArray()
    }
    return {
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        schemaVersion: db.verno,
        tables
    }
}
