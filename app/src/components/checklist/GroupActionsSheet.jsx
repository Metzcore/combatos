/**
 * GroupActionsSheet.jsx — the group-card `…` bottom-sheet menu (W22)
 *
 * Mirrors TaskActionsSheet: Rename (closes this sheet, parent opens the
 * GroupNameSheet pre-filled — same close-and-reopen idiom as task Edit) ·
 * Move up / Move down (sheet STAYS open for repeated taps; the parent
 * derives group/isFirst/isLast fresh from the live view model each render)
 * · Delete (native confirm stays, per the W22 ruling — same cascade wording
 * as W21).
 */
import BottomSheet from '../BottomSheet.jsx'

export default function GroupActionsSheet({
    group, isFirst, isLast, onClose, onRename, onMove, onDelete
}) {
    const open = !!group
    if (!open) return null

    const handleDelete = () => {
        if (confirm(`Delete group "${group.name}"?\n\nAll tasks inside this group will be deleted too.`)) {
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
