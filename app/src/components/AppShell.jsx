import { useState } from 'react'
import HUD from './HUD.jsx'
import PlaybookViewer from './PlaybookViewer.jsx'
import Timer from './Timer.jsx'
import Calendar from './Calendar.jsx'
import Settings from './Settings.jsx'
import BottomNav from './BottomNav.jsx'

export default function AppShell() {
    const [activeTab, setActiveTab] = useState('hud')

    return (
        <div className="app-shell">
            {activeTab === 'hud' && <HUD />}
            {activeTab === 'playbook' && <PlaybookViewer />}
            {activeTab === 'timer' && <Timer />}
            {activeTab === 'calendar' && <Calendar />}
            {activeTab === 'settings' && <Settings />}

            <BottomNav
                activeTab={activeTab}
                onChange={setActiveTab}
            />
        </div>
    )
}
