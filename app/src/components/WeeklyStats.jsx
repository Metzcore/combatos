import { useMemo } from 'react'
import { buildWeeklyStats } from '../utils/weeklyStats.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Format 'YYYY-MM-DD' as e.g. "Jul 6" without any Date/timezone parsing
function formatShort(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number)
    return `${MONTHS[m - 1]} ${d}`
}

// Mirrors the HUD's hip-score banner thresholds: red <=2, amber =3, green >=4
function hipColor(score) {
    if (score <= 2) return 'var(--alert)'
    if (score === 3) return 'var(--warn)'
    return 'var(--primary)'
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6]

export default function WeeklyStats({ sessions }) {
    const weeks = useMemo(() => buildWeeklyStats(sessions), [sessions])

    if (!sessions || sessions.length === 0) {
        return (
            <div className="text-center text-dim mt-8">
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>📊</div>
                No sessions logged yet — weekly stats will appear here.
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {weeks.map(w => (
                <div key={w.weekStart} className="card" style={{ padding: 14 }}>
                    {/* Week header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: w.total > 0 ? 10 : 0 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                            Week of {formatShort(w.weekStart)} – {formatShort(w.weekEnd)}
                        </div>
                        {w.total > 0 ? (
                            <div className="badge badge-amber">{w.total} session{w.total !== 1 ? 's' : ''}</div>
                        ) : (
                            <div className="badge badge-dim">0 sessions</div>
                        )}
                    </div>

                    {w.total === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 8 }}>
                            — No sessions logged
                        </div>
                    ) : (
                        <>
                            {/* S&C vs Fight split */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                <div className="badge badge-green">S&amp;C: {w.sc}</div>
                                <div className="badge badge-red">Fight: {w.fight}</div>
                            </div>

                            {/* Avg completeness (S&C only) */}
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--dim)', marginBottom: 4 }}>
                                    <span>Avg completeness (S&amp;C)</span>
                                    <strong style={{ color: w.avgCompleteness !== null ? 'var(--primary)' : 'var(--dim)' }}>
                                        {w.avgCompleteness !== null ? `${w.avgCompleteness}%` : '—'}
                                    </strong>
                                </div>
                                {w.avgCompleteness !== null && (
                                    <div className="progress-bar">
                                        <div className="progress-bar__fill" style={{ width: `${Math.min(w.avgCompleteness, 100)}%` }} />
                                    </div>
                                )}
                            </div>

                            {/* Hip-score trend (date order) */}
                            {w.hipTrend.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>Hip trend</span>
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                        {w.hipTrend.map((h, i) => (
                                            <span
                                                key={`${h.date}-${i}`}
                                                title={`${h.date}: hip ${h.hipScore}`}
                                                style={{
                                                    width: 14, height: 14, borderRadius: '50%',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.6rem', fontWeight: 700, color: 'var(--bg)',
                                                    background: hipColor(h.hipScore)
                                                }}
                                            >
                                                {h.hipScore}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Day coverage + phase */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>Days</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {ALL_DAYS.map(d => {
                                        const covered = w.daysCovered.includes(d)
                                        return (
                                            <span
                                                key={d}
                                                style={{
                                                    width: 20, height: 20, borderRadius: 'var(--radius-sm)',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    color: covered ? 'var(--bg)' : 'var(--dim)',
                                                    background: covered ? 'var(--accent)' : 'transparent',
                                                    border: covered ? '1px solid var(--accent)' : '1px solid var(--divider)'
                                                }}
                                            >
                                                {d}
                                            </span>
                                        )
                                    })}
                                </div>
                                {w.phases.length > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--label)', marginLeft: 'auto' }}>
                                        Phase {w.phases.join(' → ')}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    )
}
