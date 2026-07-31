/**
 * SettingsScreen.jsx — More › Settings (W29).
 *
 * The former Settings.jsx "Personalization" card, moved verbatim. Only what a
 * user can and would want to change lives here; everything else that used to
 * share that page now has its own More row.
 */
import { useState } from 'react'
import { useDB } from '../../db/index.jsx'

export default function SettingsScreen() {
    const {
        appName, setAppName,
        appSubtitle, setAppSubtitle,
        dailyIgnitionEnabled, setDailyIgnitionEnabled
    } = useDB()
    const [nameInput, setNameInput] = useState(appName || '')
    const [subInput, setSubInput] = useState(appSubtitle || '')

    const handleSave = () => {
        setAppName(nameInput)
        setAppSubtitle(subInput)
        alert('Settings saved!')
    }

    return (
        <div className="card">
            <div className="section-header blue">🎨 Personalization</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
                <div>
                    <label htmlFor="appNameInput" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4, display: 'block' }}>App Name</label>
                    <input
                        id="appNameInput"
                        type="text"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                    />
                </div>
                <div>
                    <label htmlFor="appSubtitleInput" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4, display: 'block' }}>App Subtitle</label>
                    <input
                        id="appSubtitleInput"
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
    )
}
