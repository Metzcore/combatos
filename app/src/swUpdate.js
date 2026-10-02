/**
 * swUpdate.js — service-worker registration and "new version ready" state (W40).
 *
 * IMPORTED FROM main.jsx, at module scope, outside AuthGate/DBProvider (same
 * pattern as installCapture.js): update checks and the waiting-worker signal
 * therefore run even on the sign-in screen. Components subscribe LATER via
 * hooks/useAppUpdate.js.
 *
 * Why this is hand-written instead of vite-plugin-pwa's useRegisterSW: the
 * plugin's register.js arms an unconditional `controlling -> location.reload()`
 * as soon as a worker is waiting (vite-plugin-pwa/dist/client/build/register.js
 * ~L55), so a second window would reload itself, mid-workout, when another
 * window tapped Restart. Here a window reloads ONLY after its own Restart tap.
 *
 * The worker is built in `prompt` mode: no skipWaiting/clientsClaim, only a
 * `message` listener that calls skipWaiting() on {type:'SKIP_WAITING'}. A new
 * version therefore installs in the background and WAITS. Pull-to-refresh never
 * activates a waiting worker; the banner (or a full close and reopen) does.
 *
 * Status, as seen by the banner:
 *   none       nothing to show
 *   ready      a worker is installed and waiting; Restart activates it
 *   external   another window already activated one; this window still runs
 *              the old code. Restart just reloads (never automatic)
 *   restarting Restart was tapped; waiting for the new worker to take over
 *   failed     it did not take over within RESTART_TIMEOUT_MS: ask the user
 *              to close and reopen. A LATE activation must not reload.
 *
 * createUpdateStore() takes its environment as arguments so the logic can be
 * exercised with fakes (swUpdate.test.js). That proves OUR state machine only;
 * real browser lifecycle behaviour (D14) is covered by the device checklist.
 */
import { CHECK_INTERVAL_MS, shouldCheckForUpdate } from './utils/updateBanner.js'

export const RESTART_TIMEOUT_MS = 10 * 1000

export function createUpdateStore(env) {
    const { navigator: nav, document: doc, window: win, location, now = () => Date.now() } = env
    // Timers are looked up per call so tests can swap in fake ones.
    const timers = env.timers || {
        setTimeout: (...a) => setTimeout(...a),
        clearTimeout: (...a) => clearTimeout(...a),
        setInterval: (...a) => setInterval(...a),
    }

    let snapshot = { status: 'none' }
    const listeners = new Set()
    let registration = null
    let restartRequested = false
    let reloading = false // one-shot: the page is already on its way out
    let restartTimer = null
    let lastCheckAt = null
    let started = false

    function setStatus(status) {
        if (snapshot.status === status) return
        snapshot = { status }
        listeners.forEach((fn) => fn())
    }

    // A waiting worker only counts as an UPDATE when another worker is active:
    // on a first install the new worker goes straight to active.
    function syncWaiting() {
        if (!registration) return
        const waiting = Boolean(registration.waiting && registration.active)
        if (snapshot.status === 'none' && waiting) setStatus('ready')
        else if (snapshot.status === 'ready' && !waiting) setStatus('none') // superseded or gone
    }

    function onUpdateFound() {
        const worker = registration && registration.installing
        if (!worker) return
        worker.addEventListener('statechange', syncWaiting)
    }

    function reloadAfterRestart() {
        if (!restartRequested || reloading) return
        reloading = true
        if (restartTimer !== null) timers.clearTimeout(restartTimer)
        location.reload()
    }

    function failRestart() {
        if (reloading) return
        restartRequested = false // a late activation must never reload now
        restartTimer = null
        setStatus('failed')
    }

    function onControllerChange() {
        if (restartRequested) {
            reloadAfterRestart()
            return
        }
        if (reloading || snapshot.status === 'failed') return
        // Another window (or a late activation) swapped the worker under us.
        // Never reload by ourselves: tell the user and let them choose.
        setStatus('external')
    }

    /** Restart tapped. Reads the waiting worker NOW, not at registration time. */
    function restart() {
        if (snapshot.status === 'external') {
            if (reloading) return
            reloading = true
            location.reload()
            return
        }
        if (restartRequested || reloading) return
        const waiting = registration && registration.waiting
        if (!waiting) {
            setStatus('none') // nothing to activate any more
            return
        }
        restartRequested = true
        setStatus('restarting')
        // An uncontrolled window gets no controllerchange, so also watch the
        // worker itself reach 'activated'.
        waiting.addEventListener('statechange', () => {
            if (waiting.state === 'activated') reloadAfterRestart()
        })
        restartTimer = timers.setTimeout(failRestart, RESTART_TIMEOUT_MS)
        try {
            waiting.postMessage({ type: 'SKIP_WAITING' })
        } catch {
            timers.clearTimeout(restartTimer)
            failRestart()
        }
    }

    function checkForUpdate() {
        if (!registration) return
        const t = now()
        if (!shouldCheckForUpdate({ lastCheckAt, now: t, online: nav.onLine !== false })) return
        lastCheckAt = t
        try {
            // update() rejects offline / on network errors; both are fine.
            Promise.resolve(registration.update()).catch(() => {})
        } catch {
            // Synchronous throw (e.g. invalid state): ignore, the next check retries.
        }
    }

    async function register() {
        try {
            // Exactly the URL and scope the old registerSW.js used.
            registration = await nav.serviceWorker.register('/sw.js', { scope: '/' })
        } catch {
            return // registration failed: the app just runs without a worker
        }
        lastCheckAt = now()
        registration.addEventListener('updatefound', onUpdateFound)
        syncWaiting() // a worker may already be waiting from an earlier session
        doc.addEventListener('visibilitychange', () => {
            if (doc.visibilityState === 'visible') checkForUpdate()
        })
        timers.setInterval(() => {
            if (doc.visibilityState === 'visible') checkForUpdate()
        }, CHECK_INTERVAL_MS)
    }

    /** Begin: listen for controller swaps now, register after window 'load'. */
    function start() {
        if (started || !nav || !nav.serviceWorker) return
        started = true
        nav.serviceWorker.addEventListener('controllerchange', onControllerChange)
        if (doc.readyState === 'complete') register()
        else win.addEventListener('load', register, { once: true })
    }

    return {
        start,
        restart,
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        /** Stable object until something changes (useSyncExternalStore). */
        getSnapshot: () => snapshot,
    }
}

const store = createUpdateStore(
    typeof window === 'undefined'
        ? { navigator: undefined }
        : { navigator, document, window, location }
)

// Production only: `vite dev` has no /sw.js, and this keeps tests inert.
if (typeof window !== 'undefined' && import.meta.env.PROD) store.start()

export const subscribe = store.subscribe
export const getSnapshot = store.getSnapshot
export const restartApp = store.restart
