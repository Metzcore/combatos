/**
 * weightValue.js — canonical body-weight value handling (W30). PURE.
 *
 * ONE CANONICAL UNIT: KILOGRAMS. The display unit is a presentation
 * preference; it never changes what is stored. Historical entries render in
 * the CURRENT preference — a trend with mixed kg/lb labels is hard to compare
 * and can look discontinuous even when body mass is stable.
 *
 * ── THE RATCHET BUG THIS FILE EXISTS TO PREVENT ──────────────────────────
 * The obvious implementation corrupts data silently:
 *
 *   1. Store 180.0 lb  → canonical 81.6466... kg
 *   2. Display it at 1 decimal in kg → "81.6"
 *   3. User toggles unit, or the form re-saves what is displayed
 *   4. Persist the DISPLAYED value → canonical becomes 81.600 kg
 *
 * 0.047 kg is gone, and it goes again on every repeat. Over a few toggles a
 * stable weight visibly drifts, which in a weight-cutting sport is the exact
 * signal the athlete is watching. So:
 *
 *   - unit toggles are PRESENTATION ONLY — they never write;
 *   - an edit control is seeded from the untouched canonical kg;
 *   - only an explicit Save writes, and it writes the parsed input, not the
 *     rounded display string.
 *
 * `toDisplay`/`fromInput` are deliberately NOT inverses at display precision.
 * That asymmetry is the point: it is why round-tripping through the UI must
 * never be a write path.
 */

/** Exact, by definition (international avoirdupois pound). Not an approximation. */
export const LB_PER_KG_FACTOR = 0.45359237

/** Canonical storage precision: grams. Matches the server's numeric(6,3). */
const KG_DECIMALS = 3
/** Display precision. One decimal is all a bathroom scale honestly resolves. */
const DISPLAY_DECIMALS = 1

export const WEIGHT_UNITS = Object.freeze(['kg', 'lb'])

export function isWeightUnit(unit) {
    return WEIGHT_UNITS.includes(unit)
}

/**
 * Round via integers rather than toFixed-then-parse. Floating point makes
 * `Math.round(x * 1000) / 1000` wrong at exact halves often enough to matter
 * across thousands of entries; `Number.EPSILON` nudging fixes the classic
 * 1.0049999999 representation cases.
 */
function roundTo(value, decimals) {
    const factor = 10 ** decimals
    return Math.round((value + Number.EPSILON) * factor) / factor
}

/** True for a finite, positive, plausibly-human weight in kg. */
export function isValidKg(kg) {
    return typeof kg === 'number' && Number.isFinite(kg) && kg > 0 && kg < 1000
}

/** lb → canonical kg, rounded once to gram precision. */
export function lbToKg(lb) {
    return roundTo(lb * LB_PER_KG_FACTOR, KG_DECIMALS)
}

/** canonical kg → lb (unrounded; callers format for display). */
export function kgToLb(kg) {
    return kg / LB_PER_KG_FACTOR
}

/**
 * fromInput — parse user text in `unit` into canonical kg, or null.
 *
 * Accepts a comma decimal separator: most of continental Europe types "81,6",
 * and silently rejecting it (or worse, parsing it as 816) would be a real
 * data-entry hazard rather than a nicety. Thousands separators are NOT
 * supported — nobody weighs 1,000 kg, so any comma is a decimal point.
 */
export function fromInput(text, unit = 'kg') {
    if (typeof text === 'number') {
        return finalizeInput(text, unit)
    }
    if (typeof text !== 'string') return null

    const trimmed = text.trim()
    if (trimmed === '') return null
    // Reject anything that is not a plain decimal number: no exponents, no
    // signs, no stray letters. `Number()` would happily accept '1e3' and
    // '0x50', neither of which a human means as a body weight.
    if (!/^\d*[.,]?\d*$/.test(trimmed)) return null

    const parsed = Number(trimmed.replace(',', '.'))
    return finalizeInput(parsed, unit)
}

function finalizeInput(value, unit) {
    if (!Number.isFinite(value)) return null
    const kg = unit === 'lb' ? lbToKg(value) : roundTo(value, KG_DECIMALS)
    return isValidKg(kg) ? kg : null
}

/**
 * toDisplay — canonical kg → a number in `unit` at display precision.
 * Returns null for invalid input so callers render an honest placeholder
 * rather than "NaN".
 */
export function toDisplay(kg, unit = 'kg') {
    if (!isValidKg(kg)) return null
    const value = unit === 'lb' ? kgToLb(kg) : kg
    return roundTo(value, DISPLAY_DECIMALS)
}

/** toDisplay, as a fixed-decimal string. '—' when there is nothing to show. */
export function formatWeight(kg, unit = 'kg', { withUnit = true } = {}) {
    const value = toDisplay(kg, unit)
    if (value === null) return '—'
    const text = value.toFixed(DISPLAY_DECIMALS)
    return withUnit ? `${text} ${unit}` : text
}

/**
 * toEditValue — the string to seed an edit control with.
 *
 * Deliberately identical to the display string, and deliberately NOT a
 * write-back path: callers must treat a Save as parsing whatever the user
 * left in the field, not as re-persisting this. See the header.
 */
export function toEditValue(kg, unit = 'kg') {
    const value = toDisplay(kg, unit)
    return value === null ? '' : value.toFixed(DISPLAY_DECIMALS)
}
