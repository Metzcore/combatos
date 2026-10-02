/**
 * components/UpdateBanner.jsx — "a new version is ready" strip (W40).
 *
 * In flow at the very top of the app shell (never fixed), like W38's install
 * banner, so it reserves its own space and cannot cover Finish, the weight
 * rail or the bottom nav. AppShell decides WHETHER it shows (resolveBanner,
 * never during a workout); this only renders. It never reloads anything
 * itself: only the Restart tap does.
 */
export default function UpdateBanner({ status, onRestart, onLater }) {
    let text = 'A new version of Combat OS is ready.'
    let actions = (
        <>
            <button type="button" className="install-guide__primary" onClick={onRestart}>
                Restart
            </button>
            <button type="button" className="install-guide__ghost" onClick={onLater}>
                Later
            </button>
        </>
    )

    if (status === 'external') {
        text = 'Combat OS was updated in another window — Restart to load it.'
    } else if (status === 'restarting') {
        text = 'Restarting…'
        actions = null
    } else if (status === 'failed') {
        text = 'Update installed — close and reopen Combat OS.'
        actions = (
            <button type="button" className="install-guide__ghost" onClick={onLater}>
                OK
            </button>
        )
    }

    return (
        <div className="install-guide install-guide--banner" role="status" aria-live="polite">
            <p className="install-guide__text">{text}</p>
            {actions && <div className="install-guide__actions">{actions}</div>}
        </div>
    )
}
