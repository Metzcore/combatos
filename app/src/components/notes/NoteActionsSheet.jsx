/**
 * NoteActionsSheet.jsx — the note row `…` bottom-sheet menu (W23)
 *
 * Mirrors TaskActionsSheet: Edit · Pin/Unpin (one boolean, per the W23
 * ruling — the old 5-star rating is retired) · Move to group ("swap the
 * sheet content in place" idiom) · Delete (native confirm, same idiom as
 * the checklist sheets).
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function NoteActionsSheet({
    note, groups, onClose, onEdit, onTogglePin, onMoveToGroup, onDelete
}) {
    const [picking, setPicking] = useState(false)
    const open = !!note

    // Reset the move-picker whenever the sheet targets a new note (or closes)
    useEffect(() => { setPicking(false) }, [note?.id])

    if (!open) return null

    const label = note.title || 'this note'

    const handleDelete = () => {
        if (confirm(`Delete note "${label}"?`)) {
            onDelete(note.id)
            onClose()
        }
    }

    const otherGroups = groups.filter(g => g.id !== note.groupId)

    return (
        <BottomSheet open={open} onClose={onClose} title={picking ? 'Move to group' : label}>
            {picking ? (
                otherGroups.length === 0 ? (
                    <div className="sheet__empty">No other groups — create one first.</div>
                ) : (
                    otherGroups.map(g => (
                        <button
                            key={g.id}
                            className="sheet__action"
                            onClick={() => { onMoveToGroup(note.id, g.id); onClose() }}
                        >
                            {g.name}
                        </button>
                    ))
                )
            ) : (
                <>
                    <button className="sheet__action" onClick={() => { onEdit(note); onClose() }}>
                        ✎ Edit
                    </button>
                    <button className="sheet__action" onClick={() => { onTogglePin(note.id, !note.pinned); onClose() }}>
                        {note.pinned ? '📌 Unpin' : '📌 Pin to top'}
                    </button>
                    <button className="sheet__action" onClick={() => setPicking(true)}>
                        📁 Move to group
                    </button>
                    <button className="sheet__action destructive" onClick={handleDelete}>
                        ✕ Delete
                    </button>
                </>
            )}
        </BottomSheet>
    )
}
