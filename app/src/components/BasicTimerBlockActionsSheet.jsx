/**
 * BasicTimerBlockActionsSheet.jsx — the Basic Timer block `⋮` menu (W15).
 *
 * Deliberately a separate component from checklist/GroupActionsSheet.jsx:
 * that sheet is checklist-owned (Rename / cascade Delete / confirm wording
 * per the W21/W22 rulings) and W15 must not destabilize it. This one is
 * Move up / Move down only, on the shared BottomSheet primitive.
 *
 * Same idiom as the checklist sheets: the sheet STAYS open for repeated
 * taps — the parent derives block/isFirst/isLast fresh from the live order
 * each render, so the disabled states track the block's current position.
 */
import BottomSheet from './BottomSheet.jsx'

export default function BasicTimerBlockActionsSheet({
    block, isFirst, isLast, onClose, onMove
}) {
    if (!block) return null

    return (
        <BottomSheet open={!!block} onClose={onClose} title={block.label}>
            <button className="sheet__action" onClick={() => onMove(block.id, -1)} disabled={isFirst}>
                ↑ Move up
            </button>
            <button className="sheet__action" onClick={() => onMove(block.id, 1)} disabled={isLast}>
                ↓ Move down
            </button>
        </BottomSheet>
    )
}
