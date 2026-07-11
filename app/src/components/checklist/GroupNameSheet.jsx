/**
 * GroupNameSheet.jsx — single-field group-name bottom sheet (W22)
 *
 * One component, two modes — replaces BOTH `prompt()` call sites from W21
 * (prompt() renders inconsistently and is silently blocked in embedded
 * browsers):
 *   - mode 'create' (group == null): "+ Create Group" with an empty input
 *   - mode 'rename' (group set): pre-filled with the current name
 * Same seed-on-open pattern as TaskEditSheet.
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function GroupNameSheet({ open, group, onClose, onSave }) {
    const [name, setName] = useState('')

    // Re-seed whenever the sheet opens for a (different) target
    useEffect(() => {
        if (open) setName(group?.name ?? '')
    }, [open, group?.id])

    const save = e => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onSave(trimmed)
        onClose()
    }

    return (
        <BottomSheet open={open} onClose={onClose} title={group ? 'Rename group' : 'New group'}>
            <form className="sheet-form" onSubmit={save}>
                <label className="sheet-form__label">
                    Group name
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Group name"
                        autoFocus
                    />
                </label>
                <button type="submit" className="btn-primary">
                    {group ? 'Save changes' : 'Create group'}
                </button>
            </form>
        </BottomSheet>
    )
}
