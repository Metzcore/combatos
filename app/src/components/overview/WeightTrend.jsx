import { useMemo } from 'react'
import { buildWeightTrend } from '../../utils/weightTrend.js'
import { formatWeight } from '../../utils/weightValue.js'
import { parseDateParts, toEpochMs } from '../../utils/dateMath.js'

/**
 * WeightTrend — W30 Overview panel (d). Body weight over time.
 *
 * Every number comes from `utils/weightTrend.js`; this component only draws.
 * If a value here looks wrong, it is wrong in the utility — fix it there, do
 * not recompute inline. That boundary is what makes the Overview numbers
 * trustworthy, and it held twice under pressure during W26.
 *
 * Honesty rules, inherited from the W26 panels and extended for an irregular
 * series:
 * - no entries       → one plain line, no empty chart frame, no zero baseline
 * - a single entry   → the dated value, and explicitly NO slope or "stable"
 * - gaps             → a visible BREAK in the line, positioned by real
 *                      calendar distance. Never zero-filled, interpolated,
 *                      smoothed, or evenly spaced.
 *
 * NO TARGET LINE, NO PROJECTION, NO "ON TRACK". This reports what was
 * measured. Per decision_log 2026-07-31: the evidence for self-monitoring is
 * strong, for distal targets it is weak — so record the trend, never create a
 * number to fail against. In a weight-cutting sport that distinction is not
 * decorative.
 *
 * Colour carries NO judgement: up and down are the same neutral accent. A red
 * "gain" would be a verdict on the athlete's body, which is not this surface's
 * job.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// String-based, like formatHistoryDate in Calendar.jsx. Never
// new Date(dateStr) — that parses as UTC midnight and renders local.
function formatShort(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return dateStr
    return `${MONTHS[parts.m - 1]} ${parts.d}`
}

function formatLong(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return dateStr
    const weekday = WEEKDAYS[new Date(toEpochMs(parts)).getUTCDay()]
    return `${weekday}, ${MONTHS[parts.m - 1]} ${parts.d}`
}

const VIEW_W = 300
const VIEW_H = 90
const PAD_Y = 10

export default function WeightTrend({ rows, ownerUserId, unit = 'kg', today = null }) {
    const trend = useMemo(
        () => buildWeightTrend(rows, { ownerUserId, unit, today }),
        [rows, ownerUserId, unit, today]
    )

    return (
        <section className="weight-trend" aria-label="Body weight">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Body weight
            </div>

            {trend.isEmpty ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--dim)', fontStyle: 'italic' }}>
                    — No weight check-ins yet
                </div>
            ) : trend.hasSingleEntry ? (
                <SingleEntry point={trend.points[0]} unit={unit} />
            ) : (
                <Series trend={trend} unit={unit} />
            )}
        </section>
    )
}

/**
 * One measurement is a fact, not a trend. Showing a chart here would draw a
 * flat line implying stability that a single reading cannot demonstrate.
 */
function SingleEntry({ point, unit }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>
                    {formatWeight(point.kg, unit)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>{formatLong(point.date)}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginTop: 6 }}>
                Add another check-in to see change over time.
            </div>
        </div>
    )
}

function Series({ trend, unit }) {
    const { points, gaps, domain, change } = trend

    // Pad the vertical range so a nearly-flat series does not render as a
    // dead-straight line pinned to the frame edges. A minimum span keeps a
    // 0.3 kg fluctuation from being drawn as though it were dramatic — the
    // inverse of the usual chart lie, and just as misleading.
    const rawSpan = domain.maxKg - domain.minKg
    const span = Math.max(rawSpan, 1)
    const mid = (domain.maxKg + domain.minKg) / 2
    const lo = mid - span / 2
    const hi = mid + span / 2

    const xy = p => ({
        x: p.x * VIEW_W,
        y: PAD_Y + (1 - (p.kg - lo) / (hi - lo)) * (VIEW_H - PAD_Y * 2),
    })

    // Split into unbroken runs at each reported gap, so the renderer draws a
    // BREAK rather than a line implying continuous observation across it.
    const gapAfter = new Set(gaps.map(g => g.afterIndex))
    const segments = []
    let current = []
    points.forEach((p, i) => {
        current.push(xy(p))
        if (gapAfter.has(i) || i === points.length - 1) {
            segments.push(current)
            current = []
        }
    })

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>
                    {formatWeight(points[points.length - 1].kg, unit)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>
                    latest · {formatLong(points[points.length - 1].date)}
                </span>
            </div>

            {/* The recessed track frames the chart as a measuring surface set
                into the page — same well material as the Strata block wells.
                Inside it: broken runs stay broken (nothing bridges a gap),
                no zero baseline, no grid, no smoothing. */}
            <div className="weight-trend__track">
                <svg
                    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                    width="100%"
                    height={VIEW_H}
                    role="img"
                    aria-label={`Body weight from ${formatLong(domain.firstDate)} to ${formatLong(domain.lastDate)}`}
                    style={{ display: 'block', overflow: 'visible' }}
                >
                    {segments.map((seg, i) => (
                        <polyline
                            key={i}
                            points={seg.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}
                    {points.map((p, i) => {
                        const { x, y } = xy(p)
                        // The LATEST point carries a small ring — emphasis only,
                        // matching the "latest ·" label above. Never a verdict:
                        // up and down share the same neutral accent throughout.
                        if (i === points.length - 1) {
                            return (
                                <g key={i}>
                                    <circle className="weight-trend__ring" cx={x} cy={y} r="5.5" />
                                    <circle cx={x} cy={y} r="3" fill="var(--accent)" />
                                </g>
                            )
                        }
                        return <circle key={i} cx={x} cy={y} r="2.25" fill="var(--accent)" />
                    })}
                </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--dim)', marginTop: 2 }}>
                <span>{formatShort(domain.firstDate)}</span>
                <span>{formatShort(domain.lastDate)}</span>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginTop: 8, lineHeight: 1.45 }}>
                {/* Factual, directional, unjudged. No "good"/"bad", no target. */}
                {change.direction === 'flat'
                    ? `No net change across ${points.length} check-ins.`
                    : `${formatWeight(Math.abs(change.kg), unit)} ${change.direction === 'down' ? 'lower' : 'higher'} than the first of ${points.length} check-ins.`}
                {gaps.length > 0 && (
                    <> Breaks in the line are periods with no check-in, not changes in weight.</>
                )}
            </div>
        </div>
    )
}
