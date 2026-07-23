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
import { blockKindLabel, blockKindColor, formatPrescription, formatPair } from '../utils/cartridgeFormat.js'
import BottomSheet from './BottomSheet.jsx'

const DAY_TYPE_LABEL = {
    rest: 'Rest',
    recovery: 'Recovery',
    custom: 'Custom / Free-form',
}

function MobilityItem({ item }) {
    return (
        <div className="cartridge-item">
            <div className="cartridge-item-name">{item.name}</div>
            <div className="cartridge-item-meta">
                <span><strong>Dose:</strong> {item.dose}</span>
                {item.note && <span><strong>Note:</strong> {item.note}</span>}
            </div>
            {item.cue && <div className="cartridge-item-cue">💡 {item.cue}</div>}
        </div>
    )
}

function StrengthItem({ item }) {
    const rx = formatPrescription(item.prescription)
    const pair = formatPair(item.pair)
    return (
        <div className="cartridge-item">
            <div className="cartridge-item-name">
                {item.name}
                {item.superset && <span className="cartridge-superset-badge"> · Superset {item.superset}</span>}
            </div>
            <div className="cartridge-item-meta">
                {item.target && <span><strong>Target:</strong> {item.target}</span>}
                <span><strong>Sets:</strong> {item.sets} × {item.reps}</span>
                {rx && <span><strong>Load:</strong> {rx}</span>}
            </div>
            {pair && <div className="cartridge-pap">⚡ PAP: {pair}</div>}
            {item.cue && <div className="cartridge-item-cue">💡 {item.cue}</div>}
        </div>
    )
}

function ConditioningItem({ item }) {
    return (
        <div className="cartridge-item">
            <div className="cartridge-item-name">{item.name}</div>
            <div className="cartridge-item-meta">
                <span><strong>Rounds:</strong> {item.rounds}{item.roundLength ? ` × ${item.roundLength}` : ''}</span>
                {item.rest && <span><strong>Rest:</strong> {item.rest}</span>}
            </div>
            {Array.isArray(item.perRound) && item.perRound.length > 0 && (
                <ul className="cartridge-perround">
                    {item.perRound.map((line, index) => <li key={index}>{line}</li>)}
                </ul>
            )}
            {item.cue && <div className="cartridge-item-cue">💡 {item.cue}</div>}
        </div>
    )
}

const ITEM_RENDERERS = {
    mobility: MobilityItem,
    cooldown: MobilityItem,
    strength: StrengthItem,
    core: StrengthItem,
    conditioning: ConditioningItem,
}

