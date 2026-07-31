import { useState } from 'react'
import TrainHub from './TrainHub.jsx'
import Timer from './Timer.jsx'
import Calendar from './Calendar.jsx'
import ChecklistHub from './ChecklistHub.jsx'
import MoreHub from './MoreHub.jsx'
import BottomNav from './BottomNav.jsx'
import WeightDueRail from './WeightDueRail.jsx'
import { useWeightDue } from '../hooks/useWeightDue.js'
import { DEFAULT_HUB, initialTopTabs, setHubTab } from '../utils/navState.js'

export default function AppShell() {
    const [activeHub, setActiveHub] = useState(DEFAULT_HUB)
    // W30: the weight due rail lives HERE, not inside Today. TodayRouter picks
    // between two Today implementations, so placing it there would mean the
    // same signal maintained in two components; and a user who never opens the
    // More hub would otherwise never see it at all.
    const weightDue = useWeightDue()
    // Seeds MoreHub's initial screen for one mount only, so "Log it" lands on
    // Profile instead of the menu. Cleared as soon as the user leaves More, so
    // a later tap on the More tab opens the menu normally.
    const [moreEntryScreen, setMoreEntryScreen] = useState('menu')

    const openHub = hub => {
        if (hub !== 'more') setMoreEntryScreen('menu')
        setActiveHub(hub)
    }

    const goLogWeight = () => {
        setMoreEntryScreen('profile')
        setActiveHub('more')
    }

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
            {activeHub === 'checklist' && (
                <ChecklistHub
                    activeTab={topTabs.checklist}
                    onTabChange={t => selectHubTab('checklist', t)}
                />
            )}
            {/* W29: More owns its own screen selection locally, so unlike the
                tabbed hubs it takes no tab props — see utils/moreNav.js.
                W30 passes only an ENTRY screen, which seeds that local state
                without taking ownership of it. */}
            {activeHub === 'more' && (
                <MoreHub key={moreEntryScreen} initialScreen={moreEntryScreen} />
            )}

            {/* Reserves layout space above the nav rather than overlaying, so
                it can never cover a mid-workout control. */}
            {weightDue.due && (
                <WeightDueRail
                    onLog={goLogWeight}
                    onSnooze={weightDue.snooze}
                />
            )}

            <BottomNav
                activeHub={activeHub}
                onChange={openHub}
            />
        </div>
    )
}
