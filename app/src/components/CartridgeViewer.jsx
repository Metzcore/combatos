/**
 * Account-scoped program Library.
 *
 * A9d keeps preview state separate from the Supabase-confirmed active pointer:
 * opening a program never activates it. The existing block/day renderer stays
 * read-only; activation delegates entirely to the tested A9c provider.
 */
import { useEffect, useMemo, useState } from 'react'
import { useCartridgeAccess } from '../cartridges/CartridgeAccessProvider.jsx'
import {
    formatCartridgeTag,
    getCartridgeLibraryState,
    orderLibraryCartridges,
} from '../utils/cartridgeLibrary.js'
import BottomSheet from './BottomSheet.jsx'
import ProgramOverview from './ProgramOverview.jsx'
import { ProgramNotice, ProgramStatusPanel } from './ProgramAccessState.jsx'

function ProgramCard({ cartridge, active, onOpen }) {
    const equipmentCount = cartridge.requirements?.equipment?.length ?? 0
    const dayCount = cartridge.cycle?.dayCount ?? cartridge.days.length
    const visibleTags = cartridge.tags.slice(0, 3)

    return (
        <button
            type="button"
            className={`library-card${active ? ' library-card--active' : ''}`}
            onClick={onOpen}
            aria-label={`${active ? 'Open active program' : 'Preview program'}: ${cartridge.label}`}
        >
            <span className="library-card__status">{active ? 'Active' : 'Available'}</span>
            <span className="library-card__title">{cartridge.label}</span>
            <span className="library-card__summary">{cartridge.summary}</span>
            <span className="library-card__facts">
                <span>{dayCount}-day plan</span>
                <span>{equipmentCount} equipment item{equipmentCount === 1 ? '' : 's'}</span>
            </span>
            <span className="library-card__tags">
                {visibleTags.map((tag) => (
                    <span key={tag}>{formatCartridgeTag(tag)}</span>
                ))}
                {cartridge.tags.length > visibleTags.length && (
                    <span>+{cartridge.tags.length - visibleTags.length}</span>
                )}
            </span>
            <span className="library-card__action">
                {active ? 'Open plan' : 'Preview'} <span aria-hidden="true">→</span>
            </span>
        </button>
    )
}

function ProgramDetail({
    cartridge,
    active,
    offline,
    unknownActive,
    onBack,
    onRequestActivation,
}) {
    return (
        <>
            <header className="page-header library-page-header">
                <h1>Library</h1>
                <div className="subtitle">PROGRAM DETAIL</div>
            </header>

            <main className="library-detail">
                <button type="button" className="library-back" onClick={onBack}>
                    <span aria-hidden="true">←</span> All programs
                </button>

                <ProgramOverview
                    cartridge={cartridge}
                    statusLabel={active ? 'Active program' : 'Previewing'}
                />

                {active ? (
                    <div className="library-active-footer">This is your active program.</div>
                ) : (
                    <div className="library-activation">
                        {offline && <div>Connect to change your active program.</div>}
                        {unknownActive && <div>Update the app before replacing the active program it cannot display.</div>}
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={offline || unknownActive}
                            onClick={onRequestActivation}
                        >
                            Use this program
                        </button>
                    </div>
                )}
            </main>
        </>
    )
}

