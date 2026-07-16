/**
 * BagBlock.jsx
 * Renders the 🥊 VARGA BAG WORK section.
 *
 * W10: collapsible. `open`/`onToggle` are UI-only props owned by DBProvider
 * (survive tab/hub switches). All logged-value props/callbacks unchanged.
 */
export default function BagBlock({ slot, open, onToggle, bagRounds, onBagRoundsChange, bagCourse, onBagCourseChange, bagModules, onBagModulesChange, bagWorkouts, onBagWorkoutsChange, notes, onNotesChange }) {
    const roundsLogged = Number(bagRounds) || 0

    return (
        <div className={`card card--collapsible${open ? ' open' : ''}`}>
            <button
                type="button"
                className="section-header red card__toggle"
                onClick={onToggle}
                aria-expanded={!!open}
            >
                <span>🥊 Bag Work</span>
                {!open && roundsLogged > 0 && (
                    <span className="card__summary">{roundsLogged} round{roundsLogged === 1 ? '' : 's'} logged</span>
                )}
                <span className="card__chevron" aria-hidden="true">▾</span>
            </button>

            <div className="card__body">
                {slot ? (
                    <>

                        <div className="bag-rounds-row">
                            <label htmlFor="bag-rounds">Rounds done:</label>
                            <input
                                id="bag-rounds"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="12"
                                placeholder="0"
                                value={bagRounds}
                                onChange={e => onBagRoundsChange(e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '12px 14px', color: 'var(--dim)', fontSize: '0.85rem' }}>
                        No bag work for this day.
                    </div>
                )}

                <div className="notes-section" style={{ borderTop: '1px solid var(--divider)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        <div>
                            <label htmlFor="bag-course">Course Followed</label>
                            <input
                                id="bag-course"
                                type="text"
                                placeholder="e.g. Varga, Gabriel Varga, etc."
                                value={bagCourse}
                                onChange={e => onBagCourseChange(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="bag-modules">Module(s) Completed</label>
                            <input
                                id="bag-modules"
                                type="text"
                                placeholder="e.g. Counters 1"
                                value={bagModules}
                                onChange={e => onBagModulesChange(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="bag-workouts">Workout(s) Completed</label>
                            <input
                                id="bag-workouts"
                                type="text"
                                placeholder="e.g. 4.1 Bagwork Counters"
                                value={bagWorkouts}
                                onChange={e => onBagWorkoutsChange(e.target.value)}
                            />
                        </div>
                    </div>
                    <label htmlFor="session-notes">Session Notes</label>
                    <textarea
                        id="session-notes"
                        placeholder="How did it feel? Any PRs? Injuries?"
                        value={notes}
                        onChange={e => onNotesChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}
