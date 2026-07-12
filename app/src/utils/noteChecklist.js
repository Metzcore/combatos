/**
 * noteChecklist.js — inline-checkbox line parse/toggle for plain-text note
 * bodies (W23). Pure, no React, no Dexie — unit-tested in
 * noteChecklist.test.js. The Notes view component only maps over
 * parseNoteLines() output and calls toggleCheckboxLine() on tap; it never
 * reimplements any of this.
 *
 * Rules (W23 ruling):
 * - a line is a checkbox line iff it matches `- [ ]` / `- [x]` / `- [X]`
 *   followed by end-of-line or a space (leading indentation allowed and
 *   preserved — nested items work)
 * - anything malformed (`-[ ]`, `- [z]`, `- [ ]text` with no space before
 *   the content, `[ ]` without the dash) stays a PLAIN line: it is never
 *   rewritten and never loses its literal text
 * - toggling rewrites EXACTLY the target line; every other line — including
 *   plain lines containing bracket-looking text — is untouched
 * - uppercase `[X]` reads as checked; on any rewrite the bracket content is
 *   canonicalized to lowercase (`[x]` / `[ ]`) — clean on the way in, same
 *   philosophy as checklistImport.js
 * - a no-op toggle (out-of-range index, or a plain line) returns the input
 *   string unchanged — defensive against a stale line index from a
 *   re-render race
 *
 * Line endings: bodies are <textarea>-authored, which the DOM normalizes to
 * `\n`, so split/join uses `\n` only. A body containing literal `\r`
 * characters keeps them INSIDE the untouched lines (`\r` survives as the
 * last character of the preceding line's text) — toggling never strips or
 * reorders content it didn't target.
 */

// Groups: (indent + "- [")(state)("]")( " " + content | end-of-line )
const CHECKBOX_LINE_RE = /^(\s*- \[)([ xX])(\])(?: (.*))?$/

/**
 * Parses a note body into render-ready line descriptors.
 *
 * @param {string} body - plain-text note body
 * @returns {Array<{ raw: string, type: 'checkbox'|'plain',
 *                   checked: boolean, text: string }>}
 *   `raw` is always the exact original line; `text` is the content after
 *   the marker for checkbox lines (may be ''), and equals `raw` for plain
 *   lines.
 */
export function parseNoteLines(body) {
    if (typeof body !== 'string') return []
    return body.split('\n').map(raw => {
        const m = CHECKBOX_LINE_RE.exec(raw)
        if (!m) return { raw, type: 'plain', checked: false, text: raw }
        return {
            raw,
            type: 'checkbox',
            checked: m[2] === 'x' || m[2] === 'X',
            text: m[4] ?? ''
        }
    })
}

/**
 * Toggles the checkbox on line `lineIndex` of `body`, rewriting exactly
 * that line (`[ ]` ↔ `[x]`, uppercase canonicalized to lowercase). Returns
 * the input string unchanged when the index is out of range or the line is
 * not a checkbox line.
 *
 * @param {string} body - plain-text note body
 * @param {number} lineIndex - 0-based index into body.split('\n')
 * @returns {string} the new body (or the original when no-op)
 */
export function toggleCheckboxLine(body, lineIndex) {
    if (typeof body !== 'string') return body
    const lines = body.split('\n')
    if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) {
        return body
    }
    const m = CHECKBOX_LINE_RE.exec(lines[lineIndex])
    if (!m) return body
    const checked = m[2] === 'x' || m[2] === 'X'
    const content = m[4] === undefined ? '' : ` ${m[4]}`
    lines[lineIndex] = `${m[1]}${checked ? ' ' : 'x'}${m[3]}${content}`
    return lines.join('\n')
}
