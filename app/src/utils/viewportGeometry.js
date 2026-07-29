/**
 * utils/viewportGeometry.js — A7b keyboard-safe note editor geometry
 * (corrective plan §4/§6, finding F).
 *
 * Pure function over a plain `{ height, offsetTop }`-shaped object (the
 * subset of `window.visualViewport` FocusedNoteEditor.jsx actually reads) so
 * the keyboard-open/keyboard-closed/no-visualViewport cases are provable in
 * this repo's node-only test environment (no jsdom, no real
 * window.visualViewport). The component itself only ever calls this with
 * `window.visualViewport` (or `undefined`/`null` when unsupported) — never a
 * hand-rolled duplicate of this math.
 */

/**
 * computeFocusedNoteViewportStyle — given the current visualViewport (or its
 * absence), returns the inline style values FocusedNoteEditor's full-screen
 * overlay should use.
 *
 * - visualViewport present with a finite `height` -> pixel `height`/`top`
 *   driven by the REAL visible viewport (shrinks when the on-screen keyboard
 *   opens; `offsetTop` accounts for a scrolled/pinch-zoomed visual viewport).
 * - visualViewport absent/unusable -> `usesVisualViewport: false`; the
 *   caller applies the CSS `100dvh` -> `100vh` fallback instead (this
 *   function makes no CSS-support judgment of its own).
 *
 * @param {{ height?: number, offsetTop?: number }|null|undefined} visualViewport
 * @returns {{ usesVisualViewport: boolean, height: string|null, top: string|null }}
 */
export function computeFocusedNoteViewportStyle(visualViewport) {
    const height = visualViewport && typeof visualViewport.height === 'number' && Number.isFinite(visualViewport.height)
        ? visualViewport.height
        : null
    if (height === null) {
        return { usesVisualViewport: false, height: null, top: null }
    }
    const offsetTop = typeof visualViewport.offsetTop === 'number' && Number.isFinite(visualViewport.offsetTop)
        ? visualViewport.offsetTop
        : 0
    return {
        usesVisualViewport: true,
        height: `${height}px`,
        top: `${offsetTop}px`,
    }
}
