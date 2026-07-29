/**
 * viewportGeometry.test.js — A7b keyboard-safe note editor geometry
 * (corrective plan §6, finding F). No jsdom/real window.visualViewport in
 * this repo's node-only test environment — this proves the pure geometry
 * function against plain objects shaped like the subset of
 * window.visualViewport FocusedNoteEditor.jsx actually reads.
 */
import { describe, it, expect } from 'vitest'
import { computeFocusedNoteViewportStyle } from './viewportGeometry.js'

describe('computeFocusedNoteViewportStyle', () => {
    it('visualViewport absent — usesVisualViewport is false, no pixel values (caller applies the CSS 100dvh/100vh fallback)', () => {
        expect(computeFocusedNoteViewportStyle(null)).toEqual({ usesVisualViewport: false, height: null, top: null })
        expect(computeFocusedNoteViewportStyle(undefined)).toEqual({ usesVisualViewport: false, height: null, top: null })
    })

    it('keyboard closed — full height, zero offsetTop', () => {
        expect(computeFocusedNoteViewportStyle({ height: 800, offsetTop: 0 })).toEqual({
            usesVisualViewport: true, height: '800px', top: '0px',
        })
    })

    it('keyboard open — shrunk height reflected exactly', () => {
        expect(computeFocusedNoteViewportStyle({ height: 420, offsetTop: 0 })).toEqual({
            usesVisualViewport: true, height: '420px', top: '0px',
        })
    })

    it('non-zero offsetTop (e.g. a scrolled/pinch-zoomed visual viewport) is reflected exactly', () => {
        expect(computeFocusedNoteViewportStyle({ height: 500, offsetTop: 64 })).toEqual({
            usesVisualViewport: true, height: '500px', top: '64px',
        })
    })

    it('a missing/non-finite offsetTop defaults to 0 rather than producing an invalid style', () => {
        expect(computeFocusedNoteViewportStyle({ height: 600 })).toEqual({
            usesVisualViewport: true, height: '600px', top: '0px',
        })
        expect(computeFocusedNoteViewportStyle({ height: 600, offsetTop: NaN })).toEqual({
            usesVisualViewport: true, height: '600px', top: '0px',
        })
    })

    it('a non-finite height is treated as absent (falls back), never producing "NaNpx"', () => {
        expect(computeFocusedNoteViewportStyle({ height: NaN, offsetTop: 0 })).toEqual({
            usesVisualViewport: false, height: null, top: null,
        })
        expect(computeFocusedNoteViewportStyle({ height: '800', offsetTop: 0 })).toEqual({
            usesVisualViewport: false, height: null, top: null,
        })
    })
})
