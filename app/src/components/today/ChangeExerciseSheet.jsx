/**
 * components/today/ChangeExerciseSheet.jsx — A7b per-item substitution
 * (corrective plan §4, replaces the first attempt's SubstitutionSheet.jsx).
 *
 * The prescribed name is always shown; a free-text field records what was
 * actually done instead. The payload builder itself (utils/cartridgeSessionPayload.js's
 * buildPerformed) decides `substituted: true` — only when the saved value
 * differs from the prescribed name — so saving the prescribed name back is
 * a no-op revert, same as the explicit "Revert to prescribed" action.
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function ChangeExerciseSheet({ open, onClose, prescribedName, currentValue, onSave }) {
    const [value, setValue] = useState(currentValue || '')

    useEffect(() => {
        if (open) setValue(currentValue || '')
    }, [open, currentValue])

    return (
        <BottomSheet open={open} onClose={onClose} title="Change exercise">
            <p className="sheet__copy">Prescribed: <strong>{prescribedName}</strong></p>
            <div className="sheet-form">
                <label className="sheet-form__label" htmlFor="today-change-exercise-input">
                    What did you do instead?
                    <input
                        id="today-change-exercise-input"
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={prescribedName}
                    />
                </label>
            </div>
            <button type="button" className="btn-primary" onClick={() => { onSave(value); onClose() }}>
                Save
            </button>
            {currentValue && (
                <button type="button" className="btn-secondary" onClick={() => { onSave(''); onClose() }}>
                    Revert to prescribed
                </button>
            )}
        </BottomSheet>
    )
}

/**
 * ChangedExerciseNote — the persistent two-line "Performed / Prescribed"
 * display once an item is substituted, shown inline on the item card
 * instead of only inside the sheet.
 */
export function ChangedExerciseNote({ performedName, prescribedName }) {
    if (!performedName) return null
    return (
        <div className="today-changed-exercise">
            <div className="today-changed-exercise__line">Performed: <strong>{performedName}</strong></div>
            <div className="today-changed-exercise__line today-changed-exercise__line--dim">Prescribed: {prescribedName}</div>
        </div>
    )
}
