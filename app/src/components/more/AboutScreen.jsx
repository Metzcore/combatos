/**
 * AboutScreen.jsx — More › About (W29; "& Help" and the data explanation
 * moved into the Guide, W39).
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
import { isStandalone } from '../../utils/installState.js'
import { currentBuildLabel } from '../../utils/buildLabel.js'
import InstallGuidance from '../InstallGuidance.jsx'

export default function AboutScreen() {
    const { storagePersisted } = useDB()
    const installed = isStandalone()

    return (
        <>
            <div className="card">
                <div className="section-header blue">ℹ️ About</div>
                <div className="more-body">
                    <Row label="Version" value={currentBuildLabel()} />
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

            {!installed && (
                <div className="card">
                    <div className="section-header green">📲 Add to home screen</div>
                    <div className="more-body">
                        <InstallGuidance variant="about" />
                        <p className="more-note more-note--warn">
                            You are running in a browser tab. Adding the app to your home screen
                            protects its data from being cleared automatically — and until you do,
                            export a backup regularly.
                        </p>
                    </div>
                </div>
            )}
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
