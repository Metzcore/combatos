import { useMemo, useState } from 'react'
import { buildWeeklyStats } from '../../utils/weeklyStats.js'

/**
 * CompletenessTrend — W26 Overview panel (b). One small bar per week,
 * oldest → newest left → right, height = that week's
 * avgCompletenessCartridge from buildWeeklyStats(). NO new math — this is a
 * new renderer over existing aggregation.
 *
 * Honesty rules (personal-analytics-viz):
 * - A week with avgCompletenessCartridge === null is an explicit GAP (an
 *   empty dashed slot), never a zero-height bar. "No eligible cartridge S&C
 *   session" and "0% completeness" are different facts — and the help text
 *   below the heading says so out loud, so the sparse case reads as sparse
 *   rather than broken.
 * - avgCompletenessLegacy is never blended in — this strip is the cartridge
 *   figure only, same rule as the weekly cards.
 * - Bars are tappable; the exact figure surfaces in the readout line rather
 *   than a number crammed onto every bar at phone width.
 * - The dashed 100% reference line gives the bar heights a scale; the date
 *   range under the strip makes "last N weeks" concrete.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 'YYYY-MM-DD' → 'Jul 6' — string split only, never Date parsing.
function formatShort(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number)
    return `${MONTHS[m - 1]} ${d}`
}

const TRACK_HEIGHT = 56

export default function CompletenessTrend({ sessions, weeks }) {
    // buildWeeklyStats returns newest-first; the strip reads oldest → newest.
    const weeksData = useMemo(
        () => [...buildWeeklyStats(sessions, { weeks })].reverse(),
        [sessions, weeks]
    )
    const [selected, setSelected] = useState(null)

    const first = weeksData[0]
    const last = weeksData[weeksData.length - 1]

    return (
        <section aria-label="Weekly completeness trend">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Last {weeks} weeks · avg completeness
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.45 }}>
                Completeness is how much of a session's prescribed strength and core work was
                actually recorded. A dashed slot means no S&amp;C session was logged that week —
                not zero percent.
            </div>

            {/* The 100% marker sits at the track's top edge so bar heights
                have a visible scale. */}
            <div style={{ position: 'relative', paddingTop: 14 }}>
                <span style={{ position: 'absolute', top: 0, right: 0, fontSize: '0.6rem', color: 'var(--dim)' }}>
                    100%
                </span>
                <span
                    aria-hidden="true"
                    style={{ position: 'absolute', top: 14, left: 0, right: 0, borderTop: '1px dashed var(--divider)' }}
                />
                <div
                    role="group"
                    aria-label="Average cartridge S&C completeness per week"
                    style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: TRACK_HEIGHT }}
                >
                    {weeksData.map(w => {
                        const pct = w.avgCompletenessCartridge
                        const isSelected = selected === w.weekStart
                        return (
                            <button
                                key={w.weekStart}
                                type="button"
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: 0,
                                    borderRadius: 2,
                                    minHeight: 44, // tap target — the visible bar sits at the bottom
                                    background: 'transparent',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                }}
                                onClick={() => setSelected(isSelected ? null : w.weekStart)}
                                aria-label={
                                    pct === null
                                        ? `Week of ${formatShort(w.weekStart)}: no S&C sessions logged`
                                        : `Week of ${formatShort(w.weekStart)}: ${pct}% average completeness`
                                }
                            >
                                {pct === null ? (
                                    // Explicit gap: an empty slot, not a zero bar.
                                    <span
                                        style={{
                                            width: '100%',
                                            height: TRACK_HEIGHT - 4,
                                            border: '1px dashed var(--divider)',
                                            borderRadius: 2,
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                ) : (
                                    <span
                                        style={{
                                            width: '100%',
                                            height: `${Math.max((pct / 100) * TRACK_HEIGHT, 3)}px`,
                                            background: 'var(--primary)',
                                            borderRadius: 2,
                                            opacity: isSelected ? 1 : 0.85,
                                            boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
                                        }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {first && last && (
                <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--dim)', textAlign: 'center' }}>
                    {formatShort(first.weekStart)} – {formatShort(last.weekEnd)}
                </div>
            )}

            <div style={{ marginTop: 6, fontSize: '0.75rem', minHeight: '1.2em', textAlign: 'center' }}>
                {selected === null
                    ? <span style={{ color: 'var(--dim)' }}>Tap a week for the exact figure</span>
                    : (() => {
                        const w = weeksData.find(x => x.weekStart === selected)
                        if (!w) return ''
                        return (
                            <span style={{ color: 'var(--accent)' }}>
                                {w.avgCompletenessCartridge === null
                                    ? `Week of ${formatShort(w.weekStart)} — no S&C sessions logged`
                                    : `Week of ${formatShort(w.weekStart)} — ${w.avgCompletenessCartridge}%`}
                            </span>
                        )
                    })()}
            </div>
        </section>
    )
}
