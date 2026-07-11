/**
 * checklistImport.js — paste-text import line parsing (W22). Pure, no React,
 * no Dexie — unit-tested in checklistImport.test.js.
 *
 * Rules (W22 ruling #4): one task per line; strip a single leading list
 * marker (`-`, `*`, `•`) plus surrounding whitespace; ignore lines that end
 * up empty; duplicate titles are ALLOWED (no de-dup). No image import, no
 * AI parsing, no quota.
 */

const LEADING_MARKER_RE = /^\s*[-*•]\s*/

/**
 * Parses pasted checklist text into an array of task titles, in input order.
 *
 * @param {string} text - raw textarea content (any line-ending style)
 * @returns {string[]} cleaned, non-empty task titles
 */
export function parseImportLines(text) {
    if (typeof text !== 'string') return []
    return text
        .split(/\r\n|\r|\n/)
        .map(line => line.replace(LEADING_MARKER_RE, '').trim())
        .filter(line => line.length > 0)
}
