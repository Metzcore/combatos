import { useState, useEffect } from 'react'
import { db } from '../db/index.jsx'
import { getDailyFocus } from '../hooks/usePlaybook.js'
import WeeklyStats from './WeeklyStats.jsx'
import TopTabs from './TopTabs.jsx'
import { HUB_TOP_TABS } from '../utils/navState.js'

// view/onViewChange are owned by AppShell (W20) so the Log/Stats selection
// survives hub switches. Everything else in this component is unchanged.
export default function Calendar({ view, onViewChange }) {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadSessions = async () => {
            const data = await db.sessions.toArray()
            // Sort by most recent first
            data.sort((a, b) => b.id - a.id)
            setSessions(data)
            setLoading(false)
        }
        loadSessions()
    }, [])

    return (
        <div className="app">
            <header className="page-header" style={{ paddingBottom: 10 }}>
                <h1>📅 Fight Log</h1>
                <div className="subtitle">Session History</div>

                <TopTabs
                    tabs={HUB_TOP_TABS.log}
                    active={view}
                    onChange={onViewChange}
                />
            </header>

            <main className="content" style={{ paddingBottom: 100 }}>
                {loading ? (
                    <div className="text-center text-dim mt-8">Loading history...</div>
                ) : view === 'stats' ? (
                    <WeeklyStats sessions={sessions} />
                ) : sessions.length === 0 ? (
                    <div className="text-center text-dim mt-8">
                        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
                        No sessions logged yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {sessions.map(s => {
                            // Extract date safely
                            const dateStr = s.date || 'Unknown Date'
                            const displayDate = new Date(dateStr).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric'
                            })

                            return (
                                <div key={s.id} className="card" style={{ padding: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.05rem' }}>{displayDate}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Phase {s.phase} • Day {s.day} {getDailyFocus(s.day) ? `— ${getDailyFocus(s.day)}` : ''}
                                            </div>
                                        </div>
                                        <div className={`badge ${s.sessionType === 'S&C' ? 'badge-green' : s.sessionType === 'Combat' ? 'badge-red' : 'badge-amber'}`}>
                                            {s.sessionType || 'S&C'}
                                        </div>
                                    </div>

                                    {s.sessionType === 'S&C' && s.completeness !== undefined && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: 8 }}>
                                            Completeness: <strong style={{ color: 'var(--primary)' }}>{s.completeness}%</strong>
                                        </div>
                                    )}

                                    {s.sessionDuration > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: 8 }}>
                                            Duration: <strong>{s.sessionDuration} mins</strong>
                                        </div>
                                    )}

                                    {(s.notes || s.altSessionDetails) && (
                                        <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius-sm)', marginTop: 8 }}>
                                            {s.altSessionDetails && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--warn)', whiteSpace: 'pre-wrap', marginBottom: s.notes ? 8 : 0 }}>
                                                    {s.altSessionDetails}
                                                </div>
                                            )}
                                            {s.notes && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--dim)', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                                                    "{s.notes}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
