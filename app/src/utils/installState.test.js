/**
 * installState.test.js
 *
 * Pins the W38 install-guidance decision: every state, the seven-day
 * dismissal boundary, a held install event outranking UA guesses, and
 * standalone always winning. Pure helpers, node env — no DOM.
 */
import { describe, it, expect } from 'vitest'
import {
    INSTALL_STATES,
    DISMISS_DAYS,
    isStandalone,
    classifyBrowser,
    bannerMayShow,
    installState,
    hasGuidance,
} from './installState.js'

const DAY_MS = 24 * 60 * 60 * 1000

const UA = {
    iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1',
    iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15',
    iosEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/130.0.0.0 Mobile/15E148 Safari/605.1.15',
    iosInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0 (iPhone14,5)',
    iosFacebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.0]',
    iosBareWebView: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    androidWebView: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36',
    androidFacebook: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0]',
    androidInstagram: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android',
    desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    desktopSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}

const NOW = 1_800_000_000_000

describe('standalone detection', () => {
    it('is true when the display-mode media query matches', () => {
        const win = { matchMedia: () => ({ matches: true }), navigator: {} }
        expect(isStandalone(win)).toBe(true)
    })

    it('is true when the iOS navigator.standalone flag is set', () => {
        const win = { matchMedia: () => ({ matches: false }), navigator: { standalone: true } }
        expect(isStandalone(win)).toBe(true)
    })

    it('is false in a plain browser tab and when there is no window', () => {
        const win = { matchMedia: () => ({ matches: false }), navigator: {} }
        expect(isStandalone(win)).toBe(false)
        expect(isStandalone(undefined)).toBe(false)
    })

    it('is false rather than throwing when matchMedia misbehaves', () => {
        const win = { matchMedia: () => { throw new Error('boom') }, navigator: {} }
        expect(isStandalone(win)).toBe(false)
    })
})

describe('browser classification', () => {
    it('recognises iOS Safari', () => {
        expect(classifyBrowser({ userAgent: UA.iosSafari })).toEqual({ os: 'ios', kind: 'safari' })
    })

    it('recognises other iOS browsers by their own token', () => {
        for (const ua of [UA.iosChrome, UA.iosFirefox, UA.iosEdge]) {
            expect(classifyBrowser({ userAgent: ua })).toEqual({ os: 'ios', kind: 'ios-other' })
        }
    })

    it('treats an iOS UA without a Safari token as an in-app web view', () => {
        expect(classifyBrowser({ userAgent: UA.iosBareWebView }).kind).toBe('in-app')
    })

    it('recognises in-app browsers on iOS and Android', () => {
        expect(classifyBrowser({ userAgent: UA.iosInstagram })).toEqual({ os: 'ios', kind: 'in-app' })
        expect(classifyBrowser({ userAgent: UA.iosFacebook })).toEqual({ os: 'ios', kind: 'in-app' })
        expect(classifyBrowser({ userAgent: UA.androidFacebook })).toEqual({ os: 'android', kind: 'in-app' })
        expect(classifyBrowser({ userAgent: UA.androidInstagram })).toEqual({ os: 'android', kind: 'in-app' })
        expect(classifyBrowser({ userAgent: UA.androidWebView })).toEqual({ os: 'android', kind: 'in-app' })
    })

    it('treats iPadOS desktop-mode Safari as iOS Safari', () => {
        const result = classifyBrowser({ userAgent: UA.desktopSafari, platform: 'MacIntel', maxTouchPoints: 5 })
        expect(result).toEqual({ os: 'ios', kind: 'safari' })
    })

    it('does not mistake a real Mac for an iPad', () => {
        const result = classifyBrowser({ userAgent: UA.desktopSafari, platform: 'MacIntel', maxTouchPoints: 0 })
        expect(result.os).toBe('other')
    })

    it('copes with missing input', () => {
        expect(classifyBrowser()).toEqual({ os: 'other', kind: 'browser' })
    })
})

describe('dismissed banner timing', () => {
    it('stays hidden just inside the dismissal window', () => {
        expect(bannerMayShow(NOW - DISMISS_DAYS * DAY_MS + 1, NOW)).toBe(false)
    })

    it('shows again at exactly the dismissal window', () => {
        expect(bannerMayShow(NOW - DISMISS_DAYS * DAY_MS, NOW)).toBe(true)
    })

    it('shows again after the dismissal window', () => {
        expect(bannerMayShow(NOW - DISMISS_DAYS * DAY_MS - 1, NOW)).toBe(true)
    })

    it('is hidden right after a dismissal', () => {
        expect(bannerMayShow(NOW, NOW)).toBe(false)
    })

    it('shows when never dismissed or when the stored value is garbage', () => {
        expect(bannerMayShow(null, NOW)).toBe(true)
        expect(bannerMayShow(undefined, NOW)).toBe(true)
        expect(bannerMayShow(NaN, NOW)).toBe(true)
        expect(bannerMayShow('yesterday', NOW)).toBe(true)
    })

    it('shows when the stored timestamp is in the future (bad clock)', () => {
        expect(bannerMayShow(NOW + DAY_MS, NOW)).toBe(true)
    })
})

