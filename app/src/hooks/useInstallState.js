/**
 * hooks/useInstallState.js — the install guidance state for one component (W38).
 *
 * Joins the held install event (installCapture.js) with the browser facts the
 * pure decision in utils/installState.js needs, and owns the banner's
 * seven-day "Not now" (localStorage — a per-device convenience, so every read
 * and write is guarded).
 */
import { useState, useEffect, useSyncExternalStore, useCallback } from 'react'
import { subscribe, getSnapshot, promptInstall } from '../installCapture.js'
import { installState, isStandalone, DISMISS_STORAGE_KEY } from '../utils/installState.js'

function readDismissedAt() {
    try {
        const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY)
        const n = raw === null ? NaN : Number(raw)
        return Number.isFinite(n) ? n : null
    } catch {
        return null
    }
}

function writeDismissedAt(ts) {
    try {
        window.localStorage.setItem(DISMISS_STORAGE_KEY, String(ts))
    } catch {
        // Private mode / blocked storage: the banner just reappears next load.
    }
}

// One related-apps lookup per page load, shared by every surface.
let relatedAppsPromise = null
function lookupRelatedApp() {
    if (!relatedAppsPromise) {
        relatedAppsPromise = (async () => {
            try {
                if (typeof navigator === 'undefined' || typeof navigator.getInstalledRelatedApps !== 'function') {
                    return false
                }
                const apps = await navigator.getInstalledRelatedApps()
                return Array.isArray(apps) && apps.some((a) => a && a.platform === 'webapp')
            } catch {
                return false
            }
        })()
    }
    return relatedAppsPromise
}

export function useInstallState() {
    const { hasPrompt, installedThisSession } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    const [installedRelatedApp, setInstalledRelatedApp] = useState(false)
    const [dismissedAt, setDismissedAt] = useState(readDismissedAt)
    const standalone = isStandalone()

    useEffect(() => {
        if (standalone) return undefined
        let cancelled = false
        lookupRelatedApp().then((found) => {
            if (!cancelled) setInstalledRelatedApp(found)
        })
        return () => { cancelled = true }
    }, [standalone])

    const dismiss = useCallback(() => {
        const ts = Date.now()
        writeDismissedAt(ts)
        setDismissedAt(ts)
    }, [])

    const nav = typeof navigator === 'undefined' ? {} : navigator
    const decision = installState({
        userAgent: nav.userAgent,
        platform: nav.platform,
        maxTouchPoints: nav.maxTouchPoints,
        standalone,
        hasDeferredPrompt: hasPrompt,
        installedRelatedApp,
        installedThisSession,
        dismissedAt,
        now: Date.now(),
    })

    return { ...decision, promptInstall, dismiss }
}
