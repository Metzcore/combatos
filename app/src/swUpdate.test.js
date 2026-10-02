/**
 * swUpdate.test.js — W40's update state machine against FAKE browser objects.
 *
 * This proves OUR logic (one-shot reload, no surprise reloads, fallback after
 * 10 s, gating on an active controller). It cannot prove real service-worker
 * lifecycle behaviour in iOS/Android (D14): that is the device checklist.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpdateStore, RESTART_TIMEOUT_MS } from './swUpdate.js'
import { CHECK_INTERVAL_MS } from './utils/updateBanner.js'

function fakeWorker(state = 'installed') {
    return Object.assign(new EventTarget(), { state, postMessage: vi.fn() })
}

function setup({ active = fakeWorker('activated'), waiting = null, readyState = 'complete', online = true } = {}) {
    const registration = Object.assign(new EventTarget(), {
        active, waiting, installing: null, update: vi.fn().mockResolvedValue(undefined),
    })
    const serviceWorker = Object.assign(new EventTarget(), {
        controller: active,
        register: vi.fn().mockResolvedValue(registration),
    })
    const nav = { onLine: online, serviceWorker }
    const doc = Object.assign(new EventTarget(), { readyState, visibilityState: 'visible' })
    const win = new EventTarget()
    const location = { reload: vi.fn() }
    let clock = 1_000_000
    const store = createUpdateStore({
        navigator: nav, document: doc, window: win, location,
        now: () => clock,
        timers: {
            setTimeout: (...a) => setTimeout(...a),
            clearTimeout: (...a) => clearTimeout(...a),
            setInterval: (...a) => setInterval(...a),
        },
    })
    return {
        store, registration, serviceWorker, nav, doc, win, location,
        advance: (ms) => { clock += ms },
    }
}

const flush = () => vi.advanceTimersByTimeAsync(0)

describe('swUpdate', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('registers /sw.js with scope / after window load, not before', async () => {
        const e = setup({ readyState: 'loading' })
        e.store.start()
        expect(e.serviceWorker.register).not.toHaveBeenCalled()
        e.win.dispatchEvent(new Event('load'))
        await flush()
        expect(e.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    })

    it('registers at once if the page already finished loading', async () => {
        const e = setup()
        e.store.start()
        await flush()
        expect(e.serviceWorker.register).toHaveBeenCalledTimes(1)
    })

    it('does nothing where service workers are unsupported', () => {
        const e = setup()
        delete e.nav.serviceWorker
        expect(() => e.store.start()).not.toThrow()
        expect(e.store.getSnapshot().status).toBe('none')
    })

    it('survives a failed registration', async () => {
        const e = setup()
        e.serviceWorker.register.mockRejectedValue(new Error('nope'))
        e.store.start()
        await flush()
        expect(e.store.getSnapshot().status).toBe('none')
    })

    it('reports "ready" for a worker already waiting at startup', async () => {
        const e = setup({ waiting: fakeWorker('installed') })
        e.store.start()
        await flush()
        expect(e.store.getSnapshot().status).toBe('ready')
    })

    it('reports "ready" when an update installs and waits behind an active worker', async () => {
        const e = setup()
        e.store.start()
        await flush()
        const incoming = fakeWorker('installing')
        e.registration.installing = incoming
        e.registration.dispatchEvent(new Event('updatefound'))
        incoming.state = 'installed'
        e.registration.waiting = incoming
        incoming.dispatchEvent(new Event('statechange'))
        expect(e.store.getSnapshot().status).toBe('ready')
    })

    it('does NOT report an update on a first install (no other active worker)', async () => {
        const e = setup({ active: null })
        e.store.start()
        await flush()
        const first = fakeWorker('installing')
        e.registration.installing = first
        e.registration.dispatchEvent(new Event('updatefound'))
        first.state = 'installed'
        e.registration.waiting = first
        first.dispatchEvent(new Event('statechange'))
        expect(e.store.getSnapshot().status).toBe('none')
    })

    it('goes back to "none" if the waiting worker is superseded', async () => {
        const e = setup({ waiting: fakeWorker('installed') })
        e.store.start()
        await flush()
        expect(e.store.getSnapshot().status).toBe('ready')
        const worker = e.registration.installing = fakeWorker('installing')
        e.registration.dispatchEvent(new Event('updatefound'))
        e.registration.waiting = null
        worker.state = 'redundant'
        worker.dispatchEvent(new Event('statechange'))
        expect(e.store.getSnapshot().status).toBe('none')
    })

    it('notifies subscribers only on a real change', async () => {
        const e = setup({ waiting: fakeWorker('installed') })
        const listener = vi.fn()
        e.store.subscribe(listener)
        e.store.start()
        await flush()
        expect(listener).toHaveBeenCalledTimes(1)
    })

    describe('Restart', () => {
        async function ready() {
            const waiting = fakeWorker('installed')
            const e = setup({ waiting })
            e.store.start()
            await flush()
            return { ...e, waiting }
        }

        it('posts SKIP_WAITING to the worker waiting at tap time and shows "restarting"', async () => {
            const e = await ready()
            e.store.restart()
            expect(e.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
            expect(e.store.getSnapshot().status).toBe('restarting')
            expect(e.location.reload).not.toHaveBeenCalled()
        })

        it('uses the worker that is waiting NOW, not the one seen at startup', async () => {
            const e = await ready()
            const newer = fakeWorker('installed')
            e.registration.waiting = newer
            e.store.restart()
            expect(newer.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
            expect(e.waiting.postMessage).not.toHaveBeenCalled()
        })

        it('hides the banner and posts nothing if nothing is waiting any more', async () => {
            const e = await ready()
            e.registration.waiting = null
            e.store.restart()
            expect(e.store.getSnapshot().status).toBe('none')
            expect(e.location.reload).not.toHaveBeenCalled()
        })

        it('reloads once on controllerchange, even if it fires twice', async () => {
            const e = await ready()
            e.store.restart()
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            expect(e.location.reload).toHaveBeenCalledTimes(1)
        })

        it('reloads when the worker reaches activated even with no controllerchange (uncontrolled window)', async () => {
            const e = await ready()
            e.store.restart()
            e.waiting.state = 'activating'
            e.waiting.dispatchEvent(new Event('statechange'))
            expect(e.location.reload).not.toHaveBeenCalled()
            e.waiting.state = 'activated'
            e.waiting.dispatchEvent(new Event('statechange'))
            expect(e.location.reload).toHaveBeenCalledTimes(1)
            // ...and the controllerchange that usually follows does not reload again
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            expect(e.location.reload).toHaveBeenCalledTimes(1)
        })

        it('after 10 s without activation, shows the close-and-reopen message', async () => {
            const e = await ready()
            e.store.restart()
            await vi.advanceTimersByTimeAsync(RESTART_TIMEOUT_MS)
            expect(e.store.getSnapshot().status).toBe('failed')
        })

        it('a LATE activation after the fallback never reloads', async () => {
            const e = await ready()
            e.store.restart()
            await vi.advanceTimersByTimeAsync(RESTART_TIMEOUT_MS)
            e.waiting.state = 'activated'
            e.waiting.dispatchEvent(new Event('statechange'))
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            expect(e.location.reload).not.toHaveBeenCalled()
            expect(e.store.getSnapshot().status).toBe('failed')
        })

        it('a successful restart cancels the fallback timer', async () => {
            const e = await ready()
            e.store.restart()
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            await vi.advanceTimersByTimeAsync(RESTART_TIMEOUT_MS * 2)
            expect(e.store.getSnapshot().status).toBe('restarting')
            expect(e.location.reload).toHaveBeenCalledTimes(1)
        })

        it('falls back at once if the message cannot be posted', async () => {
            const e = await ready()
            e.waiting.postMessage.mockImplementation(() => { throw new Error('gone') })
            e.store.restart()
            expect(e.store.getSnapshot().status).toBe('failed')
            expect(e.location.reload).not.toHaveBeenCalled()
        })

        it('ignores a second tap while restarting', async () => {
            const e = await ready()
            e.store.restart()
            e.store.restart()
            expect(e.waiting.postMessage).toHaveBeenCalledTimes(1)
        })
    })

    describe('a window that did not ask for the update', () => {
        it('never reloads on an unrequested controllerchange; it shows "external"', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            expect(e.location.reload).not.toHaveBeenCalled()
            expect(e.store.getSnapshot().status).toBe('external')
        })

        it('Restart in that state just reloads, once', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            e.store.restart()
            e.store.restart()
            expect(e.location.reload).toHaveBeenCalledTimes(1)
        })

        it('a waiting banner that someone else activated becomes "external", not a reload', async () => {
            const waiting = fakeWorker('installed')
            const e = setup({ waiting })
            e.store.start()
            await flush()
            expect(e.store.getSnapshot().status).toBe('ready')
            e.serviceWorker.dispatchEvent(new Event('controllerchange'))
            expect(e.location.reload).not.toHaveBeenCalled()
            expect(e.store.getSnapshot().status).toBe('external')
        })
    })

    describe('update checks', () => {
        it('does not re-check on a visibilitychange right after registering (15-minute floor)', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.doc.dispatchEvent(new Event('visibilitychange'))
            expect(e.registration.update).not.toHaveBeenCalled()
        })

        it('checks on resume once the floor has passed', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.advance(16 * 60 * 1000)
            e.doc.dispatchEvent(new Event('visibilitychange'))
            expect(e.registration.update).toHaveBeenCalledTimes(1)
        })

        it('does not check when the page is being hidden', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.advance(16 * 60 * 1000)
            e.doc.visibilityState = 'hidden'
            e.doc.dispatchEvent(new Event('visibilitychange'))
            expect(e.registration.update).not.toHaveBeenCalled()
        })

        it('does not check while offline', async () => {
            const e = setup({ online: false })
            e.store.start()
            await flush()
            e.advance(16 * 60 * 1000)
            e.doc.dispatchEvent(new Event('visibilitychange'))
            expect(e.registration.update).not.toHaveBeenCalled()
        })

        it('checks on the hourly interval while visible', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.advance(CHECK_INTERVAL_MS)
            await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS)
            expect(e.registration.update).toHaveBeenCalledTimes(1)
        })

        it('swallows a rejected update() and a synchronous throw', async () => {
            const e = setup()
            e.store.start()
            await flush()
            e.registration.update.mockRejectedValue(new TypeError('Failed to fetch'))
            e.advance(16 * 60 * 1000)
            e.doc.dispatchEvent(new Event('visibilitychange'))
            await flush()
            e.registration.update.mockImplementation(() => { throw new Error('invalid state') })
            e.advance(16 * 60 * 1000)
            expect(() => e.doc.dispatchEvent(new Event('visibilitychange'))).not.toThrow()
        })
    })
})
