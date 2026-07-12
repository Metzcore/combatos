/**
 * nextDay.js — Next Training Day Calculation
 *
 * Extracted (behavior-identical) from the inline calculation in HUD.jsx's
 * progress-summary effect so it can be unit tested directly.
 *
 * Cycle length is 7 days (decision D2, implemented in roadmap item W16):
 * strictly sequential 1→2→3→4→5→6→7→1. Day 7 is the optional/custom gym
 * day; fight-gym days (2, 4) and Day 7 all count as days.
 */

/**
 * Given the day of the last logged session, returns the next day in the
 * 7-day training cycle, wrapping 7 back to 1.
 *
 * @param {number} lastDay - day of the last logged session (1-7)
 * @returns {number} next day (1-7)
 */
export function nextDay(lastDay) {
    return (lastDay % 7) + 1
}

export default nextDay
