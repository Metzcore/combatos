/**
 * nextDay.js — Next Training Day Calculation
 *
 * Extracted (behavior-identical) from the inline calculation in HUD.jsx's
 * progress-summary effect so it can be unit tested directly.
 *
 * Current cycle length is 6 days. Decision D2 (see
 * docs/planning/roadmap/OPEN-DECISIONS.md) will extend this to a 7-day
 * cycle in roadmap item W16 — until then this pins CURRENT behavior.
 */

/**
 * Given the day of the last logged session, returns the next day in the
 * 6-day training cycle, wrapping 6 back to 1.
 *
 * @param {number} lastDay - day of the last logged session (1-6)
 * @returns {number} next day (1-6)
 */
export function nextDay(lastDay) {
    return (lastDay % 6) + 1
}

export default nextDay
