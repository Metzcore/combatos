/**
 * components/today/CartridgeToday.jsx — A7b interactive cartridge Today
 * (corrective plan §4). Mounted by TodayRouter.jsx only once the account's
 * draft-hydration/legacy-draft/cartridge-access gates have already resolved
 * to "this account has an active cartridge and nothing else is pending" —
 * this component owns the idle/day-pick/Start/active-workout/Finish
 * lifecycle for that cartridge, never the account-level routing decision
 * (utils/todayRoute.js) or the shared draft-resolution banner (both live in
 * TodayRouter so HUD.jsx and this component never duplicate that UI).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDB, db, CartridgeValidationError } from '../../db/index.jsx'
import { useCartridgeAccess } from '../../cartridges/CartridgeAccessProvider.jsx'
import { useWorkoutDraftPersistence } from '../../hooks/useWorkoutDraftPersistence.js'
import { coerceNumericField } from '../../utils/cartridgeSessionPayload.js'
import { buildTrainingOrCustomLogInput, buildRestOrRecoveryLogInput } from '../../utils/cartridgeLogInput.js'
import { describeCartridgeValidationError } from '../../utils/cartridgeValidationMessages.js'
import { liveCartridgeCompleteness, itemCompleteness } from '../../utils/cartridgeCompleteness.js'
import { removeExtraSetAtIndex } from '../../utils/extraSetState.js'
import { fixedCategoryForDayType } from '../../utils/sessionCategory.js'
import { suggestNextDayTemplate, listSelectableDays, defaultCategoryFor } from '../../utils/cartridgeDaySelection.js'
import { findLastPerformance } from '../../utils/lastPerformance.js'
import { mapSaveStatusToLabel } from '../../utils/saveStatusLabel.js'
import BottomSheet from '../BottomSheet.jsx'
import CompletenessBar from '../CompletenessBar.jsx'
import TodayHeader from './TodayHeader.jsx'
import TodayBlock from './TodayBlock.jsx'
import SessionSummary from './SessionSummary.jsx'
import EffortGuideSheet from './EffortGuideSheet.jsx'
import DaySelectSheet from './DaySelectSheet.jsx'
import CategorySheet from './CategorySheet.jsx'
import FocusedNoteEditor from '../FocusedNoteEditor.jsx'

const SCROLL_THROTTLE_MS = 200

// Mobility/cooldown/conditioning always carry zero completable units (no
// completion tracking exists for them at all — schema §6). Treating THAT
// as "incomplete" would make a Warm-up block permanently win the
// first-incomplete slot and Strength/Core would never auto-open. Only
// strength/core blocks are considered here; a mobility/conditioning-only
// day (no strength/core block at all) falls back to opening block 0.
function firstIncompleteBlockIndex(dayBlocks, itemStateById) {
    const blocks = dayBlocks || []
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]
        if (block.kind !== 'strength' && block.kind !== 'core') continue
        let units = 0
        let done = 0
        for (const item of block.items || []) {
            const performed = itemStateById[item.id] || {}
            const result = itemCompleteness(block.kind, item, performed)
            units += result.units
            done += Math.min(result.done, result.units)
        }
        if (units === 0 || done < units) return i
    }
    return 0
}

export default function CartridgeToday() {
    const {
        ownerUserId, autosaveEnabled, immediateTick, draftCreatedAt, draftLifecycleKey,
        activeDraftKind, setActiveDraftKind,
        cartridgeId, setCartridgeId, cartridgeVersion, setCartridgeVersion,
        cartridgeSchemaVersion, setCartridgeSchemaVersion,
        cartridgeDay, setCartridgeDay, cartridgePhaseId, setCartridgePhaseId,
        startedAt, setStartedAt, cartridgeFrozenDay, setCartridgeFrozenDay,
        itemStateById, setItemStateById, substitutions, setSubstitutions, itemNotes, setItemNotes,
        cartridgeNotes, setCartridgeNotes, customSessionContent, setCustomSessionContent,
        sessionDuration, setSessionDuration, sessionActivities, setSessionActivities,
        otherActivity, setOtherActivity,
        cartridgeBlockOpen, setCartridgeBlockOpen, cartridgeScrollY, setCartridgeScrollY,
        discardAndResetActiveWorkout, logCartridgeSession,
    } = useDB()

    const { activeCartridge } = useCartridgeAccess()

    const cycleBlocks = Array.isArray(activeCartridge?.cycle?.blocks) ? activeCartridge.cycle.blocks : []
    const phaseBlock = cycleBlocks.length === 1 ? cycleBlocks[0] : null
    const multiPhaseUnsupported = cycleBlocks.length >= 2

    // Non-default proof (never trust activeDraftKind's inert default):
    // 'cartridge' is set ONLY by handleStart below or resumeDraft()'s
    // cartridge branch — both real signals of intent.
    const cartridgeActive = activeDraftKind === 'cartridge' && cartridgeId != null

    // ── discrete-action tick (mirrors DBProvider's immediateTick idiom) ──
    const [localTick, setLocalTick] = useState(0)
    const bumpImmediate = useCallback(() => setLocalTick((t) => t + 1), [])

    // ── logged sessions (day suggestion, category default, recall) ──
    const [allSessions, setAllSessions] = useState(null)
    useEffect(() => {
        let cancelled = false
        db.sessions.toArray()
            .then((rows) => { if (!cancelled) setAllSessions(rows) })
            .catch(() => { if (!cancelled) setAllSessions([]) })
        return () => { cancelled = true }
    }, [draftLifecycleKey])

    const getLastPerformance = useCallback((itemId) => {
        if (!allSessions || !activeCartridge) return null
        return findLastPerformance(allSessions, { cartridgeId: activeCartridge.cartridgeId, itemId })
    }, [allSessions, activeCartridge])

    // ── pre-Start day selection (idle state) ──
    const [selectedDay, setSelectedDay] = useState(null)
    const [daySheetOpen, setDaySheetOpen] = useState(false)

    useEffect(() => {
        setSelectedDay(null) // a new cartridge or a fresh lifecycle drops any stale pre-Start pick
    }, [activeCartridge?.cartridgeId, draftLifecycleKey])

    const suggestedDay = useMemo(() => {
        if (!activeCartridge || !allSessions) return null
        return suggestNextDayTemplate(activeCartridge, allSessions)
    }, [activeCartridge, allSessions])

    const effectiveSelectedDay = selectedDay ?? suggestedDay
    const selectableDays = useMemo(
        () => (activeCartridge ? listSelectableDays(activeCartridge) : []),
        [activeCartridge],
    )
    const selectedDayDef = useMemo(
        () => activeCartridge?.days?.find((d) => d.day === effectiveSelectedDay) || null,
        [activeCartridge, effectiveSelectedDay],
    )

    // The definition actually rendered: frozen once a workout is active
    // (Start or Continue — see db/index.jsx's cartridgeFrozenDay note),
    // otherwise the not-yet-started selected day.
    const day = cartridgeActive ? cartridgeFrozenDay : selectedDayDef
    const dayType = day?.type || 'training'

    // ── category resolution (D11 §3) ──
    const [categorySheetOpen, setCategorySheetOpen] = useState(false)
    const [chosenCategory, setChosenCategory] = useState(null)
    useEffect(() => { setChosenCategory(null) }, [draftLifecycleKey])

    const categoryDefault = useMemo(() => {
        if (!allSessions || !cartridgeId || cartridgeDay == null) return null
        return defaultCategoryFor({ sessions: allSessions, cartridgeId, dayTemplateKey: `day:${cartridgeDay}` })
    }, [allSessions, cartridgeId, cartridgeDay])

    // ── cartridge draft autosave (A7a integration made real) ──
    const cartridgeFields = useMemo(() => ({
        itemStateById, substitutions, itemNotes, notes: cartridgeNotes,
        customSessionContent, sessionDuration, sessionActivities, otherActivity,
        startedAt, blockOpen: cartridgeBlockOpen, scrollY: cartridgeScrollY,
    }), [itemStateById, substitutions, itemNotes, cartridgeNotes, customSessionContent,
        sessionDuration, sessionActivities, otherActivity, startedAt, cartridgeBlockOpen, cartridgeScrollY])

    const { flushNow: flushCartridgeDraftNow, status: cartridgeDraftSaveStatus } = useWorkoutDraftPersistence({
        enabled: autosaveEnabled,
        ownerUserId,
        kind: 'cartridge',
        cartridgeId, cartridgeVersion, cartridgeSchemaVersion, cartridgeDay, cartridgePhaseId,
        workout: cartridgeFrozenDay,
        fields: cartridgeFields,
        immediateTick: localTick,
        initialCreatedAt: draftCreatedAt,
        lifecycleKey: draftLifecycleKey,
    })

    // ── save-state honesty (corrective plan §9, finding J3) ──
    // The controller's bare 'idle' status is ambiguous — it means EITHER
    // "nothing has ever been saved yet" or "the last save succeeded", and
    // the module-scope controller has no memory of which. `hasSavedOnce`
    // proves it: true immediately when resuming an EXISTING draft
    // (draftCreatedAt already set by resumeDraft — a row is known to exist),
    // or the first time a 'saving' -> 'idle' transition is actually observed
    // for THIS active workout. Reset false on every fresh lifecycle so a new
    // workout never inherits the previous one's proof.
    const [hasSavedOnce, setHasSavedOnce] = useState(Boolean(draftCreatedAt))
    useEffect(() => {
        setHasSavedOnce(Boolean(draftCreatedAt))
    }, [draftLifecycleKey, draftCreatedAt])
    const prevSaveStatusRef = useRef(cartridgeDraftSaveStatus?.status)
    useEffect(() => {
        const prevStatus = prevSaveStatusRef.current
        const currStatus = cartridgeDraftSaveStatus?.status
        if (prevStatus === 'saving' && currStatus === 'idle') setHasSavedOnce(true)
        prevSaveStatusRef.current = currStatus
    }, [cartridgeDraftSaveStatus?.status])
    const saveLabel = mapSaveStatusToLabel({
        status: cartridgeDraftSaveStatus?.status || 'idle',
        hasKnownPersistedRow: hasSavedOnce,
    })

    // ── scroll — throttled continuous updates, not just flush-on-unmount
    // (corrective plan §4: keeps cartridgeScrollY "reasonably current
    // continuously", correcting the first attempt's absent restoration) ──
    const lastScrollWriteRef = useRef(0)
    useEffect(() => {
        if (!cartridgeActive) return
        let frame = null
        const handleScroll = () => {
            const now = Date.now()
            if (now - lastScrollWriteRef.current < SCROLL_THROTTLE_MS) return
            lastScrollWriteRef.current = now
            if (frame) return
            frame = window.requestAnimationFrame(() => {
                setCartridgeScrollY(window.scrollY)
                frame = null
            })
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', handleScroll)
            setCartridgeScrollY(window.scrollY)
        }
    }, [cartridgeActive, setCartridgeScrollY])

    useLayoutEffect(() => {
        if (cartridgeActive && cartridgeScrollY > 0) window.scrollTo(0, cartridgeScrollY)
        // Only on mount of the active view — deliberately no cartridgeScrollY
        // dependency beyond the initial read, or every throttled write above
        // would re-trigger a scrollTo and fight the user's own scrolling.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartridgeActive])

    // ── collapse initialization — transition-safe (D11 point 7) ──
    // Applied ONCE inside handleStart (fresh) by writing a real, explicit
    // entry into cartridgeBlockOpen — never recomputed on remount. Continue
    // already restores the persisted map verbatim via resumeDraft(). Absence
    // from the map (any index the user or this effect hasn't touched) always
    // renders collapsed by default (see TodayBlock's `open` prop below).
    const prevBlockCompletionRef = useRef(null)
    // A7b corrective pass (finding J9): tracks which frozen `day` object this
    // ref's completion snapshot was seeded for — `day` is referentially
    // stable for the whole active session (frozen once at Start/Continue),
    // so a change of reference means a genuinely NEW workout became active.
    const seededDayRef = useRef(null)
    useEffect(() => {
        if (!cartridgeActive || dayType !== 'training' || !Array.isArray(day?.blocks)) return
        const nextCompletion = {}
        day.blocks.forEach((block, i) => {
            let units = 0
            let done = 0
            for (const item of block.items || []) {
                const performed = itemStateById[item.id] || {}
                const result = itemCompleteness(block.kind, item, performed)
                units += result.units
                done += Math.min(result.done, result.units)
            }
            nextCompletion[i] = units > 0 && done >= units
        })

        // Seed transition tracking from the CURRENT completion state the
        // FIRST time this effect runs for this active day — otherwise a
        // component remount (a Today<->Plan/Library tab switch, or Continue)
        // compares against an EMPTY prior map and misreads an
        // already-complete block as "just completed", spuriously
        // auto-expanding the next block even though nothing changed.
        if (seededDayRef.current !== day) {
            seededDayRef.current = day
            prevBlockCompletionRef.current = nextCompletion
            return
        }

        const prev = prevBlockCompletionRef.current || {}
        Object.keys(nextCompletion).forEach((key) => {
            const i = Number(key)
            const justCompleted = nextCompletion[i] && !prev[i]
            const nextIndex = i + 1
            if (justCompleted && nextIndex < day.blocks.length && !(nextIndex in cartridgeBlockOpen)) {
                setCartridgeBlockOpen((prevMap) => ({ ...prevMap, [nextIndex]: true }))
            }
        })
        prevBlockCompletionRef.current = nextCompletion
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartridgeActive, dayType, day, itemStateById])

    const handleToggleBlock = useCallback((index) => {
        setCartridgeBlockOpen((prev) => ({ ...prev, [index]: !prev[index] }))
    }, [setCartridgeBlockOpen])

    // ── Start ──
    const handleStart = useCallback(() => {
        if (!activeCartridge || effectiveSelectedDay == null || !selectedDayDef) return
        setCartridgeId(activeCartridge.cartridgeId)
        setCartridgeVersion(activeCartridge.cartridgeVersion)
        setCartridgeSchemaVersion(activeCartridge.schemaVersion)
        setCartridgeDay(effectiveSelectedDay)
        setCartridgePhaseId(phaseBlock ? phaseBlock.id : null)
        setCartridgeFrozenDay(selectedDayDef)
        setStartedAt(new Date().toISOString())
        const openIndex = selectedDayDef.type === 'training'
            ? firstIncompleteBlockIndex(selectedDayDef.blocks, {})
            : 0
        setCartridgeBlockOpen({ [openIndex]: true })
        setCartridgeScrollY(0)
        setActiveDraftKind('cartridge')
        // A7b corrective pass (finding J2): pressing Start is a discrete
        // action, not a text edit — trigger the SAME immediate-persistence
        // mechanism discrete actions already use (bumpImmediate -> localTick
        // -> useWorkoutDraftPersistence's isImmediate branch ->
        // controller.saveNow()) rather than waiting on the 700ms text
        // debounce, so a reload immediately after Start still finds a
        // durable row with the frozen day and true start time intact.
        bumpImmediate()
    }, [activeCartridge, effectiveSelectedDay, selectedDayDef, phaseBlock,
        setCartridgeId, setCartridgeVersion, setCartridgeSchemaVersion, setCartridgeDay,
        setCartridgePhaseId, setCartridgeFrozenDay, setStartedAt, setCartridgeBlockOpen,
        setCartridgeScrollY, setActiveDraftKind, bumpImmediate])

    // ── item mutators ──
    // Coerced through the SAME coerceNumericField the payload builder uses
    // (never a separate, possibly-drifting parser) so a numeric-looking
    // typed value is a real number the moment it's stored — both
    // TodayHeader/CompletenessBar's live progress (which reads itemStateById
    // directly and, like the stored payload, requires an actual `number`,
    // not a numeric-LOOKING string) and the eventual Finish payload agree.
    // A non-numeric typo still survives verbatim (never silently dropped),
    // exactly per coerceNumericField's own contract.
    const onSetField = useCallback((itemId, setIndex, field, value) => {
        setItemStateById((prev) => {
            const entry = prev[itemId] || {}
            const sets = Array.isArray(entry.sets) ? [...entry.sets] : []
            sets[setIndex] = { ...sets[setIndex], [field]: coerceNumericField(value) }
            return { ...prev, [itemId]: { ...entry, sets } }
        })
    }, [setItemStateById])

    const onPairSetField = useCallback((itemId, setIndex, field, value) => {
        setItemStateById((prev) => {
            const entry = prev[itemId] || {}
            const pairSets = Array.isArray(entry.pair?.sets) ? [...entry.pair.sets] : []
            pairSets[setIndex] = { ...pairSets[setIndex], [field]: coerceNumericField(value) }
            return { ...prev, [itemId]: { ...entry, pair: { ...entry.pair, sets: pairSets } } }
        })
    }, [setItemStateById])

    const onAddSet = useCallback((itemId) => {
        setItemStateById((prev) => {
            const entry = prev[itemId] || {}
            const sets = Array.isArray(entry.sets) ? [...entry.sets, {}] : [{}]
            return { ...prev, [itemId]: { ...entry, sets } }
        })
        bumpImmediate()
    }, [setItemStateById, bumpImmediate])

    // ── extra-set removal (Android acceptance remediation plan §3.2/§4.2) ──
    // The inverse of onAddSet. Writes ONLY the targeted item's existing sets
    // array, through the same setItemStateById path — no new state, no
    // payload/completeness change (completeness stays capped at prescribed
    // sets either way). The pure helper owns the safety invariant: a
    // prescribed/out-of-range index is refused here even if a caller passes
    // one, and a refused removal never ticks the draft.
    const onRemoveSet = useCallback((itemId, setIndex, prescribedSets) => {
        const current = itemStateById[itemId] || {}
        if (!removeExtraSetAtIndex(current.sets, prescribedSets, setIndex).removed) return
        setItemStateById((prev) => {
            const entry = prev[itemId] || {}
            const result = removeExtraSetAtIndex(entry.sets, prescribedSets, setIndex)
            if (!result.removed) return prev
            return { ...prev, [itemId]: { ...entry, sets: result.sets } }
        })
        bumpImmediate()
    }, [itemStateById, setItemStateById, bumpImmediate])

    const onAddRound = useCallback((itemIds) => {
        setItemStateById((prev) => {
            const next = { ...prev }
            for (const itemId of itemIds) {
                const entry = next[itemId] || {}
                const sets = Array.isArray(entry.sets) ? [...entry.sets, {}] : [{}]
                next[itemId] = { ...entry, sets }
            }
            return next
        })
        bumpImmediate()
    }, [setItemStateById, bumpImmediate])

    const onUseLastValues = useCallback((itemId, sets) => {
        setItemStateById((prev) => {
            const entry = prev[itemId] || {}
            return { ...prev, [itemId]: { ...entry, sets: [...sets] } }
        })
        bumpImmediate()
    }, [setItemStateById, bumpImmediate])

    const onSubstitute = useCallback((itemId, name) => {
        setSubstitutions((prev) => {
            const next = { ...prev }
            if (name && name.trim() !== '') next[itemId] = name.trim()
            else delete next[itemId]
            return next
        })
        bumpImmediate()
    }, [setSubstitutions, bumpImmediate])

    const onItemNote = useCallback((itemId, note) => {
        setItemNotes((prev) => ({ ...prev, [itemId]: note }))
    }, [setItemNotes])

    const onToggleActivity = useCallback((id) => {
        setSessionActivities((prev) => (
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
        ))
        bumpImmediate()
    }, [setSessionActivities, bumpImmediate])

    // ── Finish (training/custom, after Start) ──
    const [logPending, setLogPending] = useState(false)
    const [logError, setLogError] = useState(null)
    const [effortGuideOpen, setEffortGuideOpen] = useState(false)

    // A7b corrective pass (finding B/Step 1): CartridgeToday builds ONLY the
    // raw input (utils/cartridgeLogInput.js — the exact same helper the test
    // suite exercises) and hands it to the PROVIDER-owned
    // logCartridgeSession, which owns the canonical sessionId, building,
    // validation, and the commit. No sessionId, no built payload, and no
    // direct validateCartridgeSessionPayload call happen here anymore — the
    // provider is now the single owner of that boundary (finding B1/B2/B3).
    //
    // The pre-log durability gate is preserved EXACTLY: flushCartridgeDraftNow()
    // runs first; if it fails, logCartridgeSession is never called at all —
    // no validation, no transaction, no reset, and the latest recoverable
    // draft stays intact.
    const finishWithCategory = useCallback(async (category) => {
        setLogError(null)
        setLogPending(true)
        try {
            const flushed = await flushCartridgeDraftNow()
            if (!flushed) { setLogError('Could not save your latest changes. Try again.'); return }

            const rawInput = buildTrainingOrCustomLogInput({
                startedAt, cartridgeId, cartridgeVersion, cartridgeSchemaVersion, cartridgeDay,
                day, dayType, cartridgePhaseId, itemStateById, substitutions, itemNotes,
                cartridgeNotes, sessionActivities, otherActivity, sessionDuration, customSessionContent,
                category,
            })

            await logCartridgeSession(rawInput)
        } catch (err) {
            console.error('cartridge log failed', err)
            if (err instanceof CartridgeValidationError) {
                setLogError(describeCartridgeValidationError(err.errors))
            } else {
                setLogError('Could not log this session. Try again.')
            }
        } finally {
            setLogPending(false)
        }
    }, [flushCartridgeDraftNow, startedAt, cartridgeId, cartridgeVersion, cartridgeSchemaVersion,
        cartridgeDay, day, dayType, cartridgePhaseId, itemStateById, substitutions, itemNotes,
        cartridgeNotes, sessionActivities, otherActivity, sessionDuration, customSessionContent, logCartridgeSession])

    const handleFinish = useCallback(() => {
        if (!day || !cartridgeActive) return
        const fixed = fixedCategoryForDayType(dayType)
        const category = fixed || chosenCategory
        if (category) finishWithCategory(category)
        else setCategorySheetOpen(true)
    }, [day, cartridgeActive, dayType, chosenCategory, finishWithCategory])

    const handleCategoryChosen = useCallback((category) => {
        setChosenCategory(category)
        setCategorySheetOpen(false)
        finishWithCategory(category)
    }, [finishWithCategory])

    // ── one-tap rest/recovery log from the idle state ──
    // No active draft exists yet at this point (Start was never pressed),
    // so there is nothing to flush first — the raw input goes straight to
    // the provider.
    const handleOneTapLog = useCallback(async () => {
        if (!activeCartridge || effectiveSelectedDay == null || !selectedDayDef) return
        const category = fixedCategoryForDayType(selectedDayDef.type)
        if (!category) return
        setLogError(null)
        setLogPending(true)
        try {
            const rawInput = buildRestOrRecoveryLogInput({ activeCartridge, effectiveSelectedDay, selectedDayDef, phaseBlock, category })
            await logCartridgeSession(rawInput)
        } catch (err) {
            console.error('cartridge one-tap log failed', err)
            if (err instanceof CartridgeValidationError) {
                setLogError(describeCartridgeValidationError(err.errors))
            } else {
                setLogError('Could not log this. Try again.')
            }
        } finally {
            setLogPending(false)
        }
    }, [activeCartridge, effectiveSelectedDay, selectedDayDef, phaseBlock, logCartridgeSession])

    // ── Reset — BottomSheet confirmation (corrective plan §4), never confirm() ──
    const [resetSheetOpen, setResetSheetOpen] = useState(false)
    const [resetPending, setResetPending] = useState(false)
    const [resetError, setResetError] = useState(null)

    const handleReset = useCallback(async () => {
        setResetError(null)
        setResetPending(true)
        try {
            await discardAndResetActiveWorkout()
            setResetSheetOpen(false)
        } catch (err) {
            console.error('reset failed', err)
            setResetError('Could not discard the saved workout. Try again.')
        } finally {
            setResetPending(false)
        }
    }, [discardAndResetActiveWorkout])

    if (multiPhaseUnsupported) {
        return (
            <div className="app"><main className="content">
                <div className="library-state" role="status">
                    <div className="library-state__title">This program isn't supported yet</div>
                    <div className="library-state__copy">
                        Multi-phase programs aren't runnable in Today yet — Plan and Library still work normally.
                    </div>
                </div>
            </main></div>
        )
    }

    // ── idle/start state — no active workout yet ──
    if (!cartridgeActive) {
        const isRestOrRecovery = selectedDayDef && (selectedDayDef.type === 'rest' || selectedDayDef.type === 'recovery')
        return (
            <div className="app">
                <header className="page-header"><h1>⚔️ Today</h1><div className="subtitle">{activeCartridge.label}</div></header>
                <main className="content">
                    {phaseBlock && <div className="badge badge-dim" style={{ alignSelf: 'flex-start' }}>{phaseBlock.label}</div>}
                    {selectedDayDef && (
                        <div className="today-suggestion">
                            <div className="today-suggestion__kicker">{selectedDay == null ? 'Suggested' : 'Selected'}</div>
                            <div className="today-suggestion__label">{selectedDayDef.label}</div>
                            {selectedDayDef.focus && <div className="today-suggestion__focus">{selectedDayDef.focus}</div>}
                        </div>
                    )}
                    <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setDaySheetOpen(true)}>
                        Choose a different day
                    </button>

                    {logError && <div className="draft-banner"><div className="draft-banner__title">{logError}</div></div>}

                    <div className="actions-bar">
                        {isRestOrRecovery ? (
                            <button type="button" className="btn-primary" onClick={handleOneTapLog} disabled={logPending}>
                                {logPending ? 'Logging…' : `▶ LOG ${selectedDayDef.type === 'rest' ? 'REST' : 'RECOVERY'} DAY`}
                            </button>
                        ) : (
                            <button type="button" className="btn-primary" onClick={handleStart} disabled={!selectedDayDef}>
                                ▶ START
                            </button>
                        )}
                    </div>

                    <DaySelectSheet
                        open={daySheetOpen} onClose={() => setDaySheetOpen(false)}
                        days={selectableDays} suggestedDay={suggestedDay}
                        onChoose={(dayNum) => setSelectedDay(dayNum)}
                    />
                </main>
            </div>
        )
    }

    // ── active workout ──
    if (!day) return null // frozen day not yet available this render — resolves next tick

    const liveCompleteness = dayType === 'training' ? liveCartridgeCompleteness(day.blocks, itemStateById, dayType) : null

    return (
        <div className="app">
            {/* today-active scopes the A7b Training-mode surface pass
                (index.css) to THIS active-workout view only — Plan/Library's
                read-only .cartridge-block renderer shares the class names and
                must stay visually untouched. */}
            <main className="content today-active">
                <TodayHeader
                    day={day}
                    itemStateById={itemStateById}
                    saveLabel={saveLabel}
                    saveStatusKind={cartridgeDraftSaveStatus?.status || 'idle'}
                    onRetry={flushCartridgeDraftNow}
                    phaseLabel={phaseBlock?.label}
                />

                {day.focus && <div className="today-day-focus">{day.focus}</div>}

                {dayType === 'training' && (
                    <button type="button" className="today-item__action-btn today-item__action-btn--wide" onClick={() => setEffortGuideOpen(true)}>
                        What do RPE / RIR / %1RM mean?
                    </button>
                )}

                {dayType === 'training' && Array.isArray(day.blocks) && day.blocks.map((block, i) => (
                    <TodayBlock
                        key={i}
                        block={block}
                        open={Boolean(cartridgeBlockOpen[i])}
                        onToggle={() => handleToggleBlock(i)}
                        itemStateById={itemStateById} substitutions={substitutions} itemNotes={itemNotes}
                        getLastPerformance={getLastPerformance}
                        onSetField={onSetField}
                        onPairSetField={onPairSetField}
                        onAddSet={onAddSet}
                        onRemoveSet={onRemoveSet}
                        onAddRound={onAddRound}
                        onUseLastValues={onUseLastValues}
                        onSubstitute={onSubstitute}
                        onItemNote={onItemNote}
                    />
                ))}

                {dayType === 'training' && liveCompleteness !== null && <CompletenessBar pct={liveCompleteness} />}

                {dayType === 'custom' && (
                    <div className="card" style={{ padding: 14 }}>
                        <label className="sheet-form__label" htmlFor="today-custom-content">
                            What did you do?
                            <textarea
                                id="today-custom-content" rows={4}
                                value={customSessionContent}
                                onChange={(e) => setCustomSessionContent(e.target.value)}
                                placeholder="6 rounds sparring, 3 rounds pads"
                            />
                        </label>
                        <label className="sheet-form__label" htmlFor="today-custom-duration" style={{ marginTop: 10 }}>
                            Duration (minutes)
                            <input
                                id="today-custom-duration" type="number" inputMode="numeric" min="0" step="1" pattern="[0-9]*"
                                value={sessionDuration}
                                onChange={(e) => setSessionDuration(e.target.value)}
                                onKeyDown={(e) => {
                                    // Constrains ENTRY toward a valid integer (corrective plan §9,
                                    // finding J8) without ever repairing a value already present —
                                    // a pasted "75.5" still reaches the validator untouched, which
                                    // stays the final authority (see describeCartridgeValidationError).
                                    if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault()
                                }}
                            />
                        </label>
                    </div>
                )}

                <SessionSummary
                    sessionActivities={sessionActivities}
                    onToggleActivity={onToggleActivity}
                    otherActivity={otherActivity}
                    onOtherActivityChange={setOtherActivity}
                    notes={cartridgeNotes}
                    onNotesChange={setCartridgeNotes}
                />

                {logError && <div className="draft-banner"><div className="draft-banner__title">{logError}</div></div>}
                {resetError && <div className="draft-banner"><div className="draft-banner__title">{resetError}</div></div>}

                <button
                    type="button"
                    className="today-item__action-btn today-reset-trigger"
                    onClick={() => setResetSheetOpen(true)}
                >
                    Discard this workout
                </button>

                {/* Spacer so content isn't hidden behind the fixed safe-actions bar below */}
                <div className="today-safe-actions-spacer" aria-hidden="true" />
                <div className="today-safe-actions">
                    <button type="button" className="btn-primary" onClick={handleFinish} disabled={logPending}>
                        {logPending ? 'LOGGING…' : '▶ FINISH'}
                    </button>
                </div>

                <CategorySheet
                    open={categorySheetOpen} onClose={() => setCategorySheetOpen(false)}
                    onChoose={handleCategoryChosen} defaultCategory={categoryDefault}
                />
                <EffortGuideSheet open={effortGuideOpen} onClose={() => setEffortGuideOpen(false)} />
                <BottomSheet open={resetSheetOpen} onClose={() => !resetPending && setResetSheetOpen(false)} title="Discard this workout?">
                    <p className="sheet__copy">
                        This clears everything entered for today's session. Prescribed content is not affected.
                    </p>
                    <button type="button" className="btn-secondary" disabled={resetPending} onClick={() => setResetSheetOpen(false)}>
                        Keep workout
                    </button>
                    <button type="button" className="sheet__action destructive" disabled={resetPending} onClick={handleReset}>
                        {resetPending ? 'Discarding…' : 'Discard'}
                    </button>
                </BottomSheet>
            </main>
        </div>
    )
}
