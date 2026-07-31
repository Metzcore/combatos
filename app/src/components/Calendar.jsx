import { useState, useEffect } from 'react'
import { db } from '../db/index.jsx'
import { getDailyFocus } from '../hooks/usePlaybook.js'
import Overview from './overview/Overview.jsx'
import TopTabs from './TopTabs.jsx'
import { HUB_TOP_TABS } from '../utils/navState.js'
import { categoryBadge, sessionBucket } from '../utils/sessionCategory.js'
import { isReadableCartridgeRow } from '../utils/cartridgeSessionPayload.js'
import { parseDateParts, toEpochMs } from '../utils/dateMath.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Format a 'YYYY-MM-DD' session date as "Thu, Jul 30" with pure calendar
// math — the same string-based approach as formatShort in
// overview/CompletenessTrend.jsx. Never new Date(dateStr): that parses as
// UTC midnight and renders in local time, silently one day early for any
// user west of UTC.
function formatHistoryDate(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return dateStr
    const weekday = WEEKDAYS[new Date(toEpochMs(parts)).getUTCDay()]
    return `${weekday}, ${MONTHS[parts.m - 1]} ${parts.d}`
}

// view/onViewChange are owned by AppShell (W20) so the History/Overview
// selection survives hub switches. Everything else in this component is
// unchanged.
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
                {/* W26: "Fight Log" assumed every user trains like a fighter — not
                    true across cartridges/programmes (e.g. Apex). Matches the
                    existing bottom-nav label ("Log"), which was already neutral. */}
                <h1>📅 Log</h1>
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
                    <Overview sessions={sessions} />
                ) : sessions.length === 0 ? (
                    <div className="text-center text-dim mt-8">
                        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
                        No sessions logged yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {sessions.map(s => {
                            // Extract date safely — string-based formatting,
                            // never new Date(dateStr) (UTC-midnight parse bug)
                            const dateStr = s.date || 'Unknown Date'
                            const displayDate = formatHistoryDate(dateStr)
                            const isCartridge = isReadableCartridgeRow(s)
                            const badge = categoryBadge(s)

                            return (
                                <div key={s.id} className="card" style={{ padding: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.05rem' }}>{displayDate}</div>
                                            {isCartridge ? (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {s.dayTemplateLabel || s.dayTemplateKey || ''}
                                                </div>
                                            ) : (
                                                /* W26: the legacy Phase/Day line is permanent
                                                   historical furniture — the pre-rebuild system
                                                   no longer exists and no new row will ever carry
                                                   it. Kept, but demoted to a quiet archival
                                                   detail rather than a live concept. */
                                                <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>
                                                    Phase {s.phase} • Day {s.day} {getDailyFocus(s.day) ? `— ${getDailyFocus(s.day)}` : ''}
                                                </div>
                                            )}
                                        </div>
                                        {/* A7a (finding #6): the actual cartridge category, not a
                                            guessed "S&C" default for any non-legacy row. */}
                                        <div className={`badge ${badge.className}`}>{badge.label}</div>
                                    </div>

                                    {sessionBucket(s) === 'sc' && s.completeness !== undefined && (
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