export default function CartridgeViewer() {
    const {
        snapshot,
        availableCartridges,
        activeCartridge,
        unknownIds,
        updateRequired,
        loading,
        refreshing,
        offline,
        error,
        errorKind,
        activatingId,
        refresh,
        activate,
    } = useCartridgeAccess()
    const [viewingId, setViewingId] = useState(null)
    const [activationTarget, setActivationTarget] = useState(null)
    const [activationError, setActivationError] = useState(null)
    const [activationPending, setActivationPending] = useState(false)

    const orderedCartridges = useMemo(
        () => orderLibraryCartridges(availableCartridges, snapshot?.activeId),
        [availableCartridges, snapshot?.activeId]
    )
    const viewing = useMemo(
        () => availableCartridges.find((cartridge) => cartridge.cartridgeId === viewingId) ?? null,
        [availableCartridges, viewingId]
    )
    const unknownActive = Boolean(snapshot?.activeId && !activeCartridge)
    const libraryState = getCartridgeLibraryState({
        loading,
        snapshot,
        offline,
        error,
        knownCount: availableCartridges.length,
        unknownCount: unknownIds.length,
    })

    useEffect(() => {
        if (viewingId && !viewing) setViewingId(null)
    }, [viewing, viewingId])

    const openProgram = (cartridgeId) => {
        setViewingId(cartridgeId)
        window.scrollTo(0, 0)
    }

    const closeActivation = () => {
        if (activationPending || activatingId) return
        setActivationTarget(null)
        setActivationError(null)
    }

    const confirmActivation = async () => {
        if (!activationTarget) return
        setActivationError(null)
        setActivationPending(true)
        try {
            const result = await activate(activationTarget.cartridgeId)
            if (!result.data) {
                setActivationError(result.error?.message || 'Could not change the active program.')
                return
            }
            setActivationTarget(null)
        } finally {
            setActivationPending(false)
        }
    }

    if (viewing) {
        return (
            <div className="app library-app">
                <ProgramDetail
                    cartridge={viewing}
                    active={viewing.cartridgeId === snapshot?.activeId}
                    offline={offline}
                    unknownActive={unknownActive}
                    onBack={() => {
                        setViewingId(null)
                        window.scrollTo(0, 0)
                    }}
                    onRequestActivation={() => {
                        setActivationError(null)
                        setActivationTarget(viewing)
                    }}
                />

                <BottomSheet
                    open={Boolean(activationTarget)}
                    onClose={closeActivation}
                    title="Change active program"
                >
                    <p className="library-activation-sheet__copy">
                        Make <strong>{activationTarget?.label}</strong> active? Your history stays.
                        This becomes your selected training program.
                    </p>
                    {activationError && (
                        <div className="library-activation-sheet__error" role="alert">
                            {activationError}
                        </div>
                    )}
                    <button
                        type="button"
                        className="btn-primary"
                        disabled={activationPending || Boolean(activatingId)}
                        onClick={confirmActivation}
                    >
                        {activationPending || activatingId ? 'Making active…' : 'Make active'}
                    </button>
                    <button
                        type="button"
                        className="sheet__action"
                        disabled={activationPending || Boolean(activatingId)}
                        onClick={closeActivation}
                    >
                        Keep current program
                    </button>
                </BottomSheet>
            </div>
        )
    }

    return (
        <div className="app library-app">
            <header className="page-header library-page-header">
                <h1>Library</h1>
                <div className="subtitle">YOUR PROGRAMS</div>
            </header>

            <main className="cartridge-library">
                {refreshing && snapshot && (
                    <div className="library-refreshing" role="status">Checking for updates…</div>
                )}
                {offline && snapshot && (
                    <ProgramNotice>Offline · showing programs saved on this device</ProgramNotice>
                )}
                {error && errorKind === 'refresh' && snapshot && !offline && (
                    <ProgramNotice action={refresh}>Couldn’t refresh · showing saved programs</ProgramNotice>
                )}
                {error && errorKind === 'cache' && snapshot && (
                    <ProgramNotice warning>
                        Programs loaded, but this device couldn’t update its offline copy.
                    </ProgramNotice>
                )}
                {updateRequired && (
                    <ProgramNotice warning action={offline ? null : refresh}>
                        {unknownActive
                            ? 'Your active program needs a newer version of Combat OS.'
                            : `${unknownIds.length} available program${unknownIds.length === 1 ? '' : 's'} need${unknownIds.length === 1 ? 's' : ''} a newer app version.`}
                    </ProgramNotice>
                )}

                {libraryState === 'loading' && (
                    <ProgramStatusPanel title="Loading your programs…" />
                )}
                {libraryState === 'offline-empty' && (
                    <ProgramStatusPanel title="Connect once to load your programs">
                        This device does not have a saved program list yet.
                    </ProgramStatusPanel>
                )}
                {libraryState === 'error' && (
                    <ProgramStatusPanel title="Couldn’t load your programs" action={refresh}>
                        Check your connection and try again.
                    </ProgramStatusPanel>
                )}
                {libraryState === 'empty' && (
                    <ProgramStatusPanel title="No programs available" action={offline ? null : refresh}>
                        Your coach has not made a program available yet.
                    </ProgramStatusPanel>
                )}
                {libraryState === 'update-required' && (
                    <ProgramStatusPanel title="Update Combat OS to view your program" action={offline ? null : refresh}>
                        Your account is assigned to a program this app version cannot display.
                    </ProgramStatusPanel>
                )}
                {libraryState === 'ready' && (
                    <section className="library-list" aria-label="Programs available to you">
                        {orderedCartridges.map((cartridge) => (
                            <ProgramCard
                                key={cartridge.cartridgeId}
                                cartridge={cartridge}
                                active={cartridge.cartridgeId === snapshot?.activeId}
                                onOpen={() => openProgram(cartridge.cartridgeId)}
                            />
                        ))}
                    </section>
                )}
            </main>
        </div>
    )
}
