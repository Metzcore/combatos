import { useMemo } from 'react'
import { buildActivityCoverage } from '../../utils/logOverview.js'
import { activityLabel } from '../../utils/sessionActivityLabels.js'

/**
 * ActivityCoverage — W26 Overview panel (c). One row per activity, in the
 * frozen SESSION_ACTIVITIES order the utility returns (never re-sorted).
 * Labels come from sessionActivityLabels.js — the single shared vocabulary.
 *
 * Honesty rules (schema §8, personal-analytics-viz):
 * - eligible === 0 → one empty state, not nine rows of 0/0.
 * - unknown > 0 → a quiet footnote: those sessions are excluded from BOTH
 *   sides of the ratio because their data is genuinely unknown.
 * - pct === null renders as an em dash, never 0%.
 */
export default function ActivityCoverage({ sessions, sinceDateStr, untilDateStr }) {
    const coverage = useMemo(
        () => buildActivityCoverage(sessions, { sinceDateStr, untilDateStr }),
        [sessions, sinceDateStr, untilDateStr]
    )

    return (
        <section aria-label="Activity coverage">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Activity coverage
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.45 }}>
                {coverage.eligible === 0
                    ? 'How often each activity was recorded across the logged workouts in the selected period.'
                    : `How often each activity was recorded across the ${coverage.eligible} logged workout${coverage.eligible !== 1 ? 's' : ''} in the selected period.`}
            </div>

            {coverage.eligible === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--dim)', fontStyle: 'italic' }}>
                    — No sessions with activity data in this period
                    {coverage.unknown > 0 && (
                        // A period that's entirely pre-sessionActivities legacy data must not
                        // read the same as a genuinely empty period — those are different facts.
                        <> ({coverage.unknown} older session{coverage.unknown !== 1 ? 's' : ''} logged, no activity data recorded)</>
                    )}
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {coverage.activities.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: '0 0 30%', fontSize: '0.8rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activityLabel(a.id)}
                                </div>
                                <div style={{ flex: '0 0 auto', fontSize: '0.75rem', color: 'var(--dim)', minWidth: 34, textAlign: 'right' }}>
                                    {a.count}/{coverage.eligible}
                                </div>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                    <div
                                        className="progress-bar__fill"
                                        style={{ width: `${Math.min(a.pct ?? 0, 100)}%`, transition: 'none' }}
                                    />
                                </div>
                                <div style={{ flex: '0 0 auto', fontSize: '0.75rem', color: 'var(--dim)', minWidth: 40, textAlign: 'right' }}>
                                    {a.pct === null ? '—' : `${a.pct}%`}
                                </div>
                            </div>
                        ))}
                    </div>
                    {coverage.unknown > 0 && (
                        <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--dim)', fontStyle: 'italic' }}>
                            {coverage.unknown} older session{coverage.unknown !== 1 ? 's' : ''} ha{coverage.unknown !== 1 ? 've' : 's'} no activity data
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
