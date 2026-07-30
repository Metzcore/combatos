/**
 * components/today/PerformedConditioningItem.jsx — A7b conditioning item.
 *
 * READ-ONLY guidance (schema §6, D11 point 4): no rounds stepper, no
 * completion tracking of any kind — what actually happened on a
 * conditioning block is recorded through sessionActivities (bag-work/
 * cardio/…) plus free-text notes, not a per-item count. Substitution and an
 * optional per-item note remain, as large one-thumb controls.
 */
import { useState } from 'react'
import ChangeExerciseSheet, { ChangedExerciseNote } from './ChangeExerciseSheet.jsx'
import FocusedNoteEditor from '../FocusedNoteEditor.jsx'
import TodayExerciseReferenceLink from './TodayExerciseReferenceLink.jsx'

export default function PerformedConditioningItem({ item, substitutedName, onSubstitute, note, onNoteChange }) {
    const [subOpen, setSubOpen] = useState(false)
    const displayName = substitutedName || item.name

    return (
        <div className="today-item">
            <div className="today-item__header-row">
                <div className="today-item__name">{displayName}</div>
                <TodayExerciseReferenceLink exerciseId={item.exerciseId} substitutedName={substitutedName} />
            </div>
            <div className="today-item__meta">
                <span><strong>Rounds:</strong> {item.rounds}{item.roundLength ? ` × ${item.roundLength}` : ''}</span>
                {item.rest && <span> · <strong>Rest:</strong> {item.rest}</span>}
            </div>
            {Array.isArray(item.perRound) && item.perRound.length > 0 && (
                <ul className="today-item__perround">
                    {item.perRound.map((line, index) => <li key={index}>{line}</li>)}
                </ul>
            )}
            {item.cue && <div className="today-item__cue">💬 {item.cue}</div>}
            <ChangedExerciseNote performedName={substitutedName} prescribedName={item.name} />

            <div className="today-item__actions">
                <button type="button" className="today-item__action-btn" onClick={() => setSubOpen(true)}>
                    Change exercise
                </button>
            </div>
            <FocusedNoteEditor label="Note" value={note} onChange={onNoteChange} />

            <ChangeExerciseSheet
                open={subOpen}
                onClose={() => setSubOpen(false)}
                prescribedName={item.name}
                currentValue={substitutedName}
                onSave={onSubstitute}
            />
        </div>
    )
}
