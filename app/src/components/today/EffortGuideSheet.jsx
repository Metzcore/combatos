/**
 * components/today/EffortGuideSheet.jsx — A7b explanatory sheet for RPE /
 * RIR / %1RM. Explanatory only — no math changes; the legacy %1RM/e1RM
 * calculation (hooks/useHistory.js, utils/math.js) is untouched and unread
 * by anything here.
 */
import BottomSheet from '../BottomSheet.jsx'

export default function EffortGuideSheet({ open, onClose }) {
    return (
        <BottomSheet open={open} onClose={onClose} title="RPE, RIR & %1RM">
            <div className="effort-guide">
                <p className="sheet__copy">
                    <strong>RPE (Rate of Perceived Exertion)</strong> — a 0–10 scale for how hard a
                    set felt. RPE 8 means you could have done about 2 more reps.
                </p>
                <p className="sheet__copy">
                    <strong>RIR (Reps in Reserve)</strong> — a direct count of reps left in the tank.
                    RIR 2 means the same thing as RPE 8, phrased the other way round.
                </p>
                <p className="sheet__copy">
                    <strong>%1RM</strong> — a percentage of your one-rep max, set by the program as
                    authored load guidance. It's preserved in your record as the PRESCRIPTION for
                    this set — it is not itself a performed input. What you actually did (kg, reps,
                    and the applicable RPE/RIR) is what's recorded as performed.
                </p>
            </div>
            <button type="button" className="btn-primary" onClick={onClose}>Got it</button>
        </BottomSheet>
    )
}