function BlockSection({ block }) {
    const ItemComponent = ITEM_RENDERERS[block.kind] || StrengthItem
    return (
        <div className={`cartridge-block cartridge-block--${blockKindColor(block.kind)}`}>
            <div className="cartridge-block__head">
                {block.label || blockKindLabel(block.kind)}
            </div>
            <div className="cartridge-block__items">
                {block.items.map((item) => (
                    <div key={item.id} className="cartridge-block__item">
                        <ItemComponent item={item} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function isTrainingDay(day) {
    return day.type === 'training' && Array.isArray(day.blocks) && day.blocks.length > 0
}

function DayCard({ day, open, onToggle }) {
    if (!isTrainingDay(day)) {
        return (
            <div className="card cartridge-day cartridge-day--rest">
                <div className="cartridge-day__rest-row">
                    <span className="cartridge-day__rest-label">{day.label || `Day ${day.day}`}</span>
                    <span className="cartridge-day__rest-type">{DAY_TYPE_LABEL[day.type] || day.type}</span>
                </div>
            </div>
        )
    }

    const blockCount = day.blocks.length
    return (
        <div className={`card card--collapsible cartridge-day${open ? ' open' : ''}`}>
            <button
                type="button"
                className="cartridge-day__toggle card__toggle"
                onClick={onToggle}
                aria-expanded={open}
            >
                <span className="cartridge-day__title">{day.label || `Day ${day.day}`}</span>
                <span className="card__summary">{blockCount} block{blockCount === 1 ? '' : 's'}</span>
                <span className="card__chevron" aria-hidden="true">▾</span>
            </button>
            <div className="card__body">
                <div className="cartridge-day__body">
                    {day.focus && <div className="cartridge-day__focus">{day.focus}</div>}
                    {day.blocks.map((block, index) => <BlockSection key={index} block={block} />)}
                </div>
            </div>
        </div>
    )
}

function StatusPanel({ title, children, action, actionLabel = 'Retry' }) {
    return (
        <div className="library-state" role="status">
            <div className="library-state__title">{title}</div>
            {children && <div className="library-state__copy">{children}</div>}
            {action && (
                <button type="button" className="btn-secondary library-state__action" onClick={action}>
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

function LibraryNotice({ children, warning = false, action, actionLabel = 'Retry' }) {
    return (
        <div className={`library-notice${warning ? ' library-notice--warning' : ''}`} role="status">
            <span>{children}</span>
            {action && (
                <button type="button" onClick={action}>{actionLabel}</button>
            )}
        </div>
    )
}

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
    const [openDays, setOpenDays] = useState(() => new Set())
    const [aboutOpen, setAboutOpen] = useState(false)
    const sortedDays = useMemo(
        () => [...cartridge.days].sort((a, b) => a.day - b.day),
        [cartridge]
    )
    const cycleBlocks = Array.isArray(cartridge.cycle?.blocks) ? cartridge.cycle.blocks : []
    const descriptionParagraphs = typeof cartridge.description === 'string'
        ? cartridge.description.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
        : []

    useEffect(() => {
        setOpenDays(new Set())
        setAboutOpen(false)
        window.scrollTo(0, 0)
    }, [cartridge.cartridgeId])

    const toggleDay = (dayNumber) => setOpenDays((previous) => {
        const next = new Set(previous)
        if (next.has(dayNumber)) next.delete(dayNumber)
        else next.add(dayNumber)
        return next
    })

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

                <section className="library-detail__hero">
                    <div className="library-detail__status">{active ? 'Active program' : 'Previewing'}</div>
                    <h2>{cartridge.label}</h2>
                    <p>{cartridge.summary}</p>
                    <div className="library-detail__facts">
                        <span>{cartridge.cycle?.dayCount ?? cartridge.days.length}-day cycle</span>
                        {cartridge.cycle?.weeksPerBlock && (
                            <span>{cartridge.cycle.weeksPerBlock}-week block</span>
                        )}
                    </div>
                    {cycleBlocks.length > 0 && (
                        <div className="library-detail__phases" aria-label="Program phases">
                            {cycleBlocks.map((block) => <span key={block.id}>{block.label}</span>)}
                        </div>
                    )}
                </section>

                <section className="library-detail__section">
                    <h3>What this helps you build</h3>
                    <ul className="library-outcomes">
                        {cartridge.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
                    </ul>
                </section>

                <section className="library-detail__section">
                    <h3>Equipment</h3>
                    {cartridge.requirements.equipment.length > 0 ? (
                        <ul className="library-equipment">
                            {cartridge.requirements.equipment.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    ) : (
                        <p className="library-equipment-empty">No specific equipment required.</p>
                    )}
                </section>

                <section className="library-detail__section">
                    <h3>Focus</h3>
                    <div className="library-detail__tags">
                        {cartridge.tags.map((tag) => (
                            <span key={tag}>{formatCartridgeTag(tag)}</span>
                        ))}
                    </div>
                </section>

                {descriptionParagraphs.length > 0 && (
                    <div className={`card card--collapsible cartridge-about${aboutOpen ? ' open' : ''}`}>
                        <button
                            type="button"
                            className="cartridge-about__toggle"
                            onClick={() => setAboutOpen((value) => !value)}
                            aria-expanded={aboutOpen}
                        >
                            <span>How this program works</span>
                            <span className="card__chevron" aria-hidden="true">▾</span>
                        </button>
                        <div className="card__body">
                            <div className="cartridge-about__text">
                                {descriptionParagraphs.map((paragraph, index) => (
                                    <p key={`${cartridge.cartridgeId}-description-${index}`}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <section className="library-week" aria-labelledby="library-week-title">
                    <div className="library-week__heading">
                        <h3 id="library-week-title">Program week</h3>
                        <span>Tap a day to inspect it</span>
                    </div>
                    {sortedDays.map((day) => (
                        <DayCard
                            key={day.day}
                            day={day}
                            open={openDays.has(day.day)}
                            onToggle={() => toggleDay(day.day)}
                        />
                    ))}
                </section>

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
                    <LibraryNotice>Offline · showing programs saved on this device</LibraryNotice>
                )}
                {error && errorKind === 'refresh' && snapshot && !offline && (
                    <LibraryNotice action={refresh}>Couldn’t refresh · showing saved programs</LibraryNotice>
                )}
                {error && errorKind === 'cache' && snapshot && (
                    <LibraryNotice warning>
                        Programs loaded, but this device couldn’t update its offline copy.
                    </LibraryNotice>
                )}
                {updateRequired && (
                    <LibraryNotice warning action={offline ? null : refresh}>
                        {unknownActive
                            ? 'Your active program needs a newer version of Combat OS.'
                            : `${unknownIds.length} available program${unknownIds.length === 1 ? '' : 's'} need${unknownIds.length === 1 ? 's' : ''} a newer app version.`}
                    </LibraryNotice>
                )}

                {libraryState === 'loading' && (
                    <StatusPanel title="Loading your programs…" />
                )}
                {libraryState === 'offline-empty' && (
                    <StatusPanel title="Connect once to load your programs">
                        This device does not have a saved program list yet.
                    </StatusPanel>
                )}
                {libraryState === 'error' && (
                    <StatusPanel title="Couldn’t load your programs" action={refresh}>
                        Check your connection and try again.
                    </StatusPanel>
                )}
                {libraryState === 'empty' && (
                    <StatusPanel title="No programs available" action={offline ? null : refresh}>
                        Your coach has not made a program available yet.
                    </StatusPanel>
                )}
                {libraryState === 'update-required' && (
                    <StatusPanel title="Update Combat OS to view your program" action={offline ? null : refresh}>
                        Your account is assigned to a program this app version cannot display.
                    </StatusPanel>
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
