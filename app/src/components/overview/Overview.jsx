import { useState } from 'react'
import { addDays } from '../../utils/dateMath.js'
import { mondayOfWeek } from '../../utils/weeklyStats.js'
import MonthHeatmap from './MonthHeatmap.jsx'
import CompletenessTrend from './CompletenessTrend.jsx'
import ActivityCoverage from './ActivityCoverage.jsx'
import WeightTrend from './WeightTrend.jsx'

/**
 * Overview — the Log hub's second tab (W26). Pattern recognition across
 * time, visual-first: a monthly heatmap, a weekly completeness trend, and
 * an activity-coverage breakdown. All numbers come from the pure utilities
 * (logOverview.js / weeklyStats.js); this component only composes them.
 *
 * Two time controls on one screen is deliberate: the heatmap keeps its own
 * month prev/next (a monthly grid), while the shared 8/26-week period
 * control sits directly above the two panels it drives (trend strip and
 * coverage), so each control's scope is obvious from its placement. The two
 * panels always describe the SAME period: sinceDateStr is derived from the
 * same window the trend displays (last N ISO weeks including the current
 * one).
 */

const PERIODS = [
    { weeks: 8, label: '8 weeks' },
    { weeks: 26, label: '26 weeks' },
]

export default function Overview({ sessions, weights = [], ownerUserId = null, weightUnit = 'kg' }) {
    const [weeks, setWeeks] = useState(8)

    // Same "today" convention as the write path and the utilities.
    const todayStr = new Date().toISOString().slice(0, 10)
    const currentMonday = mondayOfWeek(todayStr)
    const sinceDateStr = currentMonday ? addDays(currentMonday, -7 * (weeks - 1)) : undefined

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <MonthHeatmap sessions={sessions} />

            {/* The period control sits directly above the two panels it
                actually drives — placing it above the calendar would imply
                it governs the calendar too, which it does not. */}
            <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Trend &amp; coverage period
                </div>
                <div
                    role="group"
                    aria-label="Trend and coverage period"
                    style={{ display: 'flex', gap: 8 }}
                >
                    {PERIODS.map(p => {
                        const active = weeks === p.weeks
                        return (
                            <button
                                key={p.weeks}
                                type="button"
                                onClick={() => setWeeks(p.weeks)}
                                aria-pressed={active}
                                style={{
                                    flex: 1,
                                    minHeight: 48,
                                    background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--panel)',
                                    color: active ? 'var(--accent)' : 'var(--label)',
                                    border: `1px solid ${active ? 'var(--accent)' : 'var(--divider)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {p.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            <CompletenessTrend sessions={sessions} weeks={weeks} />
            <ActivityCoverage sessions={sessions} sinceDateStr={sinceDateStr} untilDateStr={todayStr} />

            {/* W30. Deliberately NOT governed by the 8/26-week control above:
                that control is labelled "Trend & coverage period" and drives
                exactly the two panels beneath it. Weight is measured on its
                own irregular cadence, and silently reusing that window would
                imply all three panels describe the same period. */}
            <WeightTrend rows={weights} ownerUserId={ownerUserId} unit={weightUnit} />
        </div>
    )
}
