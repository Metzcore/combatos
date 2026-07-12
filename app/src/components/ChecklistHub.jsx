/**
 * ChecklistHub.jsx — slot-4 hub wrapper (W23).
 *
 * Hosts the existing Checklist screen ("Checklist") and the new Notes
 * screen ("Notes") behind the shared TopTabs bar — exactly the TrainHub
 * pattern. Checklist.jsx is rendered UNMODIFIED with the same
 * all-or-nothing conditional mount AppShell used before W23, so its
 * countdown, quick-add, and sheets go through the identical
 * mount/unmount cycle they always have. Zero changes to Checklist.jsx.
 *
 * Tab selection is owned by AppShell (survives hub switches); this
 * component is a pure passthrough.
 */
import Checklist from './Checklist.jsx'
import Notes from './Notes.jsx'
import TopTabs from './TopTabs.jsx'
import { HUB_TOP_TABS } from '../utils/navState.js'

export default function ChecklistHub({ activeTab, onTabChange }) {
    return (
        <>
            <div className="hub-tabs-bar">
                <TopTabs
                    tabs={HUB_TOP_TABS.checklist}
                    active={activeTab}
                    onChange={onTabChange}
                />
            </div>
            {activeTab === 'checklist' && <Checklist />}
            {activeTab === 'notes' && <Notes />}
        </>
    )
}
