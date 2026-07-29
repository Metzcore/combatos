/**
 * FocusedNoteEditor.jsx — A7b controlled note editor (corrective plan §4).
 *
 * Strictly a presentation layer over state the PARENT already owns and
 * autosaves through useWorkoutDraftPersistence's single debounce/schedule
 * path — this component has no Dexie access, no workoutDraftController
 * reference, and no internal timer of any kind, not even one framed as a
 * React rendering optimization. `onChange` fires synchronously on every
 * keystroke so the parent's own (debounced) persistence never loses the
 * latest characters if the app backgrounds or this component unmounts
 * mid-edit — the exact defect a second, independent debounce here would
 * reintroduce (D11 ruling 6, binding).
 *
 * Two states: a compact idle preview (one line, tap to open), and a
 * full-screen editor. A7b corrective pass (finding F): sized against the
 * REAL visible viewport via `window.visualViewport` (height + offsetTop, on
 * both `resize` and `scroll`, cleaned up on unmount/close) through the pure
 * `computeFocusedNoteViewportStyle` helper — falling back to CSS `100dvh`
 * then `100vh` only when `visualViewport` is unavailable. The Done bar stays
 * pinned to the TOP of the visible viewport; the textarea scrolls
 * internally (`flex:1; min-height:0; overflow-y:auto` in index.css), never
 * a tap-outside-to-dismiss (fat-fingering the backdrop mid-sentence must not
 * discard focus unexpectedly).
 */
import { useEffect, useId, useState } from 'react'
import { computeFocusedNoteViewportStyle } from '../utils/viewportGeometry.js'

function readVisualViewport() {
    return typeof window !== 'undefined' && window.visualViewport ? window.visualViewport : null
}

export default function FocusedNoteEditor({ value, onChange, label = 'Note', placeholder = 'Optional' }) {
    const [open, setOpen] = useState(false)
    const [viewportStyle, setViewportStyle] = useState(() => computeFocusedNoteViewportStyle(readVisualViewport()))
    const fieldId = useId()
    const text = value || ''
    const previewLine = text.split('\n')[0]

    useEffect(() => {
        if (!open) return
        const vv = readVisualViewport()
        if (!vv) return // no visualViewport support — CSS 100dvh/100vh fallback handles sizing
        const update = () => setViewportStyle(computeFocusedNoteViewportStyle(vv))
        update()
        vv.addEventListener('resize', update)
        vv.addEventListener('scroll', update)
        return () => {
            vv.removeEventListener('resize', update)
            vv.removeEventListener('scroll', update)
        }
    }, [open])

    if (!open) {
        return (
            <button
                type="button"
                className="focused-note focused-note--preview"
                onClick={() => setOpen(true)}
            >
                <span className="focused-note__label">{label}</span>
                <span className="focused-note__preview-text">
                    {previewLine || placeholder}
                </span>
            </button>
        )
    }

    const overlayClassName = `focused-note-overlay${viewportStyle.usesVisualViewport ? '' : ' focused-note-overlay--fallback'}`
    const overlayStyle = viewportStyle.usesVisualViewport
        ? { height: viewportStyle.height, top: viewportStyle.top }
        : undefined

    return (
        <div className={overlayClassName} style={overlayStyle} role="dialog" aria-modal="true" aria-label={label}>
            <div className="focused-note-overlay__bar">
                <span className="focused-note-overlay__label">{label}</span>
                <button type="button" className="btn-primary focused-note-overlay__done" onClick={() => setOpen(false)}>
                    Done
                </button>
            </div>
            <textarea
                id={fieldId}
                className="focused-note-overlay__textarea"
                autoFocus
                value={text}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    )
}
