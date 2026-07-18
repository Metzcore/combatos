import { useState, useMemo } from 'react'
import PLAYBOOK_DATA from '../data/playbook.js'
import { useDB } from '../db/index.jsx'
import { isPhaseLocked } from '../utils/phaseUnlock.js'

export default function PlaybookViewer() {
    // W14 — lock badges read the same phase + sessionCount the real unlock
    // check uses (utils/phaseUnlock.js). Signal only: locked phases stay
    // fully browsable.
    const { phase, sessionCount } = useDB()
    // Group rows by Phase then Day
    const playbook = useMemo(() => {
        const phases = { 1: {}, 2: {}, 3: {} }
        PLAYBOOK_DATA.forEach(row => {
            if (!phases[row.Phase]) return
            if (!phases[row.Phase][row.Day]) phases[row.Phase][row.Day] = []
            phases[row.Phase][row.Day].push(row)
        })
        return phases
    }, [])

    const [activePhase, setActivePhase] = useState(1)

    return (
        <div className="app">
            <header className="page-header" style={{ marginBottom: 12 }}>
                <h1>Playbook</h1>
                <div className="subtitle">CURRICULUM OVERVIEW</div>
            </header>

            <div className="selector-row" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                {[1, 2, 3].map(p => {
                    const locked = isPhaseLocked(p, phase, sessionCount)
                    return (
                        <button
                            key={p}
                            className={`${activePhase === p ? 'btn-primary' : 'btn-secondary'}${locked ? ' phase-locked' : ''}`}
                            onClick={() => setActivePhase(p)}
                            style={{ padding: '8px 16px', width: 'auto' }}
                        >
                            Phase {p}{locked ? ' 🔒' : ''}
                        </button>
                    )
                })}
            </div>

            <div className="content" style={{ padding: 0 }}>
                {Object.keys(playbook[activePhase]).sort((a, b) => a - b).map(day => (
                    <div key={day} className="card" style={{ marginBottom: 16 }}>
                        <div className="section-header red" style={{ fontSize: '0.9rem' }}>Day {day}</div>
                        <div style={{ padding: 12 }}>
                            {playbook[activePhase][day].map((row, idx) => (
                                <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--divider)' }}>

                                    <div style={{ fontSize: '0.72rem', color: row.Variant === 'HA' ? 'var(--red)' : 'var(--amber)', fontWeight: 700, marginBottom: 4 }}>
                                        {row.Block} {row.Slot ? `[Slot ${row.Slot}]` : ''} {row.Variant === 'HA' ? ' — HIGH ALERT' : ''}
                                    </div>

                                    <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.95rem' }}>
                                        {row.Exercise}
                                    </div>

                                    <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        {row.Sets && <span><strong>Sets:</strong> {row.Sets}</span>}
                                        {row.Target_Reps && <span><strong>Target:</strong> {row.Target_Reps}</span>}
                                        {row.Load_Note && <span><strong>Load:</strong> {row.Load_Note}</span>}
                                    </div>

                                    {row.Cue && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--label)', fontStyle: 'italic', marginTop: 6 }}>
                                            💡 {row.Cue}
                                        </div>
                                    )}

                                    {row.PAP_Exercise && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600, marginTop: 6 }}>
                                            ⚡ PAP: {row.PAP_Exercise} ({row.PAP_Sets}x{row.PAP_Reps})
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
