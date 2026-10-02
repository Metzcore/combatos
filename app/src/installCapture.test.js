/**
 * installCapture.test.js
 *
 * Pins the W38 capture contract: the event is held and default-prevented,
 * subscribers hear about it (and a late subscriber still reads it), it is
 * single-use, and appinstalled clears it. Runs against a plain EventTarget,
 * so no DOM is needed.
 */
import { describe, it, expect, vi } from 'vitest'
import { attachInstallListeners, subscribe, getSnapshot, promptInstall } from './installCapture.js'

function fireInstallEvent(target, { outcome = 'accepted', prompt } = {}) {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = prompt || vi.fn().mockResolvedValue(undefined)
    event.userChoice = Promise.resolve({ outcome })
    target.dispatchEvent(event)
    return event
}

describe('install event capture', () => {
    const target = new EventTarget()
    attachInstallListeners(target)

    it('holds the event, prevents the mini-infobar and notifies subscribers', () => {
        const listener = vi.fn()
        const unsubscribe = subscribe(listener)
        const event = fireInstallEvent(target)
        expect(event.defaultPrevented).toBe(true)
        expect(getSnapshot().hasPrompt).toBe(true)
        expect(listener).toHaveBeenCalled()
        unsubscribe()
    })

    it('lets a subscriber that arrives after the event still see it', () => {
        fireInstallEvent(target)
        // Nothing subscribed when it fired; the snapshot still has it.
        expect(getSnapshot().hasPrompt).toBe(true)
    })

    it('consumes the held event when prompting, and reports the outcome', async () => {
        const prompt = vi.fn().mockResolvedValue(undefined)
        fireInstallEvent(target, { outcome: 'accepted', prompt })
        const result = await promptInstall()
        expect(result).toBe('accepted')
        expect(prompt).toHaveBeenCalledTimes(1)
        expect(getSnapshot().hasPrompt).toBe(false)
    })

    it('reports a dismissed dialog and keeps nothing held', async () => {
        fireInstallEvent(target, { outcome: 'dismissed' })
        expect(await promptInstall()).toBe('dismissed')
        expect(getSnapshot().hasPrompt).toBe(false)
    })

    it('reports unavailable, without throwing, when nothing is held', async () => {
        expect(await promptInstall()).toBe('unavailable')
    })

    it('degrades to unavailable when prompt() throws', async () => {
        fireInstallEvent(target, { prompt: vi.fn().mockRejectedValue(new Error('used')) })
        expect(await promptInstall()).toBe('unavailable')
        expect(getSnapshot().hasPrompt).toBe(false)
    })

    it('clears the held event and records the install when appinstalled fires', () => {
        fireInstallEvent(target)
        target.dispatchEvent(new Event('appinstalled'))
        expect(getSnapshot().hasPrompt).toBe(false)
        expect(getSnapshot().installedThisSession).toBe(true)
    })

    it('forgets the install if the browser offers a fresh event afterwards', () => {
        fireInstallEvent(target)
        expect(getSnapshot().installedThisSession).toBe(false)
        expect(getSnapshot().hasPrompt).toBe(true)
    })
})
