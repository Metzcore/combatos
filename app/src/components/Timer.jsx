import BasicTimer from './BasicTimer.jsx'
import RoundsTimer from './RoundsTimer.jsx'
import TopTabs from './TopTabs.jsx'
import { HUB_TOP_TABS } from '../utils/navState.js'

// activeMode/onModeChange are owned by AppShell (W20) so the Basic/Rounds
// selection survives hub switches. The timers themselves tick in DBProvider
// and are untouched by this — only which one is DISPLAYED is controlled here.
export default function Timer({ activeMode, onModeChange }) {
    return (
        // W15.1: .timer-hub scopes the calmer instrument-header override in
        // index.css to this hub only — shared .page-header is untouched
        // elsewhere. Mode ownership/tab behavior unchanged.
        <div className="app timer-hub" style={{ transition: 'background-color 1s ease-out' }}>
            <header className="page-header" style={{ paddingBottom: 10 }}>
                <h1>⏱️ Timer</h1>
                <div className="subtitle">Stopwatch & Rounds</div>

                <TopTabs
                    tabs={HUB_TOP_TABS.timer}
                    active={activeMode}
                    onChange={onModeChange}
                />
            </header>

            {activeMode === 'basic' && <BasicTimer />}
            {activeMode === 'rounds' && <RoundsTimer />}
        </div>
    )
}
