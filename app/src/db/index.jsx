/**
 * db/index.js — IndexedDB layer using Dexie.js
 *
 * Tables:
 *   sessions   — logged workout sessions (source of truth, local)
 *   syncQueue  — sessions pending push to Google Sheets webhook
 *   settings   — app config (currentPhase, webhookUrl)
 */

import Dexie from 'dexie'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'

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
    webhookUrl: 'https://script.google.com/macros/s/AKfycbzXC4ljnffgx1wQd_v7Pstvr8tZpsq1lDS_2kHzb0bb8cdvIrIC6FSUIS5Np1YqWvxP/exec',
    appName: "Fighter's OS",
    appSubtitle: "Combat Performance"
}

async function getSetting(key) {
    const row = await db.settings.get(key)
    return row ? row.value : DEFAULTS[key]
}

async function setSetting(key, value) {
    await db.settings.put({ key, value })
}

// ─── Context ──────────────────────────────────────────────────────────────────
const DBContext = createContext(null)

/**
 * DBProvider — wraps the app and provides DB access via useDB()
 */
export function DBProvider({ children }) {
    const [phase, _setPhase] = useState(1)
    const [appName, _setAppName] = useState(DEFAULTS.appName)
    const [appSubtitle, _setAppSubtitle] = useState(DEFAULTS.appSubtitle)
    const [pendingSync, setPending] = useState(0)
    const [sessionCount, setCount] = useState({}) // { 1: n, 2: n, 3: n }
    const [ready, setReady] = useState(false)

    // Load settings on mount
    useEffect(() => {
        async function init() {
            const p = await getSetting('currentPhase')
            _setPhase(Number(p) || 1)

            _setAppName(await getSetting('appName'))
            _setAppSubtitle(await getSetting('appSubtitle'))

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

    const logSession = useCallback(async (sessionData) => {
        const id = await db.sessions.add(sessionData)
        await db.syncQueue.add({ sessionId: id, attempts: 0, payload: sessionData })
        await refreshCounts()
        await refreshPending()
        // Attempt to sync immediately if online
        trySyncQueue(refreshPending)
    }, [refreshCounts, refreshPending])

    const resetSession = useCallback(() => {
        // HUD state reset is handled in HUD.jsx — this is a no-op hook for future use
    }, [])

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
            phase, setPhase,
            appName, setAppName,
            appSubtitle, setAppSubtitle,
            sessionCount, pendingSync, logSession, resetSession
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

export async function trySyncQueue(onComplete) {
    if (!navigator.onLine) return
    const webhookUrl = await getSetting('webhookUrl')
    if (!webhookUrl) return  // webhook not configured yet

    const pending = await db.syncQueue.toArray()
    for (const item of pending) {
        if (item.attempts >= MAX_ATTEMPTS) continue
        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
            })
            if (res.ok) {
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
