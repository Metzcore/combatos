import { useState } from 'react'
import TrainHub from './TrainHub.jsx'
import Timer from './Timer.jsx'
import Calendar from './Calendar.jsx'
import Checklist from './Checklist.jsx'
import Settings from './Settings.jsx'
import BottomNav from './BottomNav.jsx'
import { DEFAULT_HUB, initialTopTabs, setHubTab } from '../utils/navState.js'

export default function AppShell() {
    const [activeHub, setActiveHub] = useState(DEFAULT_HUB)

    // Layer-2 selection per hub (W20). Lives here — above the hubs, which
    // fully unmount on hub switch — so e.g. Train→Timer→Train returns to the
    // top tab you were on. Resets on full reload by design, same lifetime as
    // activeHub. Shape + update rule are unit-tested in utils/navState.test.js.
    const [topTabs, setTopTabs] = useState(initialTopTabs)

    const selectHubTab = (hub, tab) => setTopTabs(prev => setHubTab(prev, hub, tab))

    return (
        <div className="app-shell">
            {activeHub === 'train' && (
                <TrainHub
                    activeTab={topTabs.train}
                    onTabChange={t => selectHubTab('train', t)}
                />
            )}
            {activeHub === 'timer' && (
                <Timer
                    activeMode={topTabs.timer}
                    onModeChange={t => selectHubTab('timer', t)}
                />
            )}
            {activeHub === 'log' && (
                <Calendar
                    view={topTabs.log}
                    onViewChange={t => selectHubTab('log', t)}
                />
            )}
            {activeHub === 'checklist' && <Checklist />}
            {activeHub === 'settings' && <Settings />}

            <BottomNav
                activeHub={activeHub}
                onChange={setActiveHub}
            />
        </div>
    )
}
