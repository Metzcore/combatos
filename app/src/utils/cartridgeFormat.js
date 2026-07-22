/**
 * cartridgeFormat.js — display formatting for block-model cartridges
 *
 * Pure functions turning cartridge data (PROGRAM-CARTRIDGE-SPEC.md v2) into
 * strings/labels for the read-only Cartridge Viewer. No app/db dependency.
 */

const KIND_LABELS = {
    mobility: 'Mobility',
    strength: 'Strength',
    conditioning: 'Conditioning',
    cooldown: 'Cooldown',
    core: 'Core'
}

const KIND_COLORS = {
    mobility: 'blue',
    strength: 'red',
    conditioning: 'amber',
    cooldown: 'green',
    core: 'red'
}

/** Display label for a block kind, falling back to the raw kind if unknown. */
export function blockKindLabel(kind) {
    return KIND_LABELS[kind] || kind
}

/** CSS color variant (matches .section-header.<color> in index.css) for a block kind. */
export function blockKindColor(kind) {
    return KIND_COLORS[kind] || 'blue'
}

/**
 * Format a strength/core item's optional `prescription` object into a short
 * display string, e.g. { percent: 0.8, rpe: 8 } -> "80% 1RM · RPE 8".
 * Returns null when there's nothing to show (mobility/cooldown never call this).
 */
export function formatPrescription(prescription) {
    if (!prescription || typeof prescription !== 'object') return null

    const parts = []
    if (typeof prescription.percent === 'number') parts.push(`${Math.round(prescription.percent * 100)}% 1RM`)
    if (typeof prescription.rpe === 'number') parts.push(`RPE ${prescription.rpe}`)
    if (typeof prescription.rir === 'number') parts.push(`RIR ${prescription.rir}`)
    if (prescription.addedLoad) parts.push(`+${prescription.addedLoad}`)

    if (parts.length === 0) return prescription.note || null

    const head = parts.join(' · ')
    return prescription.note ? `${head} — ${prescription.note}` : head
}

/** Format a PAP `pair` object into a short display string. */
export function formatPair(pair) {
    if (!pair || !pair.name) return null
    const dose = [pair.sets, pair.reps].filter((v) => v != null).join('x')
    return dose ? `${pair.name} (${dose})` : pair.name
}

export default { blockKindLabel, blockKindColor, formatPrescription, formatPair }
