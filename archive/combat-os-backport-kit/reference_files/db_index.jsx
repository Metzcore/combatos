/**
 * db/index.jsx — Apex Protocol IndexedDB layer (Dexie.js)
 *
 * Tables:
 *   sessions   — logged workout sessions (source of truth, local)
 *   syncQueue  — sessions pending push to Google Sheets webhook
 *   settings   — app config (appName, appSubtitle, etc.)
 *
 * In-memory shared state (not persisted to Dexie):
 *   activeSession — current HUD session inputs (survives tab switches)
 *   timerState    — stopwatch + countdown state (survives tab switches)
 *
 * Schema contract: spreadsheet/schema-spec.md
 * Webhook: WEBHOOK_URL constant — NOT stored in IndexedDB, NOT user-editable.
 */

import Dexie from 'dexie'
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import useRoundsTimer from '../hooks/useRoundsTimer.js'
import { getDay } from '../hooks/useApexPlaybook.js'

// ─── Webhook URL — hardcoded constant, never user-editable ─────────────────────
export const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxq3GooOwqzmDF9K1opIPeYyQQC5zIdNNcwH6LyB-CQcTiB1vumimTC-Jx8PBRcu_eq/exec'

// ─── Database definition ──────────────────────────────────────────────────────
const db = new Dexie('ApexProtocol')

db.version(1).stores({
    sessions: '++id, date, dayNumber, blockId',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key'
})

// version 2 — adds sessionType index for training-only counts
db.version(2).stores({
    sessions: '++id, date, dayNumber, blockId, sessionType',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key'
})

export { db }

// ─── Settings helpers ─────────────────────────────────────────────────────────
const DEFAULTS = {
    appName: 'APEX PROTOCOL',
    appSubtitle: 'Performance Training',
    dailyIgnitionEnabled: true,
    currentBlock: 'phase1'
}

async function getSetting(key) {
    const row = await db.settings.get(key)
    return row ? row.value : DEFAULTS[key]
}

async function setSetting(key, value) {
    await db.settings.put({ key, value })
}

// ─── Active session defaults ───────────────────────────────────────────────────
/**
 * Build a blank activeSession for a given blockId + dayNumber.
 * Reads plan data via getDay() to initialise the right exercises and sets.
 *
 * @param {string} blockId
 * @param {number} dayNumber
 * @returns {Object} activeSession
 */
function buildEmptySession(blockId, dayNumber) {
    const dayPlan = getDay(blockId, dayNumber)
    const date = new Date().toISOString().slice(0, 10)

    if (!dayPlan || !Array.isArray(dayPlan.exercises) || dayPlan.exercises.length === 0) {
        return {
            blockId,
            dayNumber,
            date,
            focus: dayPlan?.focus ?? '',
            notes: '',
            exercises: []
        }
    }

    const exercises = dayPlan.exercises.map(ex => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        target: ex.target,
        supersetLabel: ex.supersetLabel ?? null,
        prescribedSets: ex.prescribedSets,
        prescribedReps: ex.prescribedReps,
        prescribedRpe: ex.prescribedRpe,
        quickNote: ex.quickNote,
        sets: Array.from({ length: ex.prescribedSets }, (_, i) => ({
            setNumber: i + 1,
            load: '',
            reps: '',
            rpe: ''
        }))
    }))

    return {
        blockId,
        dayNumber,
        date,
        focus: dayPlan.focus,
        notes: '',
        exercises
    }
}

const DEFAULT_BLOCK = 'phase1'
const DEFAULT_DAY = 1

// ─── Context ──────────────────────────────────────────────────────────────────
const DBContext = createContext(null)

/**
 * DBProvider — wraps the app and provides DB access via useDB()
 */
