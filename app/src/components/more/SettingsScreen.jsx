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
            <div className="more-body">
                <div>
                    <label htmlFor="appNameInput" className="more-field-label">App Name</label>
                    <input
                        id="appNameInput"
                        type="text"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="appSubtitleInput" className="more-field-label">App Subtitle</label>
                    <input
                        id="appSubtitleInput"
                        type="text"
                        value={subInput}
                        onChange={e => setSubInput(e.target.value)}
                    />
                </div>
                <div className="more-check">
                    <input
                        type="checkbox"
                        id="ignitionToggle"
                        checked={dailyIgnitionEnabled}
                        onChange={e => setDailyIgnitionEnabled(e.target.checked)}
                    />
                    <label htmlFor="ignitionToggle">
                        Enable Daily Ignition Splash
                    </label>
                </div>
                <button className="btn-primary" onClick={handleSave}>SAVE CHANGES</button>
            </div>
        </div>
    )
}
