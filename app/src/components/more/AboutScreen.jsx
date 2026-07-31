/**
 * AboutScreen.jsx — More › About & Help (W29).
 *
 * Practical support information, and the plain-language answer to "what does
 * this app do with my data" for someone onboarded to it who does not know or
 * care about the architecture.
 *
 * Install state matters enough to surface: an installed home-screen app is
 * exempt from Safari's 7-day ITP storage deletion, while a browser tab is not.
 * A browser-only user is the one who most needs to export backups, so the
 * status is shown rather than assumed.
 */
import { db, useDB } from '../../db/index.jsx'

// Same detection DailyIgnition.jsx uses (`navigator.standalone` is the iOS
// home-screen flag, which does not implement the display-mode media query).
function isInstalled() {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone
}

export default function AboutScreen() {
    const { storagePersisted } = useDB()
    const installed = isInstalled()

    return (
        <>
            <div className="card">
                <div className="section-header blue">ℹ️ About</div>
                <div className="more-body">
                    <Row label="Data version" value={`v${db.verno}`} />
                    <Row label="Installed" value={installed ? 'Yes — home screen app' : 'No — running in a browser tab'} />
                    <Row
                        label="Storage"
                        value={storagePersisted === null
                            ? 'checking…'
                            : storagePersisted ? 'Persistent' : 'Best-effort'}
                    />
                </div>
            </div>

            <div className="card">
                <div className="section-header green">📖 How this works</div>
                <div className="more-body">
                    <p className="more-note">
                        Your workouts are saved on this device first, so the app keeps working with
                        no signal at the gym. When you have a connection they sync to your account.
                    </p>
                    <p className="more-note">
                        Your checklist and notes stay on this device only. They are never uploaded,
                        which also means a full backup from <strong>Backup &amp; Data</strong> is
                        the only copy of them.
                    </p>
                    {!installed && (
                        <p className="more-note more-note--warn">
                            You are running in a browser tab. Adding the app to your home screen
                            protects its data from being cleared automatically — and until you do,
                            export a backup regularly.
                        </p>
                    )}
                </div>
            </div>
        </>
    )
}

function Row({ label, value }) {
    return (
        <div className="more-row">
            <span className="more-row__label">{label}</span>
            <span className="more-row__value">{value}</span>
        </div>
    )
}
