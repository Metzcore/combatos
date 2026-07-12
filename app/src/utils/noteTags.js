/**
 * noteTags.js — the app-wide normalized-tag convention (W23). Pure, no
 * React, no Dexie — unit-tested in noteTags.test.js.
 *
 * Tags are freeform on entry and normalized on the way in (same "clean on
 * write" philosophy as checklistImport.js): trim, lowercase, internal
 * whitespace runs → single `-`. Stored per-note as a string array under a
 * Dexie multiEntry index (`*tags`). Other features adopting tags later MUST
 * funnel through these helpers so the shape stays consistent app-wide.
 */

/**
 * Normalizes one freeform tag: trim → lowercase → whitespace runs to `-`.
 * Returns '' for anything blank or non-string (callers drop empties).
 */
export function normalizeTag(raw) {
    if (typeof raw !== 'string') return ''
    return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

/**
 * Normalizes an array of freeform tags: each normalized, blanks dropped,
 * duplicates-after-normalization collapsed (first occurrence wins, input
 * order preserved). Always returns a NEW array; never throws on bad input.
 */
export function normalizeTags(tags) {
    if (!Array.isArray(tags)) return []
    const out = []
    const seen = new Set()
    for (const raw of tags) {
        const tag = normalizeTag(raw)
        if (!tag || seen.has(tag)) continue
        seen.add(tag)
        out.push(tag)
    }
    return out
}
