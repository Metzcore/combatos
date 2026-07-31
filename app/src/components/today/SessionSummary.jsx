/**
 * components/today/SessionSummary.jsx — A7b session-summary step (D11
 * point 2, corrective plan §4). Two preparation checkboxes (Warm-up,
 * Cooldown) + seven activity chips + the conditional `otherActivity` field +
 * the session notes field via FocusedNoteEditor. All nine IDs write into
 * ONE `sessionActivities` array — the checkbox/chip split is presentational
 * only, never a payload distinction (schema §4).
 *
 * `otherActivity` is bounded via `maxLength={120}` at the input AND left for
 * the validator to reject if somehow still over-length or multi-line —
 * user text is never silently truncated.
 */
import FocusedNoteEditor from '../FocusedNoteEditor.jsx'
// W26 Stage 1: these two lists were local consts here until the Log hub's
// Overview needed the same labels. Moved verbatim to utils/sessionActivityLabels.js
// so the two surfaces cannot drift apart; the rendering below is unchanged.
import {
    PREPARATION_ACTIVITIES as PREPARATION,
    CHIP_ACTIVITIES as ACTIVITY_CHIPS,
} from '../../utils/sessionActivityLabels.js'

export default function SessionSummary({
    sessionActivities, onToggleActivity,
    otherActivity, onOtherActivityChange,
    notes, onNotesChange,
}) {
    const has = (id) => sessionActivities.includes(id)

    return (
        <div className="today-session-summary card">
            {/* A11 Today polish: eyebrow title so the card reads as the
                session's closing section in the page hierarchy, not an
                unlabeled group of fields. Presentation only. */}
            <div className="today-session-summary__title">Session summary</div>
            <div className="today-session-summary__section-label">Preparation</div>
            <div className="today-session-summary__checks">
                {PREPARATION.map(({ id, label }) => (
                    <label key={id} className="today-session-summary__check">
                        <input
                            type="checkbox"
                            checked={has(id)}
                            onChange={() => onToggleActivity(id)}
                        />
                        {label}
                    </label>
                ))}
            </div>

            <div className="today-session-summary__section-label">Activities</div>
            <div className="today-session-summary__chips">
                {ACTIVITY_CHIPS.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        className={`today-chip${has(id) ? ' today-chip--active' : ''}`}
                        onClick={() => onToggleActivity(id)}
                        aria-pressed={has(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {has('other') && (
                <input
                    type="text"
                    className="today-session-summary__other-input"
                    value={otherActivity}
                    onChange={(e) => onOtherActivityChange(e.target.value)}
                    placeholder="What else? (max 120 characters)"
                    maxLength={120}
                    aria-label="Other activity description"
                />
            )}

            <div className="today-session-summary__section-label">Session notes</div>
            <FocusedNoteEditor label="Session notes" value={notes} onChange={onNotesChange} />
        </div>
    )
}
