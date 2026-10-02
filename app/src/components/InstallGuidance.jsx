/**
 * components/InstallGuidance.jsx — "put Combat OS on your home screen" (W38).
 *
 * One component, three surfaces, chosen by `variant`:
 *   signin  — sign-in screen, always shown in a browser tab. iPhone users
 *             must add the app BEFORE signing in: iOS keeps the home-screen
 *             app's storage separate from Safari's, so a Safari sign-in does
 *             not carry over.
 *   banner  — small dismissible strip after sign-in ("Not now" hides it for
 *             seven days on this device).
 *   about   — More › About; never dismissible.
 *
 * Renders nothing inside the installed app, and nothing when there is
 * nothing useful to offer. The Install button exists only while a real
 * install event is held — see utils/installState.js.
 *
 * Copy is plain second person for a client. The home-screen name is
 * "Combat OS".
 */
import { useState } from 'react'
import { useInstallState } from '../hooks/useInstallState.js'
import { INSTALL_STATES, hasGuidance } from '../utils/installState.js'

function ShareGlyph() {
    return (
        <svg
            className="install-guide__glyph"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 15V3" />
            <path d="M8 7l4-4 4 4" />
            <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
        </svg>
    )
}

function IosSteps({ lastStep }) {
    return (
        <ol className="install-guide__steps">
            <li>
                <span className="install-guide__num">1</span>
                <span>Tap the Share button <ShareGlyph /> in Safari.</span>
            </li>
            <li>
                <span className="install-guide__num">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
            </li>
            <li>
                <span className="install-guide__num">3</span>
                <span>{lastStep}</span>
            </li>
        </ol>
    )
}

const ALREADY_INSTALLED = 'You already have Combat OS — open it from your home screen.'
const SAFARI_HINT = "Don't see Add to Home Screen? Open this page in Safari."
const STEP3_FULL = 'After adding it, open Combat OS from your home screen and sign in there.'
const STEP3_BANNER = 'Open Combat OS from your home screen and sign in again.'

export default function InstallGuidance({ variant }) {
    const { state, os, bannerMayShow, promptInstall, dismiss } = useInstallState()
    const [stepsOpen, setStepsOpen] = useState(false)

    if (!hasGuidance(state)) return null
    const isBanner = variant === 'banner'
    if (isBanner && !bannerMayShow) return null

    const notNow = isBanner && (
        <button type="button" className="install-guide__ghost" onClick={dismiss}>
            Not now
        </button>
    )
    const installButton = (
        <button type="button" className="install-guide__primary" onClick={promptInstall}>
            Install app
        </button>
    )

    let body = null
    switch (state) {
        case INSTALL_STATES.ANDROID_PROMPT:
            body = (
                <>
                    {isBanner ? (
                        <p className="install-guide__text">
                            Install Combat OS so it opens like any other app.
                        </p>
                    ) : (
                        <>
                            <div className="install-guide__title">Put Combat OS on your home screen</div>
                            <p className="install-guide__text">
                                Install it once and it opens like any other app, even with no signal at the gym.
                            </p>
                        </>
                    )}
                    <div className="install-guide__actions">
                        {installButton}
                        {notNow}
                    </div>
                </>
            )
            break

        case INSTALL_STATES.ANDROID_ALREADY_INSTALLED:
            body = (
                <>
                    <p className="install-guide__text">{ALREADY_INSTALLED}</p>
                    {notNow && <div className="install-guide__actions">{notNow}</div>}
                </>
            )
            break

        case INSTALL_STATES.IOS_SAFARI_STEPS:
            if (isBanner) {
                body = (
                    <>
                        <p className="install-guide__text">Add Combat OS to your home screen.</p>
                        {stepsOpen && (
                            <>
                                <IosSteps lastStep={STEP3_BANNER} />
                                <p className="install-guide__hint">{SAFARI_HINT}</p>
                            </>
                        )}
                        <div className="install-guide__actions">
                            {!stepsOpen && (
                                <button
                                    type="button"
                                    className="install-guide__primary"
                                    onClick={() => setStepsOpen(true)}
                                >
                                    Show me how
                                </button>
                            )}
                            {notNow}
                        </div>
                    </>
                )
            } else if (variant === 'signin') {
                body = (
                    <>
                        <div className="install-guide__title">Add Combat OS to your home screen first</div>
                        <p className="install-guide__text">
                            Do this before you sign in, so you only sign in once.
                        </p>
                        <IosSteps lastStep={STEP3_FULL} />
                        <p className="install-guide__hint">
                            Signing in here in Safari will not carry over to the home screen app.{' '}
                            {SAFARI_HINT}
                        </p>
                    </>
                )
            } else {
                body = (
                    <>
                        <div className="install-guide__title">Add Combat OS to your home screen</div>
                        <IosSteps lastStep={STEP3_FULL} />
                        <p className="install-guide__hint">{SAFARI_HINT}</p>
                    </>
                )
            }
            break

        case INSTALL_STATES.IOS_OPEN_IN_SAFARI:
            body = (
                <>
                    <p className="install-guide__text">
                        Open this page in Safari to add Combat OS to your home screen.
                    </p>
                    {notNow && <div className="install-guide__actions">{notNow}</div>}
                </>
            )
            break

        case INSTALL_STATES.IN_APP_BROWSER:
            body = (
                <>
                    <p className="install-guide__text">
                        {os === 'ios'
                            ? 'Open this page in Safari to install Combat OS.'
                            : 'Open this page in Chrome to install Combat OS.'}
                    </p>
                    {notNow && <div className="install-guide__actions">{notNow}</div>}
                </>
            )
            break

        default:
            return null
    }

    return (
        <div
            className={`install-guide install-guide--${variant}`}
            role={isBanner ? 'status' : undefined}
        >
            {body}
        </div>
    )
}
