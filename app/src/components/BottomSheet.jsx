/**
 * BottomSheet.jsx — generic shared bottom-sheet primitive (W21)
 *
 * NOT checklist-specific: W12's exercise picker is slated to reuse this.
 * Presentational only — no Dexie, no app state. Backdrop tap and the ✕
 * button both call onClose; content is whatever the caller renders.
 *
 * Styling: tactical-amber HUD identity via existing tokens (--panel,
 * --divider, --accent) — see .sheet-* classes in index.css.
 */
export default function BottomSheet({ open, onClose, title, children }) {
    if (!open) return null
    return (
        <div className="sheet-backdrop" onClick={onClose}>
            <div
                className="sheet"
                role="dialog"
                aria-modal="true"
                onClick={e => e.stopPropagation()}
            >
                <div className="sheet__handle" />
                {(title || onClose) && (
                    <div className="sheet__header">
                        {title && <div className="sheet__title">{title}</div>}
                        <button className="sheet__close" onClick={onClose} aria-label="Close">✕</button>
                    </div>
                )}
                <div className="sheet__body">
                    {children}
                </div>
            </div>
        </div>
    )
}
