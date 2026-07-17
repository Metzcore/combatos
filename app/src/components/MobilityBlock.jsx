/**
 * MobilityBlock.jsx
 * Renders the 🔥 MOBILITY & INJURY PREP section.
 * Each slot shows exercise name, duration, cue, and a checkbox.
 *
 * W10.1: collapsible (default OPEN — this is the day's core work).
 * `open`/`onToggle` are UI-only props owned by DBProvider. No auto-expand:
 * manual toggle only. Value props/callbacks unchanged.
 */
export default function MobilityBlock({ slots, checked, onCheck, open, onToggle }) {
    if (!slots || slots.length === 0) return null

    const doneCount = slots.filter(s => checked[s.slot]).length

    return (
        <div className={`card card--collapsible${open ? ' open' : ''}`}>
            <button
                type="button"
                className="section-header amber card__toggle"
                onClick={onToggle}
                aria-expanded={!!open}
            >
                <span>🔥 Mobility &amp; Injury Prep</span>
                {!open && doneCount > 0 && (
                    <span className="card__summary">{doneCount} of {slots.length} done</span>
                )}
                <span className="card__chevron" aria-hidden="true">▾</span>
            </button>

            <div className="card__body">
                {slots.map((slot, idx) => (
                    <div
                        key={slot.key || idx}
                        className={`mob-row${checked[slot.slot] ? ' done' : ''}`}
                    >
                        <div className="mob-row__info">
                            <div className="mob-row__name">
                                {slot.isHighAlert && <span className="badge badge-red" style={{ marginRight: 6 }}>🔴 HA</span>}
                                {slot.exercise}
                            </div>
                            {slot.duration && (
                                <div className="mob-row__meta">⏱ {slot.duration}</div>
                            )}
                            {slot.cue && (
                                <div className="mob-row__cue">💬 {slot.cue}</div>
                            )}
                        </div>
                        <input
                            type="checkbox"
                            checked={!!checked[slot.slot]}
                            onChange={e => onCheck(slot.slot, e.target.checked)}
                            aria-label={`${slot.exercise} done`}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