export function DBProvider({ children }) {
    // ── Persistent DB-backed state ─────────────────────────────────────────────
    const [appName, _setAppName] = useState(DEFAULTS.appName)
    const [appSubtitle, _setAppSubtitle] = useState(DEFAULTS.appSubtitle)
    const [dailyIgnitionEnabled, _setDailyIgnitionEnabled] = useState(DEFAULTS.dailyIgnitionEnabled)
    const [currentBlock, _setCurrentBlock] = useState(DEFAULTS.currentBlock)
    const [bookmarkedIgnitions, setBookmarkedIgnitions] = useState([])
    const [ignitionHasShown, setIgnitionHasShown] = useState(false)
    const [pendingSync, setPending] = useState(0)
    const [sessionCount, setCount] = useState({})
    const [ready, setReady] = useState(false)

    // ── Active session (in-memory, not persisted to Dexie) ────────────────────
    const [activeSession, _setActiveSession] = useState(() =>
        buildEmptySession(DEFAULT_BLOCK, DEFAULT_DAY)
    )

    // ── In-memory timer state ─────────────────────────────────────────────────
    const [swTime, setSwTime] = useState(0)
    const [swRunning, setSwRunning] = useState(false)
    const [cdTime, setCdTime] = useState(0)
    const [cdRunning, setCdRunning] = useState(false)
    const [alertState, setAlertState] = useState('none')

    const swIntervalRef = useRef(null)
    const swStartRef = useRef(0)
    const cdIntervalRef = useRef(null)
    const audioRef = useRef(null)
    const interimAudioRef = useRef(null)
    const wakeLockRef = useRef(null)

    // ── Preload bell audio ────────────────────────────────────────────────────
    useEffect(() => {
        audioRef.current = new Audio('/bell.mp3')
        audioRef.current.volume = 1.0
        interimAudioRef.current = new Audio('/bell-interim.mp3')
        interimAudioRef.current.volume = 1.0
        const unlockAudio = () => {
            if (audioRef.current) { audioRef.current.play().then(() => audioRef.current.pause()).catch(() => { }) }
            if (interimAudioRef.current) { interimAudioRef.current.play().then(() => interimAudioRef.current.pause()).catch(() => { }) }
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

    // ── Alarm ─────────────────────────────────────────────────────────────────
    const triggerAlarm = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
        }
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([500, 200, 500])
            }
        } catch (e) { console.warn('Vibration not supported', e) }
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
                navigator.vibrate([200])
            }
        } catch (e) { console.warn('Vibration not supported', e) }
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
                alert('Maximum 10 saved setups reached. Please delete one first.')
                return prev
            }
            const newSetups = [...prev, { ...setup, id: Date.now() }]
            setSetting('savedRoundsTimers', newSetups).catch(console.error)
            return newSetups
        })
    }, [])

    const deleteRoundsSetup = useCallback(async (id) => {
        setSavedRoundsSetups(prev => {
            const newSetups = prev.filter(s => s.id !== id)
            setSetting('savedRoundsTimers', newSetups).catch(console.error)
            return newSetups
        })
    }, [])

    // ── Stopwatch ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (swRunning) {
            requestWakeLock()
            swStartRef.current = Date.now() - swTime
            swIntervalRef.current = setInterval(() => {
                setSwTime(Date.now() - swStartRef.current)
            }, 10)
        } else {
            clearInterval(swIntervalRef.current)
            if (!cdRunning) releaseWakeLock()
        }
        return () => clearInterval(swIntervalRef.current)
    }, [swRunning])

    // ── Countdown ─────────────────────────────────────────────────────────────
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
    const toggleStopwatch = useCallback(() => setSwRunning(prev => !prev), [])
    const resetStopwatch = useCallback(() => { setSwRunning(false); setSwTime(0) }, [])
    const startCountdown = useCallback((minutes) => {
        setCdTime(Math.round(minutes * 60)); setCdRunning(true)
    }, [])
    const toggleCountdown = useCallback(() => setCdRunning(prev => !prev), [])
    const cancelCountdown = useCallback(() => { setCdRunning(false); setCdTime(0) }, [])
    const addCountdownTime = useCallback((seconds) => {
        setCdTime(prev => prev + seconds)
        if (cdTime === 0) setCdRunning(true)
    }, [cdTime])

    // ── Active session actions ────────────────────────────────────────────────

    /**
     * selectDay — switches to a new blockId + dayNumber, rebuilding the session.
     * Resets all set inputs. Called when the user changes the day selector.
     */
    const selectDay = useCallback((blockId, dayNumber) => {
        _setActiveSession(buildEmptySession(blockId, dayNumber))
    }, [])

    /**
     * updateSet — updates a single field on a specific set of a specific exercise.
     *
     * @param {string} exerciseId  — stable plan id e.g. "p1-d1-ex1"
     * @param {number} setNumber   — 1-indexed
     * @param {string} field       — "load" | "reps" | "rpe"
     * @param {string} value       — raw string from input
     */
    const updateSet = useCallback((exerciseId, setNumber, field, value) => {
        _setActiveSession(prev => ({
            ...prev,
            exercises: prev.exercises.map(ex => {
                if (ex.exerciseId !== exerciseId) return ex
                return {
                    ...ex,
                    sets: ex.sets.map(s =>
                        s.setNumber === setNumber ? { ...s, [field]: value } : s
                    )
                }
            })
        }))
    }, [])

    /**
     * updateNotes — updates the session-level notes string.
     */
    const updateNotes = useCallback((value) => {
        _setActiveSession(prev => ({ ...prev, notes: value }))
    }, [])

    /**
     * resetActiveSession — rebuilds a fresh empty session for the current day.
     */
    const resetActiveSession = useCallback(() => {
        _setActiveSession(prev => buildEmptySession(prev.blockId, prev.dayNumber))
    }, [])

    // ── Settings load on mount ────────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            _setAppName(await getSetting('appName'))
            _setAppSubtitle(await getSetting('appSubtitle'))
            _setDailyIgnitionEnabled(await getSetting('dailyIgnitionEnabled'))

            const block = await getSetting('currentBlock')
            if (block) _setCurrentBlock(block)

            const bookmarks = await getSetting('bookmarkedIgnitions')
            if (Array.isArray(bookmarks)) setBookmarkedIgnitions(bookmarks)

            const setups = await getSetting('savedRoundsTimers')
            if (Array.isArray(setups)) setSavedRoundsSetups(setups)

            await refreshCounts()
            await refreshPending()
            setReady(true)
        }
        init()
    }, [])

    const refreshCounts = useCallback(async () => {
        // Count only training sessions — rest/recovery days must not inflate the week number.
        // Old rows without sessionType (logged before this change) are treated as training
        // via the fallback: undefined !== 'rest' && undefined !== 'recovery'.
        const sessions = await db.sessions.toArray()
        const counts = {}
        for (const s of sessions) {
            const isTraining = !s.sessionType || s.sessionType === 'training'
            if (!isTraining) continue
            const b = s.blockId || 'phase1'
            counts[b] = (counts[b] || 0) + 1
        }
        setCount(counts)
    }, [])

    const refreshPending = useCallback(async () => {
        const n = await db.syncQueue.count()
        setPending(n)
    }, [])

    const setCurrentBlock = useCallback(async (block) => {
        await setSetting('currentBlock', block)
        _setCurrentBlock(block)
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
            const newBookmarks = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
            setSetting('bookmarkedIgnitions', newBookmarks).catch(console.error)
            return newBookmarks
        })
    }, [])

    /**
     * logSession — builds the apex_session payload, saves to Dexie, queues for sync.
     *
     * @param {Object} sessionPayload — the fully constructed apex_session envelope
     */
    const logSession = useCallback(async (sessionPayload) => {
        // Save minimal record to local sessions table for Calendar display
        const localRecord = {
            date: sessionPayload.meta.date,
            blockId: sessionPayload.meta.blockId,
            dayNumber: sessionPayload.meta.dayNumber,
            sessionType: sessionPayload.meta.sessionType,   // 'training' | 'rest' | 'recovery'
            focus: sessionPayload.meta.focus,
            notes: sessionPayload.meta.notes,
            sessionId: sessionPayload.meta.sessionId,
            rowCount: sessionPayload.rows.length
        }

        const id = await db.sessions.add(localRecord)
        await db.syncQueue.add({ sessionId: id, attempts: 0, payload: sessionPayload })
        await refreshCounts()
        await refreshPending()

        // Reset in-progress session state
        resetActiveSession()

        // Attempt immediate sync
        trySyncQueue(refreshPending)
    }, [refreshCounts, refreshPending, resetActiveSession])

    /**
     * deleteLastSession — finds the last logged session, calls webhook to soft delete rows,
     * removes it from local Dexie, and refreshes counts.
     */
    const deleteLastSession = useCallback(async () => {
        const lastSession = await db.sessions.orderBy('id').reverse().limit(1).first()
        if (!lastSession) {
            alert('No recent session found to delete.')
            return false
        }

        try {
            // Best effort to remove any pending syncs for this session first
            await db.syncQueue.where('sessionId').equals(lastSession.id).delete()

            // Soft delete via webhook
            if (navigator.onLine) {
                const res = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'delete', sessionId: lastSession.sessionId })
                })
                // We assume opaque response is sent properly. 
                // A more robust app would queue deletes if offline, but for this pilot best-effort is fine.
            }

            await db.sessions.delete(lastSession.id)
            await refreshCounts()
            await refreshPending()
            return true
        } catch (err) {
            console.error('Failed to delete last session:', err)
            alert('Failed to connect to webhook. Session was not deleted.')
            return false
        }
    }, [refreshCounts, refreshPending])

    if (!ready) {
        return (
            <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--dim)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏋️</div>
                    <div>Loading APEX PROTOCOL…</div>
                </div>
            </div>
        )
    }

    return (
        <DBContext.Provider value={{
            // ── App settings ──
            appName, setAppName,
            appSubtitle, setAppSubtitle,
            dailyIgnitionEnabled, setDailyIgnitionEnabled,
            bookmarkedIgnitions, toggleIgnitionBookmark,
            ignitionHasShown, setIgnitionHasShown,
            currentBlock, setCurrentBlock,

            // ── Session tracking ──
            sessionCount, pendingSync, logSession, deleteLastSession,
            refreshCounts, refreshPending,

            // ── Active session state ──
            activeSession,
            selectDay,
            updateSet,
            updateNotes,
            resetActiveSession,

            // ── Timer state ──
            swTime, swRunning, toggleStopwatch, resetStopwatch,
            cdTime, cdRunning, startCountdown, toggleCountdown, cancelCountdown, addCountdownTime,
            alertState,

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

const MAX_ATTEMPTS = 5

/**
 * trySyncQueue — drains pending apex_session payloads to WEBHOOK_URL.
 * Uses no-cors mode for cross-origin Google Apps Script requests.
 */
export async function trySyncQueue(onComplete) {
    if (!navigator.onLine) return

    const pending = await db.syncQueue.toArray()
    for (const item of pending) {
        if (item.attempts >= MAX_ATTEMPTS) continue
        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(item.payload)
            })
            // no-cors → opaque response (status 0, res.type === 'opaque')
            // No error thrown = request was dispatched successfully
            if (res.type === 'opaque' || res.ok) {
                await db.syncQueue.delete(item.id)
            } else {
                await db.syncQueue.update(item.id, { attempts: item.attempts + 1 })
            }
        } catch {
            await db.syncQueue.update(item.id, { attempts: item.attempts + 1 })
        }
    }
    if (onComplete) onComplete()
}

// Auto-sync on tab focus and online event
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => trySyncQueue())
    window.addEventListener('focus', () => trySyncQueue())
}
