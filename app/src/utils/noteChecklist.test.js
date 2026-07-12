/**
 * noteChecklist.test.js — pins the W23 inline-checkbox line contract.
 *
 * The REVIEW-pass focus for this util is "must never corrupt non-checkbox
 * lines": every malformed-marker case must round-trip untouched, and a
 * toggle must rewrite exactly one line. Pure functions, plain Vitest.
 */
import { describe, it, expect } from 'vitest'
import { parseNoteLines, toggleCheckboxLine } from './noteChecklist.js'

describe('parseNoteLines — classification', () => {
    it('parses unchecked, checked, and uppercase-checked lines', () => {
        const lines = parseNoteLines('- [ ] open\n- [x] done\n- [X] DONE')
        expect(lines.map(l => l.type)).toEqual(['checkbox', 'checkbox', 'checkbox'])
        expect(lines.map(l => l.checked)).toEqual([false, true, true])
        expect(lines.map(l => l.text)).toEqual(['open', 'done', 'DONE'])
    })

    it('preserves the exact raw line on every descriptor', () => {
        const body = 'plain\n  - [x] indented\n- [ ] top'
        expect(parseNoteLines(body).map(l => l.raw)).toEqual(body.split('\n'))
    })

    it('classifies indented / nested markers as checkboxes', () => {
        const [a, b] = parseNoteLines('  - [ ] sub-task\n\t- [x] tabbed')
        expect(a.type).toBe('checkbox')
        expect(a.checked).toBe(false)
        expect(b.type).toBe('checkbox')
        expect(b.checked).toBe(true)
    })

    it('a bare marker with no content is a checkbox with empty text', () => {
        const [l] = parseNoteLines('- [ ]')
        expect(l.type).toBe('checkbox')
        expect(l.text).toBe('')
    })

    it('malformed markers stay PLAIN and keep their literal text', () => {
        const malformed = [
            '-[ ] no space after dash',
            '- [z] bad bracket content',
            '- [ ]no space before content',
            '[ ] no dash',
            '- [] empty bracket',
            '- [x]x glued',
            'Buy [milk] and eggs',
            '* [ ] star marker is not ours'
        ]
        for (const line of malformed) {
            const [l] = parseNoteLines(line)
            expect(l.type).toBe('plain')
            expect(l.text).toBe(line)
            expect(l.raw).toBe(line)
        }
    })

    it('handles empty body and non-string input without throwing', () => {
        expect(parseNoteLines('')).toEqual([
            { raw: '', type: 'plain', checked: false, text: '' }
        ])
        expect(parseNoteLines(null)).toEqual([])
        expect(parseNoteLines(undefined)).toEqual([])
    })
})

describe('toggleCheckboxLine — exact-line rewrite', () => {
    it('toggles [ ] to [x] and back, rewriting only the target line', () => {
        const body = 'intro\n- [ ] task a\n- [ ] task b\noutro'
        const on = toggleCheckboxLine(body, 1)
        expect(on).toBe('intro\n- [x] task a\n- [ ] task b\noutro')
        const off = toggleCheckboxLine(on, 1)
        expect(off).toBe(body) // exact round-trip
    })

    it('preserves indentation on nested items', () => {
        const body = '- [ ] parent\n  - [ ] child'
        expect(toggleCheckboxLine(body, 1)).toBe('- [ ] parent\n  - [x] child')
    })

    it('canonicalizes uppercase [X] to lowercase on rewrite', () => {
        const body = '- [X] shouted'
        const off = toggleCheckboxLine(body, 0)
        expect(off).toBe('- [ ] shouted')
        const on = toggleCheckboxLine(off, 0)
        expect(on).toBe('- [x] shouted') // never drifts back to uppercase
    })

    it('toggles a bare marker with no content', () => {
        expect(toggleCheckboxLine('- [ ]', 0)).toBe('- [x]')
        expect(toggleCheckboxLine('- [x]', 0)).toBe('- [ ]')
    })

    it('never touches plain lines with bracket-looking text', () => {
        const body = 'Buy [milk] and eggs\n- [ ] real one'
        expect(toggleCheckboxLine(body, 0)).toBe(body) // no-op on plain
        expect(toggleCheckboxLine(body, 1))
            .toBe('Buy [milk] and eggs\n- [x] real one')
    })

    it('is a no-op for out-of-range or non-integer indexes', () => {
        const body = '- [ ] only line'
        expect(toggleCheckboxLine(body, -1)).toBe(body)
        expect(toggleCheckboxLine(body, 1)).toBe(body)
        expect(toggleCheckboxLine(body, 0.5)).toBe(body)
        expect(toggleCheckboxLine(body, NaN)).toBe(body)
    })

    it('handles non-string body without throwing', () => {
        expect(toggleCheckboxLine(null, 0)).toBe(null)
        expect(toggleCheckboxLine(undefined, 0)).toBe(undefined)
    })

    // Defensive \r\n case (W23 risk #5): bodies are <textarea>-authored
    // (always \n), but if CRLF ever sneaks in via a paste path, toggling
    // must NEVER corrupt the body — CRLF lines carry a trailing \r, which
    // makes them non-matching (safe no-op), and toggling a clean \n line
    // elsewhere in the same body must leave every \r exactly where it was.
    it('never corrupts a body containing \\r\\n line endings', () => {
        const crlfBody = '- [ ] crlf line\r\n- [ ] lf line'
        // Line 0 is "- [ ] crlf line\r" after split('\n') — trailing \r
        // means no match: toggling it is a safe no-op, not a corruption.
        expect(toggleCheckboxLine(crlfBody, 0)).toBe(crlfBody)
        // Line 1 is clean — toggling it rewrites ONLY that line and the
        // \r on line 0 survives byte-for-byte.
        expect(toggleCheckboxLine(crlfBody, 1))
            .toBe('- [ ] crlf line\r\n- [x] lf line')
        // Parsing classifies the \r-suffixed line as plain (untouchable).
        const [a, b] = parseNoteLines(crlfBody)
        expect(a.type).toBe('plain')
        expect(b.type).toBe('checkbox')
    })
})
