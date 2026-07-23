import { useCartridgeAccess } from '../cartridges/CartridgeAccessProvider.jsx'
import { getCartridgePlanState } from '../utils/cartridgePlan.js'
import ProgramOverview from './ProgramOverview.jsx'
import { ProgramNotice, ProgramStatusPanel } from './ProgramAccessState.jsx'

export default function PlanViewer({ onOpenLibrary }) {
    const {
        snapshot,
        activeCartridge,
        loading,
        refreshing,
        offline,
        error,
        errorKind,
        refresh,
    } = useCartridgeAccess()

    const planState = getCartridgePlanState({
        loading,
        snapshot,
        offline,
        error,
        activeCartridge,
    })

    return (
        <div className="app library-app">
            <header className="page-header library-page-header">
                <h1>Plan</h1>
                <div className="subtitle">ACTIVE PROGRAM</div>
            </header>

            <main className="library-detail plan-detail">
                {refreshing && snapshot && (
                    <div className="library-refreshing" role="status">Checking for updates…</div>
                )}
                {offline && snapshot && (
                    <ProgramNotice>Offline · showing the plan saved on this device</ProgramNotice>
                )}
                {error && errorKind === 'refresh' && snapshot && !offline && (
                    <ProgramNotice action={refresh}>Couldn’t refresh · showing the saved plan</ProgramNotice>
                )}
                {error && errorKind === 'cache' && snapshot && (
                    <ProgramNotice warning>
                        Plan loaded, but this device couldn’t update its offline copy.
                    </ProgramNotice>
                )}

                {planState === 'loading' && (
                    <ProgramStatusPanel title="Loading your plan…" />
                )}
                {planState === 'offline-empty' && (
                    <ProgramStatusPanel title="Connect once to load your plan">
                        This device does not have a saved active program yet.
                    </ProgramStatusPanel>
                )}
                {planState === 'error' && (
                    <ProgramStatusPanel title="Couldn’t load your plan" action={refresh}>
                        Check your connection and try again.
                    </ProgramStatusPanel>
                )}
                {planState === 'no-active' && (
                    <ProgramStatusPanel
                        title="Choose an active program"
                        action={onOpenLibrary}
                        actionLabel="Open Library"
                    >
                        Pick one of the programs available to you.
                    </ProgramStatusPanel>
                )}
                {planState === 'update-required' && (
                    <ProgramStatusPanel title="Update Combat OS to view your plan">
                        Your active program needs a newer version of the app.
                    </ProgramStatusPanel>
                )}
                {planState === 'ready' && (
                    <ProgramOverview
                        cartridge={activeCartridge}
                        statusLabel="Active program"
                    />
                )}
            </main>
        </div>
    )
}
