/**
 * StrengthBlock.jsx
 * Renders the 💪 STRENGTH + PAP SUPERSETS section.
 * Dynamically renders 3 or 4 exercise cards depending on what the playbook has.
 * Each exercise has 4 set rows (load + reps) and a PAP checkbox row.
 */
import { useHistory } from '../hooks/useHistory.js'

function SetRow({ exIdx, setNum, sets, onSetChange, playbookKey, hasPap }) {
    const key = `ex${exIdx + 1}-s${setNum}`
    const entry = sets[key] || {}
    const { lastKg, lastReps, suggestedKg } = useHistory(playbookKey, setNum)

    return (
        <div className="str-set-row" style={hasPap ? { gridTemplateColumns: '50px 1fr 1fr 1fr', padding: '6px 8px' } : {}}>
            <span className="str-set-label">Set {setNum}</span>
            <div>
                <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    min="0"
                    step="0.5"
                    value={entry.kg ?? ''}
                    onChange={e => onSetChange(key, 'kg', e.target.value)}
                    aria-label={`Exercise ${exIdx + 1} set ${setNum} weight in kg`}
                />
                {(lastKg || suggestedKg) && (
                    <div className="history-badge">
                        {lastKg && <span>Last: {lastKg}kg </span>}
                        {suggestedKg && <span style={{ color: 'var(--blue)', fontWeight: 700 }}>| TGT: ~{suggestedKg}kg</span>}
                    </div>
                )}
            </div>
            <div>
                <input
                    type="number"
                    inputMode="numeric"
                    placeholder="reps"
                    min="0"
                    step="1"
                    value={entry.reps ?? ''}
                    onChange={e => onSetChange(key, 'reps', e.target.value)}
                    aria-label={`Exercise ${exIdx + 1} set ${setNum} reps`}
                />
                {lastReps && (
                    <div className="history-badge">Last: {lastReps}</div>
                )}
            </div>
            {hasPap && (
                <div>
                    <input
                        type="number"
                        inputMode="numeric"
                        placeholder="pap"
                        min="0"
                        step="1"
                        value={entry.papReps ?? ''}
                        onChange={e => onSetChange(key, 'papReps', e.target.value)}
                        aria-label={`Exercise ${exIdx + 1} set ${setNum} PAP reps`}
                    />
                </div>
            )}
        </div>
    )
}

function ExerciseCard({ slot, exIdx, sets, onSetChange }) {
    const numSets = slot.sets || 4
    const hasPap = !!slot.pap?.exercise
    // W10 Option C — gym-standard superset notation: main lift = A1, its PAP
    // pairing = A2 (same letter). Unpaired lifts show the bare letter.
    const letter = String.fromCharCode(65 + exIdx) // A, B, C, D

    return (
        <div className={`str-card${hasPap ? ' str-card--paired' : ''}`}>
            <div className="str-card__header">
                <div>
                    <div className="str-card__eyebrow">
                        <span className={`superset-badge${hasPap ? ' superset-badge--paired' : ''}`}>
                            {hasPap ? `${letter}1` : letter}
                        </span>
                        {hasPap && <span className="str-card__eyebrow-label">Superset · PAP pairing</span>}
                    </div>
                    <div className="str-card__name">{slot.exercise}</div>
                    {slot.targetReps && (
                        <div className="str-card__target">Target: {slot.targetReps} {slot.loadNote && `| ${slot.loadNote}`}</div>
                    )}
                    {slot.cue && (
                        <div className="str-card__cue">💡 {slot.cue}</div>
                    )}
                </div>
            </div>

            {hasPap && (
                <div className="pap-pair-row">
                    <span className="superset-badge superset-badge--paired">{letter}2</span>
                    <div className="pap-pair-row__text">
                        ⚡ PAP: {slot.pap.exercise} {slot.pap.sets && `(${slot.pap.sets}×${slot.pap.reps})`}
                    </div>
                </div>
            )}

            <div className="str-set-header" style={hasPap ? { gridTemplateColumns: '50px 1fr 1fr 1fr', padding: '6px 8px' } : {}}>
                <span>Set</span>
                <span>Load</span>
                <span>Reps</span>
                {hasPap && <span>PAP</span>}
            </div>

            {Array.from({ length: numSets }, (_, i) => (
                <SetRow
                    key={i}
                    exIdx={exIdx}
                    setNum={i + 1}
                    sets={sets}
                    onSetChange={onSetChange}
                    playbookKey={slot.key}
                    hasPap={hasPap}
                />
            ))}
        </div>
    )
}

export default function StrengthBlock({ slots, sets, onSetChange }) {
    if (!slots || slots.length === 0) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="section-header red">💪 Strength + PAP Supersets</div>
            {slots.map((slot, idx) => (
                <ExerciseCard
                    key={slot.key || idx}
                    slot={slot}
                    exIdx={idx}
                    sets={sets}
                    onSetChange={onSetChange}
                />
            ))}
        </div>
    )
}
