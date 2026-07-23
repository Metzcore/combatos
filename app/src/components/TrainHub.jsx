/**
 * TrainHub.jsx — slot-1 hub wrapper (W20).
 *
 * A10 gives Train three distinct jobs:
 * - Today: the existing HUD and logging path, unchanged.
 * - Plan: read-only orientation around the confirmed active cartridge.
 * - Library: assigned programs and confirmed activation.
 *
 * Tab selection is owned by AppShell (survives hub switches); this component
 * is a pure passthrough.
 */
import HUD from './HUD.jsx'
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
            {activeTab === 'today' && <HUD />}
            {activeTab === 'plan' && <PlanViewer onOpenLibrary={() => onTabChange('library')} />}
            {activeTab === 'library' && <CartridgeViewer />}
        </>
    )
}
