/**
 * db/index.js — IndexedDB layer using Dexie.js
 *
 * Tables:
 *   sessions   — logged workout sessions (source of truth, local)
 *   syncQueue  — sessions pending push to Google Sheets webhook
 *   settings   — app config (currentPhase, webhookUrl)
 *
 * In-memory shared state (not persisted to Dexie):
 *   activeWorkout — current HUD session inputs (survives tab switches)
 *   timerState    — stopwatch + countdown state (survives tab switches)
 */

import Dexie from 'dexie'
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import useRoundsTimer from '../hooks/useRoundsTimer.js'
import { normalizeBlockOrder, moveBlock } from '../utils/blockOrder.js'
import { trySyncQueue, enqueueSync, initSyncListeners } from '../sync/syncQueue.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { workoutDraftController, loadActiveDraft, commitLoggedSession } from './workoutDrafts.js'
import {
    classifyHydratedDraft, parseLegacyDay, parseLegacyPhase,
    buildLegacyIdentity, pickFields, LEGACY_STATE_FIELD_KEYS,
} from '../utils/workoutDraftState.js'

// Re-export for backward compatibility (syncQueue.test.js and any external
// consumer importing trySyncQueue from db/index.jsx keep working unchanged).
export { trySyncQueue }

// ─── Database definition ──────────────────────────────────────────────────────
const db = new Dexie('FightersOS')

db.version(1).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key'
})

// W21 — Checklist hub stores. ADDITIVE ONLY: the v1 tables are restated
// verbatim (Dexie requires the full schema at each version; omitting a table
// would drop it and destroy real data). No .upgrade() callback is needed —
// unchanged tables are untouched by Dexie's migration. The checklist is
// LOCAL-ONLY: nothing here ever reaches syncQueue or the webhook.
db.version(2).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key',
    checklistGroups: 'id, order',
    checklistTasks: 'id, groupId, [groupId+order], deletedAt',
    checklistCompletions: '[taskId+date], taskId'
})

// W23 — Notes hub stores. ADDITIVE ONLY, same discipline as v2: every prior
// table restated verbatim (omitting one would drop it and destroy real
// data), no .upgrade() callback needed — unchanged tables are untouched by
// Dexie's migration. `*tags` is a multiEntry index over the per-note tags
// array (the app-wide normalized-tag convention). Notes are LOCAL-ONLY:
// nothing here ever reaches syncQueue or the webhook.
db.version(3).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key',
    checklistGroups: 'id, order',
    checklistTasks: 'id, groupId, [groupId+order], deletedAt',
    checklistCompletions: '[taskId+date], taskId',
    noteGroups: 'id, order',
    notes: 'id, groupId, deletedAt, *tags'
})

// A6.5 — durable active-workout draft store. ADDITIVE ONLY, same discipline
// as v2/v3: every prior table restated verbatim (omitting one would drop
// it and destroy real data), no .upgrade() callback needed. One row per
// owner (`slot` is always 'active' today — reserved for future use), keyed
// by the compound primary key so a signed-out owner's row can never be
// hydrated under a different identity. workoutDrafts is LOCAL-ONLY and
// temporary: it never reaches syncQueue or the webhook, and is deleted on
// discard, successful log, or sign-out (see db/workoutDrafts.js).
db.version(4).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key',
    checklistGroups: 'id, order',
    checklistTasks: 'id, groupId, [groupId+order], deletedAt',
    checklistCompletions: '[taskId+date], taskId',
    noteGroups: 'id, order',
    notes: 'id, groupId, deletedAt, *tags',
    workoutDrafts: '[ownerUserId+slot], ownerUserId, updatedAt'
})

export { db }

// ─── Default settings ─────────────────────────────────────────────────────────
const DEFAULTS = {
    currentPhase: 1,
    webhookUrl: 'https://script.google.com/macros/s/AKfycbx420QcMFL2zsMYJBPSEp-ZQYHovr-V9lvQvPXcZnibv_iyOmW44IqOCwSAP89It0eG/exec',
    appName: "Fighter's OS",
    appSubtitle: "Combat Performance",
    dailyIgnitionEnabled: true
}

export async function getSetting(key) {
    const row = await db.settings.get(key)
    return row ? row.value : DEFAULTS[key]
}

async function setSetting(key, value) {
    await db.settings.put({ key, value })
}

