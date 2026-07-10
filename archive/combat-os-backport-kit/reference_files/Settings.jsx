import { useState } from 'react'
import { useDB, db } from '../db/index.jsx'
import { IGNITION_QUOTES } from '../data/ignition.js'

export default function Settings() {
    const { 
        appName, setAppName, 
        appSubtitle, setAppSubtitle, 
        dailyIgnitionEnabled, setDailyIgnitionEnabled,
        bookmarkedIgnitions, toggleIgnitionBookmark,
        deleteLastSession,
        refreshCounts, refreshPending 
    } = useDB()
    const [nameInput, setNameInput] = useState(appName || '')
    const [subInput, setSubInput] = useState(appSubtitle || '')

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

        const typeLabel = lastSession.sessionType ? ` (${lastSession.sessionType})` : ''
        const confirmed = confirm(`Are you sure you want to remove Day ${lastSession.dayNumber} logged on ${lastSession.date}${typeLabel}?\n\nThis will remove it from the app and soft-delete it from the Google Sheet.`)
        
        if (confirmed) {
            const success = await deleteLastSession()
            if (success) {
                alert(`Day ${lastSession.dayNumber} removed successfully.`)
            }
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
                    <div className="section-header red">⚠️ Danger Zone</div>
                    <div style={{ padding: 14 }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--dim)', marginBottom: 16, lineHeight: 1.4 }}>
                            If you made a mistake on your most recent log, you can remove it here. It will be removed locally and marked as cancelled in the Google Sheet.
                        </p>
                        <button className="btn-secondary" onClick={handleRemoveLastDay} style={{ color: 'var(--alert)', borderColor: 'rgba(255,50,50,0.3)', background: 'rgba(255,0,0,0.05)' }}>
                            Remove last logged day
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
