import { useState } from 'react'
import { useDB, db } from '../db/index.jsx'

export default function Settings() {
    const { appName, setAppName, appSubtitle, setAppSubtitle, refreshCounts, refreshPending } = useDB()
    const [nameInput, setNameInput] = useState(appName || '')
    const [subInput, setSubInput] = useState(appSubtitle || '')

    const handleSave = () => {
        setAppName(nameInput)
        setAppSubtitle(subInput)
        alert('Settings saved!')
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
                        <button className="btn-primary" onClick={handleSave} style={{ marginTop: 8 }}>SAVE CHANGES</button>
                    </div>
                </div>

                <div className="card" style={{ marginTop: 20 }}>
                    <div className="section-header red">⚠️ Danger Zone</div>
                    <div style={{ padding: 14 }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--dim)', marginBottom: 16, lineHeight: 1.4 }}>
                            If you are starting a new fight camp and want a clean slate, you can wipe the local session history shown in the Calendar tab.
                            <strong> Your actual Google Sheet log will not be affected.</strong>
                        </p>
                        <button className="btn-secondary" onClick={handleWipe} style={{ color: 'var(--alert)', borderColor: 'rgba(255,50,50,0.3)', background: 'rgba(255,0,0,0.05)' }}>
                            WIPE LOCAL HISTORY
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
