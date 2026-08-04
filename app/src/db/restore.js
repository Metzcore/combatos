/**
 * db/restore.js — one-time full-backup restore, for device migration only.
 *
 * SIBLING of backup.js, deliberately separate rather than a `restore` export
 * bolted on there. Writes a `combatos-full-backup` export (see backup.js for
 * the shape) into this device's Dexie tables via bulkPut.
 *
 * SCOPE (deliberately narrow — the W23.5 ruling that general restore is out
 * of scope still stands): this is for populating a FRESH, effectively empty
 * database on a new device/origin, not merging onto a live one. bulkPut is
 * upsert-by-primary-key, so running this against a database that already has
 * rows overwrites any row whose key collides with the backup — there is no
 * merge, dedup, or conflict UI, and none is attempted. Refuses to run on a
 * schemaVersion mismatch rather than guessing at a migration.
 */
import { BACKUP_FORMAT } from './backup.js'

export class RestoreError extends Error {}

/**
 * restoreFullBackup — write every table in `data.tables` into `targetDb`.
 * Returns { restored: { tableName: rowCount }, skipped: [tableName, ...] }.
 * `skipped` lists table names present in the backup but not in the current
 * schema (defence against a stale or hand-edited file slipping past the
 * schemaVersion check).
 */
export async function restoreFullBackup(data, { targetDb } = {}) {
    if (!targetDb) {
        throw new TypeError('restoreFullBackup requires { targetDb }')
    }
    if (!data || typeof data !== 'object') {
        throw new RestoreError('Not a valid backup file.')
    }
    if (data.format !== BACKUP_FORMAT) {
        throw new RestoreError(`Not a CombatOS backup file (expected format "${BACKUP_FORMAT}").`)
    }
    if (data.schemaVersion !== targetDb.verno) {
        throw new RestoreError(
            `Backup schema version ${data.schemaVersion} does not match this app's schema version ` +
            `${targetDb.verno}. Refusing to restore — update the app or re-export the backup first.`
        )
    }
    if (!data.tables || typeof data.tables !== 'object') {
        throw new RestoreError('Backup file has no table data.')
    }

    const knownTableNames = new Set(targetDb.tables.map(t => t.name))
    const restored = {}
    const skipped = []

    await targetDb.transaction('rw', targetDb.tables, async () => {
        for (const [name, rows] of Object.entries(data.tables)) {
            if (!knownTableNames.has(name)) {
                skipped.push(name)
                continue
            }
            if (!Array.isArray(rows) || rows.length === 0) continue
            await targetDb.table(name).bulkPut(rows)
            restored[name] = rows.length
        }
    })

    return { restored, skipped }
}