// ─── Active workout defaults ───────────────────────────────────────────────────
const WORKOUT_DEFAULTS = {
    day: 1,
    hipScore: 3,
    hudScrollY: 0,
    mobChecked: {},
    strSets: {},
    coreSets: {},
    clrChecked: {},
    bagRounds: '',
    bagCourse: '',
    bagModules: '',
    bagWorkouts: '',
    notes: '',
    gymSessionType: 'Combat',
    altRows: [],
    altDuration: '',
    // W10 — UI-only collapse state for the collapsible HUD blocks.
    // Lives here (not in HUD/BagBlock/CoreBlock) so it survives the full
    // unmount HUD goes through on tab/hub switches, exactly like hudScrollY.
    // Never read by logSession/completeness — cannot reach the webhook payload.
    bagBlockOpen: false,
    coreBlockOpen: false,
    // W10.1 — mobility/strength/cooldown are the day's core work, so they
    // default OPEN (bag/core above stay default collapsed). Same UI-only
    // guarantees as the W10 fields.
    mobBlockOpen: true,
    strBlockOpen: true,
    clrBlockOpen: true
}

// ─── Context ──────────────────────────────────────────────────────────────────
const DBContext = createContext(null)

/**
 * DBProvider — wraps the app and provides DB access via useDB()
 */
