/**
 * components/today/PerformedHoldItem.jsx — A7b mobility/cooldown item.
 *
 * READ-ONLY guidance (schema §6, D11 point 4): no checkbox, no completion
 * tracking of any kind. Substitution and an optional per-item note remain,
 * now as large one-thumb "Change exercise" / note controls rather than the
 * first attempt's 0.75rem text links.
 */
import { useState } from 'react'
import ChangeExerciseSheet, { ChangedExerciseNote } from './ChangeExerciseSheet.jsx'
import FocusedNoteEditor from '../FocusedNoteEditor.jsx'

export default function PerformedHoldItem({ item, substitutedName, onSubstitute, note, onNoteChange }) {
    const [subOpen, setSubOpen] = useState(false)
    const displayName = substitutedName || item.name

    return (
        <div className="today-item">
            <div className="today-item__name">{displayName}</div>
            {item.dose && <div className="today-item__meta">⏱ {item.dose}</div>}
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
