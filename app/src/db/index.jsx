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

// ─── Database definition ──────────────────────────────────────────────────────
const db = new Dexie('FightersOS')

db.version(1).stores({
    sessions: '++id, date, day, phase, hipScore',
    syncQueue: '++id, sessionId, attempts',
    settings: 'key'
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

async function getSetting(key) {
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
    altDuration: ''
}

// ─── Context ──────────────────────────────────────────────────────────────────
const DBContext = createContext(null)

/**
 * DBProvider — wraps the app and provides DB access via useDB()
 */
export function DBProvider({ children }) {
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
    }, [])

    const updateStrengthSet = useCallback((key, field, val) => {
        setStrSets(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
    }, [])

    const updateCoreSet = useCallback((rowNum, field, val) => {
        setCoreSets(prev => ({ ...prev, [rowNum]: { ...prev[rowNum], [field]: val } }))
    }, [])

    const toggleCooldownCheck = useCallback((slot, val) => {
        setClrChecked(prev => ({ ...prev, [slot]: val }))
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
            // Only count S&C days (not fight gym days 2 and 4)
            if (s.day !== 2 && s.day !== 4) {
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
        const id = await db.sessions.add(sessionData)

        // Wrap payload in action envelope
        const payloadEnvelope = { action: 'log', sessionId, payload: sessionData }
        await db.syncQueue.add({ sessionId: id, attempts: 0, payload: payloadEnvelope })

        await refreshCounts()
        await refreshPending()
        // Reset in-progress workout state after successful log
        resetActiveWorkout()
        // Attempt to sync immediately if online
        trySyncQueue(refreshPending)
    }, [refreshCounts, refreshPending, resetActiveWorkout])

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
                await db.syncQueue.add({ sessionId: lastSession.id, attempts: 0, payload: payloadEnvelope })
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
            resetActiveWorkout,

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
let _syncInFlight = false  // prevent concurrent sync runs

export async function trySyncQueue(onComplete) {
    if (_syncInFlight) return  // already running — bail out
    if (!navigator.onLine) return
    const webhookUrl = await getSetting('webhookUrl')
    if (!webhookUrl) return  // webhook not configured yet

    _syncInFlight = true
    try {
        const pending = await db.syncQueue.toArray()
        for (const item of pending) {
            if (item.attempts >= MAX_ATTEMPTS) continue
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(item.payload)
                })
                // no-cors returns an opaque response (type: 'opaque', res.ok is false, status is 0)
                // If we don't hit the catch block, the request was successfully sent.
                if (res.type === 'opaque' || res.ok) {
                    await db.syncQueue.delete(item.id)
                } else {
                    await db.syncQueue.update(item.id, { attempts: item.attempts + 1 })
                }
            } catch {
                await db.syncQueue.update(item.id, { attempts: item.attempts + 1 })
            }
        }
    } finally {
        _syncInFlight = false
        if (onComplete) onComplete()
    }
}

// Auto-sync on tab focus and online event
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => trySyncQueue())
    window.addEventListener('focus', () => trySyncQueue())
}