describe('install state decision', () => {
    it('reports an Android browser with a held event as android-prompt', () => {
        const r = installState({ userAgent: UA.androidChrome, hasDeferredPrompt: true, now: NOW })
        expect(r.state).toBe(INSTALL_STATES.ANDROID_PROMPT)
    })

    it('reports iOS Safari as ios-safari-steps', () => {
        const r = installState({ userAgent: UA.iosSafari, now: NOW })
        expect(r.state).toBe(INSTALL_STATES.IOS_SAFARI_STEPS)
        expect(r.os).toBe('ios')
    })

    it('reports iOS Chrome, Firefox and Edge as ios-open-in-safari', () => {
        for (const ua of [UA.iosChrome, UA.iosFirefox, UA.iosEdge]) {
            expect(installState({ userAgent: ua, now: NOW }).state).toBe(INSTALL_STATES.IOS_OPEN_IN_SAFARI)
        }
    })

    it('reports in-app browsers as in-app-browser and keeps the platform for the copy', () => {
        const ios = installState({ userAgent: UA.iosInstagram, now: NOW })
        const android = installState({ userAgent: UA.androidFacebook, now: NOW })
        expect(ios.state).toBe(INSTALL_STATES.IN_APP_BROWSER)
        expect(ios.os).toBe('ios')
        expect(android.state).toBe(INSTALL_STATES.IN_APP_BROWSER)
        expect(android.os).toBe('android')
    })

    it('reports an already-installed app seen from a tab', () => {
        const viaRelated = installState({ userAgent: UA.androidChrome, installedRelatedApp: true, now: NOW })
        const viaEvent = installState({ userAgent: UA.androidChrome, installedThisSession: true, now: NOW })
        expect(viaRelated.state).toBe(INSTALL_STATES.ANDROID_ALREADY_INSTALLED)
        expect(viaEvent.state).toBe(INSTALL_STATES.ANDROID_ALREADY_INSTALLED)
    })

    it('offers nothing on desktop or an Android browser without an install event', () => {
        expect(installState({ userAgent: UA.desktopChrome, now: NOW }).state).toBe(INSTALL_STATES.UNSUPPORTED)
        expect(installState({ userAgent: UA.androidChrome, now: NOW }).state).toBe(INSTALL_STATES.UNSUPPORTED)
    })

    it('lets a held event outrank every user-agent guess', () => {
        for (const ua of [UA.iosSafari, UA.iosChrome, UA.iosInstagram, UA.androidWebView, UA.desktopChrome]) {
            expect(installState({ userAgent: ua, hasDeferredPrompt: true, now: NOW }).state)
                .toBe(INSTALL_STATES.ANDROID_PROMPT)
        }
    })

    it('lets a held event outrank an already-installed signal', () => {
        const r = installState({
            userAgent: UA.androidChrome, hasDeferredPrompt: true, installedRelatedApp: true, now: NOW,
        })
        expect(r.state).toBe(INSTALL_STATES.ANDROID_PROMPT)
    })

    it('always reports installed when running standalone', () => {
        for (const ua of [UA.iosSafari, UA.iosChrome, UA.iosInstagram, UA.androidChrome, UA.desktopChrome]) {
            const r = installState({
                userAgent: ua,
                standalone: true,
                hasDeferredPrompt: true,
                installedRelatedApp: true,
                installedThisSession: true,
                now: NOW,
            })
            expect(r.state).toBe(INSTALL_STATES.INSTALLED)
        }
    })

    it('carries banner dismissal through without changing the state', () => {
        const hidden = installState({ userAgent: UA.iosSafari, dismissedAt: NOW - DAY_MS, now: NOW })
        const shown = installState({ userAgent: UA.iosSafari, dismissedAt: NOW - DISMISS_DAYS * DAY_MS, now: NOW })
        expect(hidden.state).toBe(INSTALL_STATES.IOS_SAFARI_STEPS)
        expect(hidden.bannerMayShow).toBe(false)
        expect(shown.bannerMayShow).toBe(true)
    })
})

describe('which states show guidance', () => {
    it('hides guidance for installed and unsupported only', () => {
        expect(hasGuidance(INSTALL_STATES.INSTALLED)).toBe(false)
        expect(hasGuidance(INSTALL_STATES.UNSUPPORTED)).toBe(false)
        for (const s of [
            INSTALL_STATES.ANDROID_PROMPT,
            INSTALL_STATES.ANDROID_ALREADY_INSTALLED,
            INSTALL_STATES.IOS_SAFARI_STEPS,
            INSTALL_STATES.IOS_OPEN_IN_SAFARI,
            INSTALL_STATES.IN_APP_BROWSER,
        ]) {
            expect(hasGuidance(s)).toBe(true)
        }
    })
})
