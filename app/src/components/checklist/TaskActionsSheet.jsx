/**
 * TaskActionsSheet.jsx — the row `…` bottom-sheet menu (W21, W24)
 *
 * Actions: − 1 today (counted tasks with a tally, W24 — the deliberate home
 * of decrement, so the row's ＋ can't be mis-tapped into an undo) · Edit ·
 * Stop repeating (recurring tasks only) · Move to group · Delete (native
 * confirm — reviewer ruling #4). "Move to group" swaps the sheet content
 * for the group list in place.
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function TaskActionsSheet({
    task, groups, onClose, onEdit, onStopRepeating, onMoveToGroup, onDelete, onDecrement
}) {
    const [picking, setPicking] = useState(false)
    const open = !!task

    // Reset the move-picker whenever the sheet targets a new task (or closes)
    useEffect(() => { setPicking(false) }, [task?.id])

    if (!open) return null

    const handleDelete = () => {
        if (confirm(`Delete task "${task.title}"?`)) {
            onDelete(task.id)
            onClose()
        }
    }

    const otherGroups = groups.filter(g => g.id !== task.groupId)

    return (
        <BottomSheet open={open} onClose={onClose} title={picking ? 'Move to group' : task.title}>
            {picking ? (
                otherGroups.length === 0 ? (
                    <div className="sheet__empty">No other groups — create one first.</div>
                ) : (
                    otherGroups.map(g => (
                        <button
                            key={g.id}
                            className="sheet__action"
                            onClick={() => { onMoveToGroup(task.id, g.id); onClose() }}
                        >
                            {g.name}
                        </button>
                    ))
                )
            ) : (
                <>
                    {task.counted && task.countToday > 0 && (
                        <button className="sheet__action" onClick={() => { onDecrement(task); onClose() }}>
                            − 1 today (×{task.countToday})
                        </button>
                    )}
                    <button className="sheet__action" onClick={() => { onEdit(task); onClose() }}>
                        ✎ Edit
                    </button>
                    {task.repeatDaily && (
                        <button className="sheet__action" onClick={() => { onStopRepeating(task.id); onClose() }}>
                            🔁 Stop repeating
                        </button>
                    )}
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
