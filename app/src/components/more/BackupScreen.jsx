/**
 * BackupScreen.jsx — More › Backup & Data (W29).
 *
 * The former Settings.jsx "Data Backup" and "Danger Zone" cards, moved with
 * their behaviour unchanged. The user-facing COPY is corrected: three strings
 * here claimed data goes to Google Sheets, which stopped being true at the
 * Supabase migration — sync/syncQueue.js:8-17 records that the Apps Script
 * webhook is "left in place but no longer called", and both the log insert
 * and the delete now target Supabase `sessions`.
 *
 * Automated push to a configured endpoint is a separate, later change; this
 * screen is manual export only.
 */
import { useState, useEffect } from 'react'
import { useDB, getSetting } from '../../db/index.jsx'
import { runFullBackup, LAST_BACKUP_KEY } from '../../db/backup.js'
import { shareOrDownloadJson } from '../../utils/checklistShare.js'
import { localDateStr } from '../../utils/checklistDate.js'

/** "never" / "today" / "1 day ago" / "N days ago" from an ISO timestamp. */
function formatLastBackup(iso) {
    if (!iso) return 'never'
    const then = new Date(iso)
    if (isNaN(then.getTime())) return 'never'
    // Compare LOCAL calendar dates, not raw ms — a backup at 23:50 read at
    // 00:10 is "1 day ago", matching how a human counts days.
    const days = Math.round(
        (new Date(localDateStr()) - new Date(localDateStr(then))) / 86400000
    )
    if (days <= 0) return 'today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}

export default function BackupScreen() {
    const { deleteLastSession, storagePersisted } = useDB()
    const [lastBackupAt, setLastBackupAt] = useState(null)

    useEffect(() => {
        getSetting(LAST_BACKUP_KEY).then(v => {
            if (typeof v === 'string' && v) setLastBackupAt(v)
        }).catch(console.error)
    }, [])

    const handleBackup = async () => {
        const filename = `combatos-backup-${localDateStr()}.json`
        // The export + delivered-vs-cancelled bookkeeping now lives in
        // db/backup.js so an automated caller records delivery identically;
        // this screen supplies only the delivery mechanism and the UI feedback.
        const result = await runFullBackup({
            deliver: data => shareOrDownloadJson(data, filename, 'CombatOS Full Backup')
        })
        if (result !== 'cancelled') {
            setLastBackupAt(new Date().toISOString())
            // The share sheet is its own confirmation; only the silent
            // download fallback gets an alert (reviewer ruling, 2026-07-12).
            if (result === 'downloaded') alert(`Backup downloaded: ${filename}`)
        }
    }

    const handleRemoveLastDay = async () => {
        const lastSession = await db.sessions.orderBy('id').reverse().limit(1).first()
        if (!lastSession) {
            alert('No recent session found to delete.')
            return
        }

        const confirmed = confirm(`Are you sure you want to remove Day ${lastSession.day} Phase ${lastSession.phase}?\n\nThis removes it from this device and from your synced account.`)
        if (confirmed) {
            const success = await deleteLastSession()
            if (success) {
                alert(`Day ${lastSession.day} removed successfully.`)
            }
        }
    }

    return (
        <>
            <div className="card">
                <div className="section-header amber">💾 Data Backup</div>
                <div style={{ padding: 14 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4 }}>
                        {storagePersisted === null
                            ? 'Storage: checking…'
                            : storagePersisted
                                ? 'Storage: PERSISTENT'
                                : 'Storage: BEST-EFFORT — export backups regularly'}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 12 }}>
                        Last full backup: {formatLastBackup(lastBackupAt)}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--dim)', marginBottom: 16, lineHeight: 1.4 }}>
                        Exports everything stored on this device — workouts, settings, checklist and
                        notes — as one JSON file. Your workouts also sync to your account; the
                        checklist and notes live only on this device, so this export is their only
                        backup.
                    </p>
                    <button className="btn-primary" onClick={handleBackup} style={{ width: '100%' }}>
                        EXPORT FULL BACKUP
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
                <div className="section-header red">⚠️ Danger Zone</div>
                <div style={{ padding: 14 }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--dim)', marginBottom: 16, lineHeight: 1.4 }}>
                        If you made a mistake on your most recent log, you can remove it here. It is
                        removed from this device and from your synced account.
                    </p>
                    <button className="btn-secondary" onClick={handleRemoveLastDay} style={{ color: 'var(--alert)', borderColor: 'rgba(255,50,50,0.3)', background: 'rgba(255,0,0,0.05)', width: '100%' }}>
                        Remove Last Logged Day
                    </button>
                </div>
            </div>
        </>
    )
}
