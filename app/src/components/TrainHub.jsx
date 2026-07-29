/**
 * TrainHub.jsx — slot-1 hub wrapper (W20).
 *
 * A10/A7b gives Train three distinct jobs:
 * - Today: TodayRouter picks between the interactive cartridge Today and
 *   the legacy HUD per-account (utils/todayRoute.js) — see TodayRouter.jsx.
 * - Plan: read-only orientation around the confirmed active cartridge.
 * - Library: assigned programs and confirmed activation.
 *
 * Tab selection is owned by AppShell (survives hub switches); this component
 * is a pure passthrough.
 */
import TodayRouter from './TodayRouter.jsx'
import PlanViewer from './PlanViewer.jsx'
import CartridgeViewer from './CartridgeViewer.jsx'
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
            {activeTab === 'today' && <TodayRouter onOpenLibrary={() => onTabChange('library')} />}
            {activeTab === 'plan' && <PlanViewer onOpenLibrary={() => onTabChange('library')} />}
            {activeTab === 'library' && <CartridgeViewer />}
        </>
    )
}
