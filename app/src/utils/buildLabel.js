/**
 * utils/buildLabel.js — the "Version" row in More › About (W40).
 *
 * The build stamp ({ commit, builtAt }) is injected by vite.config.js at build
 * time; this only formats it, so it is testable without a build. UTC on
 * purpose: the same build must read the same on every device.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2 Oct 2026 · 4c5551b". Degrades to whichever half is usable, else "unknown". */
export function formatBuildLabel(stamp) {
    const commit = stamp && typeof stamp.commit === 'string' ? stamp.commit.trim() : ''
    const built = stamp && stamp.builtAt ? new Date(stamp.builtAt) : null
    const validDate = built && Number.isFinite(built.getTime())
    const date = validDate
        ? `${built.getUTCDate()} ${MONTHS[built.getUTCMonth()]} ${built.getUTCFullYear()}`
        : ''
    if (date && commit) return `${date} · ${commit}`
    return date || commit || 'unknown'
}

/** Reads the build-time constant; safe where it was never defined (tests). */
export function currentBuildLabel() {
    // eslint-disable-next-line no-undef
    const stamp = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : null
    return formatBuildLabel(stamp)
}