export function DBProvider({ children }) {
    // ── A6.5 — owner resolution ────────────────────────────────────────────────
    // AuthProvider wraps App in main.jsx, so DBProvider (nested under
    // AuthGate/CartridgeAccessProvider) is a descendant of its context.
    // AuthGate renders only <SignIn/> while !user, so DBProvider never
    // mounts without a resolved (online or validated-offline) owner.
    const { user } = useAuth()
    const ownerUserId = user?.id ?? null

    // ── Persistent DB-backed state ─────────────────────────────────────────────
    const [phase, _setPhase] = useState(1)
    const [appName, _setAppName] = useState(DEFAULTS.appName)
    const [appSubtitle, _setAppSubtitle] = useState(DEFAULTS.appSubtitle)
    const [dailyIgnitionEnabled, _setDailyIgnitionEnabled] = useState(DEFAULTS.dailyIgnitionEnabled)
    const [bookmarkedIgnitions, setBookmarkedIgnitions] = useState([])
    const [ignitionHasShown, setIgnitionHasShown] = useState(false)
    const [pendingSync, setPending] = useState(0)
    const [sessionCount, setCount] = useState({}) // { 1: n, 2: n, 3: n }
    const [ready, setReady] = useState(false)
    // W23.5 — persistent-storage status: null = unknown/checking,
    // true = PERSISTENT granted, false = best-effort (or API unavailable).
    const [storagePersisted, setStoragePersisted] = useState(null)

    // ── A6.5 — durable active-workout draft state ──────────────────────────────
    // draftPhase: 'idle' (no owner yet) | 'hydrating' | 'ready'.
    // continueDraft: a validated, hydratable row offered as "Continue" —
    //   NOT yet applied to live state (resumeDraft() does that explicitly).
    // draftIssue: { reason } for a PRESERVED but unhydratable row (unsupported
    //   schema/state, or corrupt) — never exposes row contents.
    // Autosave stays OFF while either is set, so a fresh save can never
    // silently overwrite a row the user hasn't explicitly resolved yet.
    const [draftPhase, setDraftPhase] = useState('idle')
    const [continueDraft, setContinueDraft] = useState(null)
    const [draftIssue, setDraftIssue] = useState(null)
    const [draftCreatedAt, setDraftCreatedAt] = useState(null)
    // Bumped by retryHydration() to re-run the hydration effect after a
    // read failure — the effect's own deps ([ownerUserId]) don't change on
    // retry, so this is what actually triggers the re-attempt.
    const [hydrationRetryKey, setHydrationRetryKey] = useState(0)
    // Bumped whenever the active-workout lifecycle resets (log success /
    // manual reset), so useWorkoutDraftPersistence knows to start a fresh
    // createdAt for the next draft rather than reusing the old one.
    const [draftLifecycleKey, setDraftLifecycleKey] = useState(0)
    // Bumped by discrete-action setters (checks) so the persistence hook can
    // tell "checkbox tap — save now" apart from "text edit — debounce".
    const [immediateTick, setImmediateTick] = useState(0)

    const autosaveEnabled = draftPhase === 'ready' && !continueDraft && !draftIssue

    // ── In-memory active workout state (not persisted to Dexie) ───────────────
    const [day, setDay] = useState(WORKOUT_DEFAULTS.day)
    const [hipScore, setHipScore] = useState(WORKOUT_DEFAULTS.hipScore)
    const [hudScrollY, setHudScrollY] = useState(WORKOUT_DEFAULTS.hudScrollY)
    const [mobChecked, setMobChecked] = useState(WORKOUT_DEFAULTS.mobChecked)
    const [strSets, setStrSets] = useState(WORKOUT_DEFAULTS.strSets)
    const [coreSets, setCoreSets] = useState(WORKOUT_DEFAULTS.coreSets)
    const [clrChecked, setClrChecked] = useState(WORKOUT_DEFAULTS.clrChecked)
    const [bagRounds, setBagRounds] = useState(WORKOUT_DEFAULTS.bagRounds)
    const [bagCourse, setBagCourse] = useState(WORKOUT_DEFAULTS.bagCourse)
    const [bagModules, setBagModules] = useState(WORKOUT_DEFAULTS.bagModules)
    const [bagWorkouts, setBagWorkouts] = useState(WORKOUT_DEFAULTS.bagWorkouts)
    const [notes, setNotes] = useState(WORKOUT_DEFAULTS.notes)
    const [gymSessionType, setGymSessionType] = useState(WORKOUT_DEFAULTS.gymSessionType)
    const [altRows, setAltRows] = useState(WORKOUT_DEFAULTS.altRows)
    const [altDuration, setAltDuration] = useState(WORKOUT_DEFAULTS.altDuration)
    // W10 — UI-only collapse state (see WORKOUT_DEFAULTS note)
    const [bagBlockOpen, setBagBlockOpen] = useState(WORKOUT_DEFAULTS.bagBlockOpen)
    const [coreBlockOpen, setCoreBlockOpen] = useState(WORKOUT_DEFAULTS.coreBlockOpen)
    // W10.1 — same, for mobility/strength/cooldown (default open)
    const [mobBlockOpen, setMobBlockOpen] = useState(WORKOUT_DEFAULTS.mobBlockOpen)
    const [strBlockOpen, setStrBlockOpen] = useState(WORKOUT_DEFAULTS.strBlockOpen)
    const [clrBlockOpen, setClrBlockOpen] = useState(WORKOUT_DEFAULTS.clrBlockOpen)

    // ── In-memory timer state (not persisted to Dexie) ────────────────────────
    const [swTime, setSwTime] = useState(0)
    const [swRunning, setSwRunning] = useState(false)
    const [cdTime, setCdTime] = useState(0)
    const [cdRunning, setCdRunning] = useState(false)
    const [alertState, setAlertState] = useState('none')

    // Refs for intervals and audio — not React state, no serialisation needed
    const swIntervalRef = useRef(null)
    const swStartRef = useRef(0)       // timestamp anchor for accurate elapsed ms
    const cdIntervalRef = useRef(null)
    const audioRef = useRef(null)
    const interimAudioRef = useRef(null)
    const wakeLockRef = useRef(null)

    // ── Preload bell audio once at provider mount ─────────────────────────────
    useEffect(() => {
        audioRef.current = new Audio('/bell.mp3')
        audioRef.current.volume = 1.0
        interimAudioRef.current = new Audio('/bell-interim.mp3')
        interimAudioRef.current.volume = 1.0

        // Optional: unlock audio on first document click
        const unlockAudio = () => {
            if (audioRef.current) { audioRef.current.play().then(() => audioRef.current.pause()).catch(() => { }); }
            if (interimAudioRef.current) { interimAudioRef.current.play().then(() => interimAudioRef.current.pause()).catch(() => { }); }
            document.removeEventListener('click', unlockAudio)
        }
        document.addEventListener('click', unlockAudio)
        return () => document.removeEventListener('click', unlockAudio)
    }, [])

    // ── WakeLock helpers ──────────────────────────────────────────────────────
    const requestWakeLock = useCallback(async () => {
        try {
            if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock) {
                wakeLockRef.current = await navigator.wakeLock.request('screen')
            }
        } catch (err) {
            console.warn('WakeLock rejected or not supported:', err)
        }
    }, [])

    const releaseWakeLock = useCallback(() => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(console.warn)
            wakeLockRef.current = null
        }
    }, [])

    // ── Alarm (bell + vibrate + flash) ────────────────────────────────────────
    const triggerAlarm = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
        }
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([500, 200, 500])
            }
        } catch (e) {
            console.warn('Vibration not supported', e)
        }
        setAlertState('main')
        setTimeout(() => setAlertState(prev => prev === 'main' ? 'none' : prev), 800)
    }, [])

    const triggerInterimAlarm = useCallback(() => {
        if (interimAudioRef.current) {
            interimAudioRef.current.currentTime = 0
            interimAudioRef.current.play().catch(console.error)
        }
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([200]) // Short vibrate for interim
            }
        } catch (e) {
            console.warn('Vibration not supported', e)
        }
        setAlertState('interim')
        setTimeout(() => setAlertState(prev => prev === 'interim' ? 'none' : prev), 400)
    }, [])

    // ── Custom Rounds Timer ───────────────────────────────────────────────────
    const roundsTimer = useRoundsTimer({
        triggerMainAlarm: triggerAlarm,
        triggerInterimAlarm: triggerInterimAlarm,
        requestWakeLock,
        releaseWakeLock
    })

    const [savedRoundsSetups, setSavedRoundsSetups] = useState([])

    const saveRoundsSetup = useCallback(async (setup) => {
        setSavedRoundsSetups(prev => {
            if (prev.length >= 10) {
                alert("Maximum 10 saved setups reached. Please delete one first.");
                return prev;
            }
            const newSetups = [...prev, { ...setup, id: Date.now() }];
            setSetting('savedRoundsTimers', newSetups).catch(console.error);
            return newSetups;
        });
    }, []);

    const deleteRoundsSetup = useCallback(async (id) => {
        setSavedRoundsSetups(prev => {
            const newSetups = prev.filter(s => s.id !== id);
            setSetting('savedRoundsTimers', newSetups).catch(console.error);
            return newSetups;
        });
    }, []);

    // ── Basic Timer block order (W15) ─────────────────────────────────────────
    // LAYOUT ONLY: which order the Stopwatch / Rest Timer cards render in on
    // the Basic tab. The timers themselves tick in this provider regardless
    // of display position. Persisted in the settings table (fallback-on-read,
    // no eager write — same pattern as savedRoundsTimers above).
    const [basicTimerBlockOrder, setBasicTimerBlockOrder] = useState(() => normalizeBlockOrder(undefined))

    const moveBasicTimerBlock = useCallback((id, delta) => {
        setBasicTimerBlockOrder(prev => {
            const next = moveBlock(prev, id, delta)
            if (next !== prev) {
                setSetting('basicTimerBlockOrder', next).catch(console.error)
            }
            return next
        })
    }, [])

    // ── Stopwatch interval — runs in provider, survives tab unmount ───────────
    useEffect(() => {
        if (swRunning) {
            requestWakeLock()
            // Re-anchor start time against current swTime so pausing preserves progress
            swStartRef.current = Date.now() - swTime
            swIntervalRef.current = setInterval(() => {
                setSwTime(Date.now() - swStartRef.current)
            }, 10)
        } else {
            clearInterval(swIntervalRef.current)
            if (!cdRunning) releaseWakeLock()
        }
        return () => clearInterval(swIntervalRef.current)
    }, [swRunning]) // intentionally excludes swTime — anchor is set once on start

    // ── Countdown interval — runs in provider, survives tab unmount ───────────
    useEffect(() => {
        if (cdRunning && cdTime > 0) {
            requestWakeLock()
            cdIntervalRef.current = setInterval(() => {
                setCdTime(prev => {
                    if (prev <= 1) {
                        setCdRunning(false)
                        triggerAlarm()
                        if (!swRunning) releaseWakeLock()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else {
            clearInterval(cdIntervalRef.current)
            if (!cdRunning && !swRunning) releaseWakeLock()
        }
        return () => clearInterval(cdIntervalRef.current)
    }, [cdRunning, cdTime, triggerAlarm, swRunning])

    // ── Timer actions ─────────────────────────────────────────────────────────

    const toggleStopwatch = useCallback(() => {
        setSwRunning(prev => !prev)
    }, [])

    const resetStopwatch = useCallback(() => {
        setSwRunning(false)
        setSwTime(0)
    }, [])

    const startCountdown = useCallback((minutes) => {
        setCdTime(Math.round(minutes * 60))
        setCdRunning(true)
    }, [])

    const toggleCountdown = useCallback(() => {
        setCdRunning(prev => !prev)
    }, [])

    const cancelCountdown = useCallback(() => {
        setCdRunning(false)
        setCdTime(0)
    }, [])

    const addCountdownTime = useCallback((seconds) => {
        setCdTime(prev => prev + seconds)
        if (cdTime === 0) {
            setCdRunning(true)
        }
    }, [cdTime])

    // ── Active workout actions ────────────────────────────────────────────────

    const toggleMobilityCheck = useCallback((slot, val) => {
        setMobChecked(prev => ({ ...prev, [slot]: val }))
        setImmediateTick(t => t + 1) // A6.5 — discrete action, save now (not debounced)
    }, [])

    const updateStrengthSet = useCallback((key, field, val) => {
        setStrSets(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
    }, [])

    const updateCoreSet = useCallback((rowNum, field, val) => {
        setCoreSets(prev => ({ ...prev, [rowNum]: { ...prev[rowNum], [field]: val } }))
    }, [])

    const toggleCooldownCheck = useCallback((slot, val) => {
        setClrChecked(prev => ({ ...prev, [slot]: val }))
        setImmediateTick(t => t + 1) // A6.5 — discrete action, save now (not debounced)
    }, [])

    const addAltRow = useCallback(() => {
        setAltRows(prev => [...prev, { id: Date.now(), name: '', v1: '', v2: '', v3: '' }])
    }, [])

    const updateAltRow = useCallback((id, field, value) => {
        setAltRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }, [])

    const removeAltRow = useCallback((id) => {
        setAltRows(prev => prev.filter(r => r.id !== id))
    }, [])

    /**
     * resetActiveWorkout — resets all in-progress HUD inputs to defaults.
     * Day is intentionally kept (matches existing handleReset behaviour in HUD).
     */
    const resetActiveWorkout = useCallback(() => {
        setHipScore(WORKOUT_DEFAULTS.hipScore)
        setHudScrollY(WORKOUT_DEFAULTS.hudScrollY)
        setMobChecked(WORKOUT_DEFAULTS.mobChecked)
        setStrSets(WORKOUT_DEFAULTS.strSets)
        setCoreSets(WORKOUT_DEFAULTS.coreSets)
        setClrChecked(WORKOUT_DEFAULTS.clrChecked)
        setBagRounds(WORKOUT_DEFAULTS.bagRounds)
        setBagCourse(WORKOUT_DEFAULTS.bagCourse)
        setBagModules(WORKOUT_DEFAULTS.bagModules)
        setBagWorkouts(WORKOUT_DEFAULTS.bagWorkouts)
        setNotes(WORKOUT_DEFAULTS.notes)
        setGymSessionType(WORKOUT_DEFAULTS.gymSessionType)
        setAltRows(WORKOUT_DEFAULTS.altRows)
        setAltDuration(WORKOUT_DEFAULTS.altDuration)
        // W10 — new session starts with bag/core collapsed again
        setBagBlockOpen(WORKOUT_DEFAULTS.bagBlockOpen)
        setCoreBlockOpen(WORKOUT_DEFAULTS.coreBlockOpen)
        // W10.1 — and mobility/strength/cooldown open again
        setMobBlockOpen(WORKOUT_DEFAULTS.mobBlockOpen)
        setStrBlockOpen(WORKOUT_DEFAULTS.strBlockOpen)
        setClrBlockOpen(WORKOUT_DEFAULTS.clrBlockOpen)
        // A6.5 — the NEXT meaningful draft gets a fresh createdAt/lifecycle,
        // never inherits the just-cleared one's.
        setDraftCreatedAt(null)
        setDraftLifecycleKey(k => k + 1)
    }, [])

    /**
     * discardAndResetActiveWorkout — Reset HUD's action. Invalidates pending
     * writes and deletes the durable draft FIRST; only clears live state if
     * that succeeds. If the delete fails, live state is left untouched —
     * clearing it anyway would desync the screen from the still-persisted
     * row (a later reload/Continue would offer content the user believed
     * they'd cleared). logSession's own post-commit reset does NOT go
     * through this path: the transaction already deleted the row, so
     * redoing it here would be a redundant delete that could only ever
     * spuriously fail and mask an already-successful log.
     */
    const discardAndResetActiveWorkout = useCallback(async () => {
        if (ownerUserId) {
            await workoutDraftController.discardDraft(ownerUserId)
        }
        resetActiveWorkout()
    }, [ownerUserId, resetActiveWorkout])

    // ── A6.5 — draft hydration ─────────────────────────────────────────────────
    // Resolve owner → load [ownerUserId,'active'] only → classify → offer
    // Continue (valid), preserve+flag (unsupported/corrupt), or protect as a
    // read-error state — never more than one. Owner mismatch is never
    // exposed — treated exactly as "no draft". Nothing here ever WRITES;
    // the row is only read and classified (classifyHydratedDraft is pure).
    //
    // A READ FAILURE is its own protected state, never collapsed into "no
    // draft exists": the underlying row may still be there and valid — we
    // simply failed to read it. Falling through to 'ready' with nothing set
    // would enable autosave and let a fresh draft silently overwrite it the
    // moment content became meaningful. retryHydration() re-runs this via
    // hydrationRetryKey; there is no Discard for this state, only Retry.
    useEffect(() => {
        let cancelled = false
        setDraftPhase('idle')
        setContinueDraft(null)
        setDraftIssue(null)

        if (!ownerUserId) return

        async function hydrate() {
            setDraftPhase('hydrating')
            let row = null
            let readError = null
            try {
                row = await loadActiveDraft(ownerUserId)
            } catch (err) {
                console.error('workoutDrafts: hydration read failed', err)
                readError = err
            }
            if (cancelled) return

            const outcome = classifyHydratedDraft({ row, readError, ownerUserId })
            setContinueDraft(outcome.continueDraft)
            setDraftIssue(outcome.draftIssue)
            setDraftPhase('ready')
        }
        hydrate()

        return () => { cancelled = true }
    }, [ownerUserId, hydrationRetryKey])

    const retryHydration = useCallback(() => {
        setHydrationRetryKey(k => k + 1)
    }, [])

    /** Applies an offered Continue draft onto live state. Legacy only — a
     *  cartridge-kind draft is not reachable until A7 ships the renderer. */
    const resumeDraft = useCallback(() => {
        if (!continueDraft) return
        const { workoutIdentity, state } = continueDraft
        if (workoutIdentity.kind === 'legacy-playbook') {
            const resumedDay = parseLegacyDay(workoutIdentity.dayTemplateKey)
            const resumedPhase = parseLegacyPhase(workoutIdentity.phaseId)
            if (resumedDay != null) setDay(resumedDay)
            if (resumedPhase != null) setPhase(resumedPhase)
            if (workoutIdentity.hipScore != null) setHipScore(workoutIdentity.hipScore)

            const f = state.fields || {}
            if (f.mobChecked) setMobChecked(f.mobChecked)
            if (f.clrChecked) setClrChecked(f.clrChecked)
            if (f.strSets) setStrSets(f.strSets)
            if (f.coreSets) setCoreSets(f.coreSets)
            if (f.bagRounds !== undefined) setBagRounds(f.bagRounds)
            if (f.bagCourse !== undefined) setBagCourse(f.bagCourse)
            if (f.bagModules !== undefined) setBagModules(f.bagModules)
            if (f.bagWorkouts !== undefined) setBagWorkouts(f.bagWorkouts)
            if (f.notes !== undefined) setNotes(f.notes)
            if (f.gymSessionType !== undefined) setGymSessionType(f.gymSessionType)
            if (f.altRows) setAltRows(f.altRows)
            if (f.altDuration !== undefined) setAltDuration(f.altDuration)
            if (f.hudScrollY !== undefined) setHudScrollY(f.hudScrollY)
            if (f.bagBlockOpen !== undefined) setBagBlockOpen(f.bagBlockOpen)
            if (f.coreBlockOpen !== undefined) setCoreBlockOpen(f.coreBlockOpen)
            if (f.mobBlockOpen !== undefined) setMobBlockOpen(f.mobBlockOpen)
            if (f.strBlockOpen !== undefined) setStrBlockOpen(f.strBlockOpen)
            if (f.clrBlockOpen !== undefined) setClrBlockOpen(f.clrBlockOpen)
        }
        setDraftCreatedAt(continueDraft.createdAt)
        setContinueDraft(null)
    }, [continueDraft])

    /** Deletes the stored draft (offered-Continue or preserved-issue row) and
     *  clears whichever hydration state was showing it. Does NOT itself touch
     *  live in-memory fields — callers that are discarding an ACTIVE draft
     *  (the context-conflict preflight) pair this with resetActiveWorkout(). */
    const discardCurrentDraft = useCallback(async () => {
        if (!ownerUserId) return
        await workoutDraftController.discardDraft(ownerUserId)
        setContinueDraft(null)
        setDraftIssue(null)
    }, [ownerUserId])

    /** Current live (not-yet-necessarily-persisted) draft shape, for the
     *  context-conflict preflight — shared by HUD's day/phase/hip selectors
     *  and CartridgeViewer's activation, so both check the same thing. */
    const getLiveDraftRow = useCallback(() => ({
        workoutIdentity: buildLegacyIdentity({ day, phase, hipScore }),
        state: {
            kind: 'legacy-hud-v1',
            fields: pickFields({
                mobChecked, clrChecked, strSets, coreSets,
                bagRounds, bagCourse, bagModules, bagWorkouts,
                notes, gymSessionType, altRows, altDuration,
                hudScrollY, bagBlockOpen, coreBlockOpen, mobBlockOpen, strBlockOpen, clrBlockOpen,
            }, LEGACY_STATE_FIELD_KEYS),
        },
    }), [day, phase, hipScore, mobChecked, clrChecked, strSets, coreSets,
        bagRounds, bagCourse, bagModules, bagWorkouts, notes, gymSessionType, altRows, altDuration,
        hudScrollY, bagBlockOpen, coreBlockOpen, mobBlockOpen, strBlockOpen, clrBlockOpen])

    // A6.5 — best-effort flush on DBProvider's own unmount (sign-out via
    // AuthGate swapping to SignIn, or full app teardown). This flushes
    // whatever the controller already has pending — it has no access to
    // `workout`/definitionSnapshot, so it cannot rebuild a fresh row; the
    // fresher visibilitychange/pagehide/tab-switch flush lives in
    // useWorkoutDraftPersistence (called from HUD, which has `workout`).
    useEffect(() => {
        return () => {
            workoutDraftController.flush()
        }
    }, [])

    // ── Persistent-storage request (W23.5) ────────────────────────────────────
    // Deliberately a SEPARATE effect from init(): it must never gate `ready`
    // or delay first paint. `navigator.storage.persist()` never throws per
    // spec, but the whole call is feature-detected and try/caught anyway.
    // Browser realities: Chromium decides silently from engagement
    // heuristics; Firefox may prompt; iOS Safari is known to evict
    // IndexedDB after ~7 days of app disuse REGARDLESS of what persist()
    // reports — on iOS the full-backup export is the real mitigation, this
    // call is best-effort only.
    useEffect(() => {
        (async () => {
            try {
                if (typeof navigator !== 'undefined' && navigator.storage
                    && typeof navigator.storage.persist === 'function') {
                    const granted = await navigator.storage.persist()
                    setStoragePersisted(granted === true)
                } else {
                    setStoragePersisted(false) // API unavailable — best-effort
                }
            } catch (err) {
                console.warn('storage.persist() failed:', err)
                setStoragePersisted(false)
            }
        })()
    }, [])

    // ── Load settings on mount ────────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            const p = await getSetting('currentPhase')
            _setPhase(Number(p) || 1)

            _setAppName(await getSetting('appName'))
            _setAppSubtitle(await getSetting('appSubtitle'))
            _setDailyIgnitionEnabled(await getSetting('dailyIgnitionEnabled'))

            const bookmarks = await getSetting('bookmarkedIgnitions')
            if (Array.isArray(bookmarks)) setBookmarkedIgnitions(bookmarks)

            const setups = await getSetting('savedRoundsTimers')
            if (Array.isArray(setups)) {
                setSavedRoundsSetups(setups)
            }

            // W15 — normalizeBlockOrder handles undefined (no stored value →
            // default order) and any stale/corrupt stored shape; never throws.
            setBasicTimerBlockOrder(normalizeBlockOrder(await getSetting('basicTimerBlockOrder')))

            await refreshCounts()
            await refreshPending()
            setReady(true)
        }
        init()
    }, [])

    const refreshCounts = useCallback(async () => {
        const sessions = await db.sessions.toArray()
        const counts = { 1: 0, 2: 0, 3: 0 }
        for (const s of sessions) {
            // Only count S&C days toward phase unlock — exclude fight gym
            // days 2/4 and the optional/custom gym Day 7 (D2 / W16)
            if (s.day !== 2 && s.day !== 4 && s.day !== 7) {
                const p = Number(s.phase)
                if (counts[p] !== undefined) counts[p]++
            }
        }
        setCount(counts)
    }, [])

    const refreshPending = useCallback(async () => {
        const n = await db.syncQueue.count()
        setPending(n)
    }, [])

    const setPhase = useCallback(async (p) => {
        await setSetting('currentPhase', p)
        _setPhase(p)
    }, [])

    const setAppName = useCallback(async (name) => {
        await setSetting('appName', name)
        _setAppName(name)
    }, [])

    const setAppSubtitle = useCallback(async (sub) => {
        await setSetting('appSubtitle', sub)
        _setAppSubtitle(sub)
    }, [])

    const setDailyIgnitionEnabled = useCallback(async (val) => {
        await setSetting('dailyIgnitionEnabled', val)
        _setDailyIgnitionEnabled(val)
    }, [])

    const toggleIgnitionBookmark = useCallback(async (id) => {
        setBookmarkedIgnitions(prev => {
            const newBookmarks = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
            setSetting('bookmarkedIgnitions', newBookmarks).catch(console.error);
            return newBookmarks;
        });
    }, []);

    const logSession = useCallback(async (sessionData) => {
        // Generate UUID for remote sheet soft-deletes
        const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        sessionData.sessionId = sessionId

        // A6.5 — freeze autosave. The caller already flushed the newest
        // snapshot before invoking logSession (see HUD's handleLog), so
        // this leaves the freshest recoverable draft if the transaction
        // below fails; invalidate() ensures nothing scheduled during the
        // transaction can resurrect the draft this commit is about to
        // clear. No permanent payload or sync-envelope field changes.
        workoutDraftController.invalidate()

        // commitLoggedSession (db/workoutDrafts.js) is the exact atomic
        // transaction under test in workoutDrafts.test.js — extracted so
        // production and the test call the SAME function, not a hand-copied
        // mirror that could drift silently (no React-render test infra
        // exists here to exercise this path directly). On failure this
        // throws, the transaction rolls back sessions+syncQueue+
        // workoutDrafts together, the draft remains, and nothing below runs
        // (no success message, no in-memory reset). The remote drain below
        // is deliberately outside the local commit boundary.
        await commitLoggedSession({ sessionData, sessionId, ownerUserId })

        await refreshCounts()
        await refreshPending()
        // Reset in-progress workout state after successful log
        resetActiveWorkout()
        // Attempt to sync immediately if online
        trySyncQueue(refreshPending)
    }, [refreshCounts, refreshPending, resetActiveWorkout, ownerUserId])

    const resetSession = useCallback(() => {
        resetActiveWorkout()
    }, [resetActiveWorkout])

    const deleteLastSession = useCallback(async () => {
        const lastSession = await db.sessions.orderBy('id').reverse().limit(1).first()
        if (!lastSession) {
            alert('No recent session found to delete.')
            return false
        }

        try {
            // Delete the local session record
            await db.sessions.delete(lastSession.id)

            // Queue the delete action to ensure it reaches the webhook reliably.
            // If the original log is still in the queue, it will be processed first,
            // followed immediately by this delete action, preventing race conditions.
            if (lastSession.sessionId) {
                const payloadEnvelope = { action: 'delete', sessionId: lastSession.sessionId }
                await enqueueSync({ sessionId: lastSession.id, attempts: 0, payload: payloadEnvelope })
            }

            await refreshCounts()
            await refreshPending()

            // Trigger sync queue to push the delete
            trySyncQueue(refreshPending)

            return true
        } catch (err) {
            console.error('Failed to delete session:', err)
            alert('Failed to delete session.')
            return false
        }
    }, [refreshCounts, refreshPending])

    if (!ready) {
        return (
            <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--dim)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚔️</div>
                    <div>Loading Fighter's OS…</div>
                </div>
            </div>
        )
    }

    return (
        <DBContext.Provider value={{
            // ── DB-backed settings ──
            phase, setPhase,
            appName, setAppName,
            appSubtitle, setAppSubtitle,
            dailyIgnitionEnabled, setDailyIgnitionEnabled,
            bookmarkedIgnitions, toggleIgnitionBookmark,
            ignitionHasShown, setIgnitionHasShown,
            sessionCount, pendingSync, logSession, resetSession, deleteLastSession,
            refreshCounts, refreshPending,
            storagePersisted,

            // ── Active workout state ──
            day, setDay,
            hipScore, setHipScore,
            mobChecked, toggleMobilityCheck,
            strSets, updateStrengthSet,
            coreSets, updateCoreSet,
            clrChecked, toggleCooldownCheck,
            bagRounds, setBagRounds,
            bagCourse, setBagCourse,
            bagModules, setBagModules,
            bagWorkouts, setBagWorkouts,
            notes, setNotes,
            gymSessionType, setGymSessionType,
            altRows, setAltRows, addAltRow, updateAltRow, removeAltRow,
            altDuration, setAltDuration,
            hudScrollY, setHudScrollY,
            bagBlockOpen, setBagBlockOpen,
            mobBlockOpen, setMobBlockOpen,
            strBlockOpen, setStrBlockOpen,
            clrBlockOpen, setClrBlockOpen,
            coreBlockOpen, setCoreBlockOpen,
            resetActiveWorkout, discardAndResetActiveWorkout,

            // ── A6.5 — durable active-workout draft ──
            ownerUserId, autosaveEnabled, immediateTick,
            continueDraft, draftIssue, resumeDraft, discardCurrentDraft,
            draftCreatedAt, draftLifecycleKey, getLiveDraftRow, retryHydration,

            // ── Timer state ──
            swTime, swRunning, toggleStopwatch, resetStopwatch,
            cdTime, cdRunning, startCountdown, toggleCountdown, cancelCountdown, addCountdownTime,
            alertState,
            basicTimerBlockOrder, moveBasicTimerBlock,

            // ── Custom Rounds Timer ──
            roundsTimer,
            savedRoundsSetups, saveRoundsSetup, deleteRoundsSetup
        }}>
            {children}
        </DBContext.Provider>
    )
}

export function useDB() {
    const ctx = useContext(DBContext)
    if (!ctx) throw new Error('useDB must be used within DBProvider')
    return ctx
}

// ─── Sync to Google Sheets webhook ────────────────────────────────────────────
// Implementation lives in ../sync/syncQueue.js (extracted in W8, no behavior
// change). Auto-sync listener registration happens here at module-eval time,
// matching the pre-refactor timing exactly.
initSyncListeners()
