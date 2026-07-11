import { useState, useEffect } from 'react'
import { useDB, db, getSetting } from '../db/index.jsx'
import { IGNITION_QUOTES } from '../data/ignition.js'
import { exportFullBackup } from '../db/backup.js'
import { shareOrDownloadJson } from '../utils/checklistShare.js'
import { localDateStr } from '../utils/checklistDate.js'

// W23.5 — settings-store key for the last DELIVERED full backup. Read and
// written only here (DBProvider never touches it) — same single-consumer
// discipline as checklistResetTime in db/checklist.js.
const LAST_BACKUP_KEY = 'lastFullBackupAt'

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

export default function Settings() {
    const {
        appName, setAppName,
        appSubtitle, setAppSubtitle,
        dailyIgnitionEnabled, setDailyIgnitionEnabled,
        bookmarkedIgnitions, toggleIgnitionBookmark,
        refreshCounts, refreshPending, deleteLastSession,
        storagePersisted
    } = useDB()
    const [nameInput, setNameInput] = useState(appName || '')
    const [subInput, setSubInput] = useState(appSubtitle || '')
    const [lastBackupAt, setLastBackupAt] = useState(null)

    useEffect(() => {
        getSetting(LAST_BACKUP_KEY).then(v => {
            if (typeof v === 'string' && v) setLastBackupAt(v)
        }).catch(console.error)
    }, [])

    const handleBackup = async () => {
        const data = await exportFullBackup()
        const filename = `combatos-backup-${localDateStr()}.json`
        const result = await shareOrDownloadJson(data, filename, 'CombatOS Full Backup')
        // Only a TRUE delivery updates the timestamp — a completed share
        // sheet or a plain download counts; user-cancel does not.
        if (result !== 'cancelled') {
            const ts = new Date().toISOString()
            await db.settings.put({ key: LAST_BACKUP_KEY, value: ts })
            setLastBackupAt(ts)
            // The share sheet is its own confirmation; only the silent
            // download fallback gets an alert (reviewer ruling, 2026-07-12).
            if (result === 'downloaded') alert(`Backup downloaded: ${filename}`)
        }
    }

    const handleSave = () => {
        setAppName(nameInput)
        setAppSubtitle(subInput)
        alert('Settings saved!')
    }

    const handleRemoveLastDay = async () => {
        const lastSession = await db.sessions.orderBy('id').reverse().limit(1).first()
        if (!lastSession) {
            alert('No recent session found to delete.')
            return
        }
        
        const confirmed = confirm(`Are you sure you want to remove Day ${lastSession.day} Phase ${lastSession.phase}?\n\nThis will remove it locally and mark it CANCELLED in Google Sheets.`)
        if (confirmed) {
            const success = await deleteLastSession()
            if (success) {
                alert(`Day ${lastSession.day} removed successfully.`)
            }
        }
    }

    const handleWipe = async () => {
        if (confirm('⚠️ WARNING: This will permanently delete all local history in the Calendar tab and clear any pending syncs. Your Google Sheet will NOT be affected. Proceed?')) {
            await db.sessions.clear()
            await db.syncQueue.clear()
            if (refreshCounts) await refreshCounts()
            if (refreshPending) await refreshPending()
            alert('Local history and pending sync queue wiped.')
        }
    }

    return (
        <div className="app">
            <header className="page-header">
                <h1>⚙️ Settings</h1>
                <div className="subtitle">App Configuration</div>
            </header>

            <main className="content">
                <div className="card">
                    <div className="section-header blue">🎨 Personalization</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4, display: 'block' }}>App Name</label>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                style={{ width: '100%', padding: '10px' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4, display: 'block' }}>App Subtitle</label>
                            <input
                                type="text"
                                value={subInput}
                                onChange={e => setSubInput(e.target.value)}
                                style={{ width: '100%', padding: '10px' }}
                            />
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input 
                                type="checkbox" 
                                id="ignitionToggle"
                                checked={dailyIgnitionEnabled}
                                onChange={e => setDailyIgnitionEnabled(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="ignitionToggle" style={{ fontSize: '0.9rem', color: 'var(--text)', cursor: 'pointer' }}>
                                Enable Daily Ignition Splash
                            </label>
                        </div>
                        <button className="btn-primary" onClick={handleSave} style={{ marginTop: 8 }}>SAVE CHANGES</button>
                    </div>
                </div>

                <div className="card" style={{ marginTop: 20 }}>
                    <div className="section-header green">🔖 Saved Ignitions</div>
                    <div style={{ padding: 14 }}>
                        {bookmarkedIgnitions.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--dim)', fontStyle: 'italic' }}>
                                No ignitions bookmarked yet.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {bookmarkedIgnitions.map(id => {
                                    const quote = IGNITION_QUOTES.find(q => q.id === id)
                                    if (!quote) return null;
                                    return (
                                        <div key={id} style={{ 
                                            background: 'rgba(255,255,255,0.05)', 
                                            padding: '12px', 
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            gap: '12px'
                                        }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, fontStyle: 'italic' }}>"{quote.text}"</p>
                                            <button 
                                                onClick={() => toggleIgnitionBookmark(id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--alert)', fontSize: '1.2rem', cursor: 'pointer' }}
                                                title="Remove bookmark"
                                            >
                                                ★
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ marginTop: 20 }}>
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
                            Exports everything stored on this device (sessions, settings, checklist) as one JSON file. Workout history in Google Sheets is unaffected.
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
                            If you made a mistake on your most recent log, you can remove it here. It will be removed locally and marked as cancelled in the Google Sheet.
                        </p>
                        <button className="btn-secondary" onClick={handleRemoveLastDay} style={{ color: 'var(--alert)', borderColor: 'rgba(255,50,50,0.3)', background: 'rgba(255,0,0,0.05)', width: '100%' }}>
                            Remove Last Logged Day
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
