/**
 * installCapture.js — holds the browser's `beforeinstallprompt` event (W38).
 *
 * IMPORTED FIRST in main.jsx, at module scope, before React mounts. This is
 * the W33 lesson (docs/decision_log.md 2026-09-29 #1): an event that fires
 * early with no subscriber yet is gone for good. Chrome fires
 * `beforeinstallprompt` only after load and its installability checks, and a
 * module script evaluates before then, so the listener always exists first.
 * Components subscribe LATER through useInstallState(); they never register
 * the listener themselves.
 *
 * The event is single-use: after `prompt()` it cannot be reused, and Chrome
 * fires a fresh one if the user dismisses the dialog. So promptInstall()
 * drops the held event before showing the dialog.
 *
 * `preventDefault()` suppresses Chrome's own mini-infobar; our UI replaces it.
 */

let deferredEvent = null
let installedThisSession = false
let snapshot = { hasPrompt: false, installedThisSession: false }
const listeners = new Set()

function publish() {
    snapshot = { hasPrompt: deferredEvent !== null, installedThisSession }
    listeners.forEach((fn) => fn())
}

/** Register the two listeners on a target (window in the app, an
 *  EventTarget in tests). */
export function attachInstallListeners(target) {
    target.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault()
        deferredEvent = event
        installedThisSession = false
        publish()
    })
    target.addEventListener('appinstalled', () => {
        deferredEvent = null
        installedThisSession = true
        publish()
    })
}

export function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

/** Stable object until something changes (required by useSyncExternalStore). */
export function getSnapshot() {
    return snapshot
}

/**
 * Show the browser's install dialog. Resolves 'accepted', 'dismissed' or
 * 'unavailable'; never throws, so a stale event degrades to "no button"
 * rather than an error.
 */
export async function promptInstall() {
    const event = deferredEvent
    if (!event || typeof event.prompt !== 'function') return 'unavailable'
    deferredEvent = null
    publish()
    try {
        await event.prompt()
        const choice = await event.userChoice
        return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
    } catch {
        return 'unavailable'
    }
}

if (typeof window !== 'undefined') attachInstallListeners(window)
