/**
 * NoteGroupActionsSheet.jsx — the note-group `…` bottom-sheet menu (W23)
 *
 * PARALLEL to checklist/GroupActionsSheet.jsx, not a reuse (ruled in the
 * W23 diagnostic): that sheet's delete-confirm wording is task-specific
 * and its call site lives inside the DO-NOT-TOUCH Checklist.jsx, so the
 * notes flavor is a copy-adapt with notes wording. Same idioms throughout:
 * Rename closes-and-reopens via the shared GroupNameSheet; Move up/down
 * keeps the sheet open (parent derives group/isFirst/isLast from the live
 * view model each render); Delete uses the native confirm and states the
 * cascade.
 */
import BottomSheet from '../BottomSheet.jsx'

export default function NoteGroupActionsSheet({
    group, isFirst, isLast, onClose, onRename, onMove, onDelete
}) {
    const open = !!group
    if (!open) return null

    const handleDelete = () => {
        if (confirm(`Delete group "${group.name}"?\n\nAll notes inside this group will be deleted too.`)) {
            onDelete(group.id)
            onClose()
        }
    }

    return (
        <BottomSheet open={open} onClose={onClose} title={group.name}>
            <button className="sheet__action" onClick={() => { onRename(group); onClose() }}>
                ✎ Rename
            </button>
            <button className="sheet__action" onClick={() => onMove(group.id, -1)} disabled={isFirst}>
                ↑ Move up
            </button>
            <button className="sheet__action" onClick={() => onMove(group.id, 1)} disabled={isLast}>
                ↓ Move down
            </button>
            <button className="sheet__action destructive" onClick={handleDelete}>
                ✕ Delete
            </button>
        </BottomSheet>
    )
}
