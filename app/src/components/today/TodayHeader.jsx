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
            {/* Android acceptance remediation plan §3.1: phase context renders
                EXACTLY ONCE, as a compact left-aligned eyebrow directly above
                the day title — never a filled pill (a long label forced the
                old .badge.badge-dim pill to wrap and compete with the title),
                and never duplicated elsewhere. The label text itself is the
                factual phaseBlock.label, rendered verbatim. */}
            {phaseLabel && <div className="today-header__phase">{phaseLabel}</div>}
            <div className="today-header__day">{day?.label || 'Today'}</div>
            <div className="today-header__row today-header__row--meta">
                {units > 0 && <span className="today-header__progress">{done}/{units} sets</span>}
                {saveLabel && (
                    <span className={`today-header__save-status today-header__save-status--${saveStatusKind}`}>
                        {/* A11 Today polish: decorative status dot — the
                            saveLabel text beside it already carries the full
                            meaning, so state is never colour-only. 'idle'
                            with a label present IS the proven-saved state
                            (mapSaveStatusToLabel only returns a label for
                            idle once a persisted row is proven). */}
                        <span className={`today-header__save-dot today-header__save-dot--${saveStatusKind}`} aria-hidden="true" />
                        {saveLabel}
                        {saveStatusKind === 'error' && onRetry && (
                            <button type="button" className="today-header__retry" onClick={onRetry}>Retry</button>
                        )}
                    </span>
                )}
            </div>
            {/* A11 Today polish: thin progress rail derived from the SAME
                canonical done/units shown as text above (never a separate
                count or formula) — pure presentation of the existing
                itemCompleteness aggregate, hidden from screen readers because
                the "N/M sets" text already states it. */}
            {units > 0 && (
                <div className={`today-header__rail${done >= units ? ' today-header__rail--complete' : ''}`} aria-hidden="true">
                    <div
                        className="today-header__rail-fill"
                        style={{ width: `${Math.min(100, Math.round((done / units) * 100))}%` }}
                    />
                </div>
            )}
        </div>
    )
}
