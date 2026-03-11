/**
 * FightGymDay.jsx
 * Rendered when Day 2 or Day 4 is selected.
 * Supports swappable session types (Combat vs Cardio vs Mobility).
 */
export default function FightGymDay({
    day,
    sessionType, onSessionTypeChange,
    bagRounds, onBagRoundsChange,
    altRows, onAltRowsChange,
    altDuration, onAltDurationChange,
    notes, onNotesChange,
    onLog
}) {
    const isCombat = sessionType === 'Combat'

    const addAltRow = () => {
        onAltRowsChange([...altRows, { id: Date.now(), name: '', v1: '', v2: '', v3: '' }])
    }

    const updateAltRow = (id, field, value) => {
        onAltRowsChange(altRows.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const removeAltRow = (id) => {
        onAltRowsChange(altRows.filter(r => r.id !== id))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="selector-row" style={{ gridTemplateColumns: '1fr', padding: '10px 14px' }}>
                <div className="selector-group">
                    <label>Session Type</label>
                    <select value={sessionType} onChange={e => onSessionTypeChange(e.target.value)} style={{ fontSize: '1rem', padding: '10px' }}>
                        <option value="Combat">🥊 Combat Session</option>
                        <option value="Cardio">🏃 Cardio & Core</option>
                        <option value="Mobility">🧘 Recovery & Mobility</option>
                    </select>
                </div>
            </div>

            {isCombat ? (
                <>
                    <div className="fight-gym-banner">
                        <div className="icon">🥊</div>
                        <h2>Fight Gym Day</h2>
                        <p>Day {day} is a Combat Session — no S&amp;C today.</p>
                        <p style={{ marginTop: 4 }}>Log your rounds and notes below.</p>
                    </div>

                    <div className="card">
                        <div className="section-header red">🥊 Bag / Sparring</div>
                        <div className="bag-rounds-row">
                            <label htmlFor="fight-rounds">Rounds completed:</label>
                            <input
                                id="fight-rounds"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="20"
                                placeholder="0"
                                value={bagRounds}
                                onChange={e => onBagRoundsChange(e.target.value)}
                            />
                        </div>
                        <div className="notes-section" style={{ borderTop: '1px solid var(--divider)' }}>
                            <label htmlFor="fight-notes">Session Notes</label>
                            <textarea
                                id="fight-notes"
                                placeholder="Sparring notes, coach feedback..."
                                value={notes}
                                onChange={e => onNotesChange(e.target.value)}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="card">
                    <div className={`section-header ${sessionType === 'Cardio' ? 'blue' : 'green'}`}>
                        {sessionType === 'Cardio' ? '🏃 Cardio & Core Tracker' : '🧘 Mobility Tracker'}
                    </div>

                    <div style={{ padding: 14 }}>
                        {altRows.map((row, idx) => (
                            <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--dim)', fontWeight: 700, textTransform: 'uppercase' }}>Movement {idx + 1}</span>
                                    <button onClick={() => removeAltRow(row.id)} style={{ background: 'transparent', border: 'none', color: 'var(--alert)', fontSize: '1.2rem', padding: '0 5px' }}>×</button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Exercise Name (e.g. Sprints)"
                                    value={row.name}
                                    onChange={e => updateAltRow(row.id, 'name', e.target.value)}
                                    style={{ fontWeight: 'bold', color: 'var(--text)' }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                    <input type="text" placeholder={sessionType === 'Cardio' ? "Work" : "Metric"} value={row.v1} onChange={e => updateAltRow(row.id, 'v1', e.target.value)} />
                                    <input type="text" placeholder={sessionType === 'Cardio' ? "Rest" : "Sets"} value={row.v2} onChange={e => updateAltRow(row.id, 'v2', e.target.value)} />
                                    <input type="text" placeholder={sessionType === 'Cardio' ? "Rounds" : "Time"} value={row.v3} onChange={e => updateAltRow(row.id, 'v3', e.target.value)} />
                                </div>
                            </div>
                        ))}

                        <button className="btn-secondary" onClick={addAltRow} style={{ marginTop: altRows.length > 0 ? 0 : 4, borderStyle: 'dashed' }}>
                            + ADD MOVEMENT
                        </button>
                    </div>

                    <div style={{ borderTop: '1px solid var(--divider)', padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--label)', whiteSpace: 'nowrap' }}>Total Time (mins):</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={altDuration}
                                onChange={e => onAltDurationChange(e.target.value)}
                                style={{ maxWidth: 80, fontSize: '1.1rem' }}
                            />
                        </div>
                        <div className="notes-section" style={{ padding: 0 }}>
                            <label>Session Notes</label>
                            <textarea
                                placeholder="How did it feel...?"
                                value={notes}
                                onChange={e => onNotesChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
