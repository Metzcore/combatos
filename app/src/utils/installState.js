/**
 * utils/installState.js — which "put Combat OS on your home screen" guidance
 * applies to this browser (W38).
 *
 * Pure: every input is injected (user agent, standalone flag, whether a
 * deferred `beforeinstallprompt` event is held, the related-apps result, the
 * dismissal timestamp, "now"), so every state is unit-testable in node.
 * Capturing the event itself lives in installCapture.js; reading storage and
 * navigator lives in hooks/useInstallState.js.
 *
 * ── THE ONE RULE ─────────────────────────────────────────────────────────
 * A wrong guess must produce WEAKER guidance, never a broken control. An
 * Install BUTTON is therefore offered only when a real `beforeinstallprompt`
 * event is held (`hasDeferredPrompt`) — never inferred from a user agent.
 * User-agent sniffing only chooses between words and illustrated steps.
 *
 * Priority (first match wins):
 *   1. standalone                         → installed
 *   2. a held install event               → android-prompt
 *   3. related-apps says installed, or
 *      `appinstalled` fired this session  → android-already-installed
 *   4. in-app browser (iOS or Android)    → in-app-browser
 *   5. iOS Safari                         → ios-safari-steps
 *   6. iOS Chrome/Firefox/Edge/etc.       → ios-open-in-safari
 *   7. anything else (desktop, Firefox)   → unsupported
 * A held event outranks every UA guess because it is proof the browser can
 * install; standalone outranks everything because nothing should ever be
 * offered inside the installed app.
 */

export const INSTALL_STATES = Object.freeze({
    INSTALLED: 'installed',
    ANDROID_PROMPT: 'android-prompt',
    ANDROID_ALREADY_INSTALLED: 'android-already-installed',
    IOS_SAFARI_STEPS: 'ios-safari-steps',
    IOS_OPEN_IN_SAFARI: 'ios-open-in-safari',
    IN_APP_BROWSER: 'in-app-browser',
    UNSUPPORTED: 'unsupported',
})

export const DISMISS_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

// localStorage key for the banner's "Not now". Per-device convenience only.
export const DISMISS_STORAGE_KEY = 'combatos.installBannerDismissedAt'

// Browsers that embed a web view inside another app. They cannot install.
// Tokens come from each app's published user-agent suffix.
const IN_APP_RE =
    /Instagram|FBAN|FBAV|FB_IAB|FBIOS|MicroMessenger|Line\/|Snapchat|TikTok|musical_ly|Bytedance|LinkedInApp|Pinterest|Twitter/i

// iOS browsers that are not Safari. Their UA still contains "Safari/".
const IOS_OTHER_BROWSER_RE = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|GSA\/|Focus\//i

/**
 * The standalone check that DailyIgnition and AboutScreen used to duplicate.
 * `navigator.standalone` is the iOS home-screen flag, which does not
 * implement the display-mode media query.
 */
export function isStandalone(win = typeof window === 'undefined' ? undefined : window) {
    if (!win) return false
    try {
        if (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches) return true
        return !!(win.navigator && win.navigator.standalone)
    } catch {
        return false
    }
}

/**
 * Classify the browser from injectable navigator values.
 * Returns { os: 'ios' | 'android' | 'other', kind } where kind is one of
 * 'in-app' | 'safari' | 'ios-other' | 'browser'.
 */
export function classifyBrowser({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
    const ua = String(userAgent || '')
    const isIPadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1
    const isIOS = /iPhone|iPad|iPod/.test(ua) || isIPadDesktopMode
    const isAndroid = /Android/i.test(ua)

    if (isIOS) {
        // A WKWebView has no "Safari/" token; real browsers do.
        if (IN_APP_RE.test(ua) || (!isIPadDesktopMode && !/Safari\//.test(ua))) {
            return { os: 'ios', kind: 'in-app' }
        }
        if (IOS_OTHER_BROWSER_RE.test(ua)) return { os: 'ios', kind: 'ios-other' }
        return { os: 'ios', kind: 'safari' }
    }
    if (isAndroid) {
        if (IN_APP_RE.test(ua) || /; wv\)/.test(ua)) return { os: 'android', kind: 'in-app' }
        return { os: 'android', kind: 'browser' }
    }
    return { os: 'other', kind: 'browser' }
}

/**
 * May a dismissed banner show again? Dismissal lasts DISMISS_DAYS.
 * Exactly DISMISS_DAYS later it shows again. A missing, malformed or
 * future-dated timestamp counts as "not dismissed", so a bad clock can never
 * hide the banner forever.
 */
export function bannerMayShow(dismissedAt, now) {
    if (typeof dismissedAt !== 'number' || !Number.isFinite(dismissedAt)) return true
    if (typeof now !== 'number' || !Number.isFinite(now)) return true
    if (dismissedAt > now) return true
    return now - dismissedAt >= DISMISS_DAYS * DAY_MS
}

/**
 * Decide the guidance state.
 * @returns {{ state: string, os: 'ios'|'android'|'other', bannerMayShow: boolean }}
 */
export function installState({
    userAgent = '',
    platform = '',
    maxTouchPoints = 0,
    standalone = false,
    hasDeferredPrompt = false,
    installedRelatedApp = false,
    installedThisSession = false,
    dismissedAt = null,
    now = Date.now(),
} = {}) {
    const { os, kind } = classifyBrowser({ userAgent, platform, maxTouchPoints })
    const mayShow = bannerMayShow(dismissedAt, now)
    const result = (state) => ({ state, os, bannerMayShow: mayShow })

    if (standalone) return result(INSTALL_STATES.INSTALLED)
    if (hasDeferredPrompt) return result(INSTALL_STATES.ANDROID_PROMPT)
    if (installedRelatedApp || installedThisSession) {
        return result(INSTALL_STATES.ANDROID_ALREADY_INSTALLED)
    }
    if (kind === 'in-app') return result(INSTALL_STATES.IN_APP_BROWSER)
    if (kind === 'safari') return result(INSTALL_STATES.IOS_SAFARI_STEPS)
    if (kind === 'ios-other') return result(INSTALL_STATES.IOS_OPEN_IN_SAFARI)
    return result(INSTALL_STATES.UNSUPPORTED)
}

/** True for states that show something to the user. */
export function hasGuidance(state) {
    return state !== INSTALL_STATES.INSTALLED && state !== INSTALL_STATES.UNSUPPORTED
}
