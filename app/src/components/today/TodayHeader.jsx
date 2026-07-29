/**
 * components/today/TodayHeader.jsx — A7b persistent Today header
 * (corrective plan §4). Day label, an "N/M sets" progress figure derived
 * from the SAME completeness units as the stored payload (never a separate
 * count), and a save-state string drawn ONLY from the local draft
 * controller's status — no remote-sync signal of any kind (D11 point 5,
 * schema §5).
 *
 * A7b corrective pass (finding J3): the label itself is computed by
 * CartridgeToday.jsx via the pure `mapSaveStatusToLabel` helper and passed
 * in as `saveLabel` — this component never re-derives "Saved on device ✓"
 * from a bare 'idle' status (that would assert a save that may never have
 * happened). `saveLabel === null` renders no badge at all (the neutral
 * pre-save state), never an alarming error.
 */
import { itemCompleteness } from '../../utils/cartridgeCompleteness.js'

export default function TodayHeader({ day, itemStateById, saveLabel, saveStatusKind, onRetry, phaseLabel }) {
    let units = 0
    let done = 0
    for (const block of Array.isArray(day?.blocks) ? day.blocks : []) {
        for (const item of Array.isArray(block.items) ? block.items : []) {
            const performed = itemStateById[item.id] || {}
            const result = itemCompleteness(block.kind, item, performed)
            units += result.units
            done += Math.min(result.done, result.units)
        }
    }

    return (
        <div className="today-header">
            <div className="today-header__row">
                <div className="today-header__day">{day?.label || 'Today'}</div>
                {phaseLabel && <span className="badge badge-dim">{phaseLabel}</span>}
            </div>
            <div className="today-header__row today-header__row--meta">
                {units > 0 && <span className="today-header__progress">{done}/{units} sets</span>}
                {saveLabel && (
                    <span className={`today-header__save-status today-header__save-status--${saveStatusKind}`}>
                        {saveLabel}
                        {saveStatusKind === 'error' && onRetry && (
                            <button type="button" className="today-header__retry" onClick={onRetry}>Retry</button>
                        )}
                    </span>
                )}
            </div>
        </div>
    )
}
