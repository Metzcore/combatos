/**
 * customIgnitions.js — pure logic for user-authored Daily Ignition quotes (W29 PR D)
 *
 * Mirrors the checklist paste-import idiom (utils/checklistImport.js's
 * `parseImportLines` + components/checklist/ImportSheet.jsx) but owns its
 * own parser rather than importing theirs — this module has to stay
 * standalone and dependency-free like utils/moreNav.js / utils/logOverview.js
 * / utils/navState.js, since it is the only ignition-related code the test
 * suite can exercise (Vitest runs `environment: 'node'`, no DOM, no React
 * testing library — see D14 in docs/planning/roadmap/OPEN-DECISIONS.md).
 *
 * NO Dexie, React, or settings imports here. db/index.jsx owns the
 * `customIgnitions` settings key and wires these functions to state exactly
 * like it already does for `bookmarkedIgnitions`.
 *
 * ── ID scheme ───────────────────────────────────────────────────────────
 * Bundled quotes (data/ignition.js) use zero-padded 3-digit string ids,
 * '001'–'056'. Custom quotes use a `c-` prefix followed by a random suffix
 * (crypto.randomUUID when available, a timestamp+random fallback
 * otherwise) — a shape the bundled 3-digit scheme can never produce, so a
 * collision is structurally impossible, not just unlikely. `isBundledId`
 * and `normalizeCustomIgnitions` still defend against corrupt/legacy stored
 * data that might carry a colliding id (e.g. a hand-edited settings row) by
 * regenerating any id that isn't a well-formed, unused `c-` id.
 */

const CUSTOM_ID_PREFIX = 'c-'
const BUNDLED_ID_RE = /^\d{3}$/
const LEADING_MARKER_RE = /^\s*[-*•]\s*/

/** True for a bundled-quote id shape ('001'-style), never true for a custom id. */
export function isBundledId(id) {
    return typeof id === 'string' && BUNDLED_ID_RE.test(id)
}

/** True for a well-formed custom-quote id (the `c-` prefix plus a non-empty suffix). */
export function isCustomId(id) {
    return typeof id === 'string' && id.startsWith(CUSTOM_ID_PREFIX) && id.length > CUSTOM_ID_PREFIX.length
}

function randomSuffix() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * makeCustomId — a fresh `c-`-prefixed id, guaranteed not to be in `usedIds`.
 * The prefix alone already rules out any collision with a bundled 3-digit
 * id; the retry loop only guards against the (effectively impossible)
 * random-suffix repeat within the same batch.
 *
 * @param {Set<string>|string[]} [usedIds]
 */
export function makeCustomId(usedIds) {
    const used = usedIds instanceof Set ? usedIds : new Set(usedIds || [])
    let id
    do {
        id = `${CUSTOM_ID_PREFIX}${randomSuffix()}`
    } while (used.has(id))
    return id
}

/**
 * parseIgnitionLines — pasted text into quote strings, one per line.
 * Same rules as checklistImport.js's parseImportLines (W22): strip a single
 * leading `-`, `*` or `•` marker plus surrounding whitespace, drop lines
 * that end up empty. Duplicate lines are NOT filtered here — that is
 * addCustomIgnitions' job, so the live "N will be added" count in the sheet
 * can still show what will be skipped as a dedupe, not a silent drop.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function parseIgnitionLines(text) {
    if (typeof text !== 'string') return []
    return text
        .split(/\r\n|\r|\n/)
        .map(line => line.replace(LEADING_MARKER_RE, '').trim())
        .filter(line => line.length > 0)
}

const normalizeText = text => text.trim().toLowerCase()

/**
 * normalizeCustomIgnitions — repairs whatever is actually stored under the
 * `customIgnitions` settings key into a safe `{ id, text }[]`. Handles:
 *  - the key never having been set (undefined)
 *  - a non-array value (corrupt write)
 *  - entries with a missing/blank `text` (dropped)
 *  - entries with a missing, malformed, colliding-with-bundled, or
 *    duplicate `id` (regenerated as a fresh custom id)
 *
 * @param {*} raw
 * @returns {Array<{id: string, text: string}>}
 */
export function normalizeCustomIgnitions(raw) {
    if (!Array.isArray(raw)) return []
    const usedIds = new Set()
    const out = []
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue
        const text = typeof entry.text === 'string' ? entry.text.trim() : ''
        if (!text) continue
        let id = entry.id
        if (!isCustomId(id) || usedIds.has(id)) {
            id = makeCustomId(usedIds)
        }
        usedIds.add(id)
        out.push({ id, text })
    }
    return out
}

/**
 * addCustomIgnitions — parses/dedupes a batch of pasted titles onto the
 * existing custom quote list. A title is skipped (not added) if its
 * trimmed/lowercased text already matches an existing custom quote OR an
 * earlier title in the same batch — "dedupe (same text twice)" per the W29
 * PR D spec. Blank/whitespace-only titles are rejected.
 *
 * @param {Array<{id: string, text: string}>} customQuotes - current stored value (may be corrupt; normalized internally)
 * @param {string[]} titles - already-parsed lines, e.g. from parseIgnitionLines
 * @returns {Array<{id: string, text: string}>} the new full custom list (existing + newly added)
 */
export function addCustomIgnitions(customQuotes, titles) {
    const existing = normalizeCustomIgnitions(customQuotes)
    const seenText = new Set(existing.map(q => normalizeText(q.text)))
    const usedIds = new Set(existing.map(q => q.id))
    const added = []

    for (const raw of titles || []) {
        if (typeof raw !== 'string') continue
        const text = raw.trim()
        if (!text) continue
        const key = normalizeText(text)
        if (seenText.has(key)) continue
        seenText.add(key)
        const id = makeCustomId(usedIds)
        usedIds.add(id)
        added.push({ id, text })
    }

    return [...existing, ...added]
}

/**
 * removeCustomIgnition — drops one custom quote by id. Removing an id that
 * doesn't exist (already deleted, never existed, or a bundled id) is a
 * no-op — callers (e.g. bookmark cleanup) don't need to check existence
 * first.
 *
 * @param {Array<{id: string, text: string}>} customQuotes
 * @param {string} id
 * @returns {Array<{id: string, text: string}>}
 */
export function removeCustomIgnition(customQuotes, id) {
    return normalizeCustomIgnitions(customQuotes).filter(q => q.id !== id)
}

/**
 * resetCustomIgnitions — clears all custom quotes back to the bundled-only
 * default. Trivial, but kept as a named function (rather than inlining `[]`
 * at call sites) so the "reset" concept has one owner, matches the
 * add/remove/dedupe/merge function set the PR spec asks for, and is
 * directly unit-testable.
 *
 * @returns {Array<{id: string, text: string}>}
 */
export function resetCustomIgnitions() {
    return []
}

/**
 * mergeIgnitions — the list DailyIgnition.jsx / IgnitionScreen.jsx must
 * actually pick from and search: bundled quotes first (stable, unaffected
 * ordering), then the user's custom quotes appended after. Corrupt/missing
 * `customQuotes` degrades to "bundled only", never throws.
 *
 * @param {Array<{id: string, text: string}>} bundled - IGNITION_QUOTES
 * @param {*} customQuotes - raw stored settings value (normalized internally)
 * @returns {Array<{id: string, text: string}>}
 */
export function mergeIgnitions(bundled, customQuotes) {
    const safeBundled = Array.isArray(bundled) ? bundled : []
    return [...safeBundled, ...normalizeCustomIgnitions(customQuotes)]
}
