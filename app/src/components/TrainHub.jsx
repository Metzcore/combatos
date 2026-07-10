/**
 * TrainHub.jsx — slot-1 hub wrapper (W20).
 *
 * Hosts today's HUD ("Workout") and the existing PlaybookViewer ("Playbook")
 * behind the shared TopTabs bar. HUD and PlaybookViewer are rendered exactly
 * as before — same all-or-nothing conditional mount the old AppShell used —
 * so HUD's context-backed state persistence and scroll restore (CHECKLIST.md
 * A1) go through the identical mount/unmount cycle they always have. Neither
 * file is modified by W20.
 *
 * Tab selection is owned by AppShell (survives hub switches); this component
 * is a pure passthrough.
 */
import HUD from './HUD.jsx'
import PlaybookViewer from './PlaybookViewer.jsx'
import TopTabs from './TopTabs.jsx'
import { HUB_TOP_TABS } from '../utils/navState.js'

export default function TrainHub({ activeTab, onTabChange }) {
    return (
        <>
            <div className="hub-tabs-bar">
                <TopTabs
                    tabs={HUB_TOP_TABS.train}
                    active={activeTab}
                    onChange={onTabChange}
                />
            </div>
            {activeTab === 'workout' && <HUD />}
            {activeTab === 'playbook' && <PlaybookViewer />}
        </>
    )
}
