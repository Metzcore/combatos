/**
 * weightTrend.js — body-weight trend aggregation for the Log Overview (W30). PURE.
 *
 * Deliberately NOT folded into logOverview.js. That module aggregates SESSIONS
 * — it groups session dates, derives session categories, and reads workout
 * payload fields. Body metrics are a different schema with a different owner
 * key, and mixing them would force every caller to pass unrelated arrays
 * through one function.
 *
 * No Dexie, no React, no settings reads: the component that renders this must
 * never be able to disagree with it. That boundary held twice under pressure
 * during W26 and is the reason the Overview numbers are trustworthy.
 *
 * ── HONESTY RULES FOR SPARSE DATA (the whole point of this module) ────────
 * A weight series is irregular by nature — people miss weeks. Every convenient
 * charting default lies about that:
 *
 *   - zero-filling a missing week draws a plunge to 0 kg that never happened;
 *   - interpolating invents measurements the athlete never took;
 *   - smoothing hides exactly the sharp moves that matter in a weight-cutting
 *     sport;
 *   - EVEN SPACING is the subtlest one — it silently redraws a 3-month gap as
 *     though it were a week, changing the apparent slope of a real trend.
 *
 * So points carry a fractional `x` derived from their ACTUAL calendar date,
 * and gaps are reported explicitly for the renderer to draw as a break rather
 * than a line. A gap is a missing observation, not a change in weight.
 *
 * NO TARGET, NO PROJECTION, NO "ON TRACK". This module reports what was
 * measured and the change between first and last. It does not extrapolate,
 * score, or judge — per decision_log 2026-07-31, the evidence for
 * self-monitoring is strong and for distal targets is weak.
 */

import { daysBetween, isValidDateStr } from './dateMath.js'
import { isValidKg, toDisplay } from './weightValue.js'

/** A gap longer than this is drawn as a break rather than a continuous line. */
export const GAP_THRESHOLD_DAYS = 10

/** Default horizon. Its own window — NOT the 8/26-week control that governs
 *  session completeness and activity coverage, which would silently imply the
 *  two are measuring over the same period. */
export const DEFAULT_HORIZON_DAYS = 365

/**
 * buildWeightTrend — rows → a renderable, honest series.
 *
 * @param {Array}  rows           bodyWeight rows: { ownerUserId, date, kg }
 * @param {object} opts
 * @param {string} opts.ownerUserId  REQUIRED — rows for anyone else are dropped
 * @param {string} [opts.unit]       display unit ('kg' | 'lb')
 * @param {string} [opts.today]      local 'YYYY-MM-DD', for the horizon window
 * @param {number} [opts.horizonDays]
 */
export function buildWeightTrend(rows, {
    ownerUserId,
    unit = 'kg',
    today = null,
    horizonDays = DEFAULT_HORIZON_DAYS,
} = {}) {
    const empty = {
        points: [], gaps: [], domain: null, change: null,
        isEmpty: true, hasSingleEntry: false, unit,
    }

    // No owner means we cannot prove any row belongs to the current user.
    // Showing another identity's body weight would be a serious leak, so the
    // safe answer is to show nothing.
    if (!Array.isArray(rows) || !ownerUserId) return empty

    const valid = rows
        .filter(r => r
            && r.ownerUserId === ownerUserId
            && isValidDateStr(r.date)
            && isValidKg(r.kg))
        // Within the horizon, when a "today" is supplied. A row dated in the
        // future is kept: it is more likely a timezone edge than a fabrication,
        // and silently hiding a row the user can see in their list would be
        // more confusing than showing it.
        .filter(r => {
            if (!today || !isValidDateStr(today)) return true
            const age = daysBetween(r.date, today)
            return age === null ? false : age <= horizonDays
        })
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    if (valid.length === 0) return empty

    const firstDate = valid[0].date
    const lastDate = valid[valid.length - 1].date
    const spanDays = daysBetween(firstDate, lastDate)

    const points = valid.map(r => ({
        date: r.date,
        kg: r.kg,
        display: toDisplay(r.kg, unit),
        // Fractional position by real calendar distance. With a single point
        // (or several on one day) the span is 0 and everything sits at 0 —
        // the renderer must handle that rather than divide by zero here.
        x: spanDays > 0 ? daysBetween(firstDate, r.date) / spanDays : 0,
    }))

    const kgs = valid.map(r => r.kg)
    const minKg = Math.min(...kgs)
    const maxKg = Math.max(...kgs)

    const gaps = []
    for (let i = 1; i < valid.length; i++) {
        const days = daysBetween(valid[i - 1].date, valid[i].date)
        if (days > GAP_THRESHOLD_DAYS) {
            gaps.push({ afterIndex: i - 1, days })
        }
    }

    // A single entry gets NO change and NO slope. "Stable" would be a claim
    // about a trend that one measurement cannot support.
    const change = points.length >= 2
        ? {
            kg: Number((lastDate === firstDate ? 0 : valid[valid.length - 1].kg - valid[0].kg).toFixed(3)),
            display: toDisplay(Math.abs(valid[valid.length - 1].kg - valid[0].kg), unit),
            direction: signOf(valid[valid.length - 1].kg - valid[0].kg),
        }
        : null

    return {
        points,
        gaps,
        domain: { minKg, maxKg, firstDate, lastDate, spanDays },
        change,
        isEmpty: false,
        hasSingleEntry: points.length === 1,
        unit,
    }
}

/** 'up' | 'down' | 'flat' — a factual description of two numbers, not a verdict. */
function signOf(delta) {
    if (delta > 0) return 'up'
    if (delta < 0) return 'down'
    return 'flat'
}

/**
 * latestWeight — the most recent valid entry for this owner, or null.
 * Separate from the trend so the Profile screen can show "current" without
 * building a whole series.
 */
export function latestWeight(rows, ownerUserId) {
    if (!Array.isArray(rows) || !ownerUserId) return null
    let best = null
    for (const r of rows) {
        if (!r || r.ownerUserId !== ownerUserId) continue
        if (!isValidDateStr(r.date) || !isValidKg(r.kg)) continue
        if (!best || r.date > best.date) best = r
    }
    return best
}
