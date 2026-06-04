import { useState } from 'react'
import { useDB } from '../db/index.jsx'

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function RoundsTimer() {
    const { roundsTimer, savedRoundsSetups, saveRoundsSetup, deleteRoundsSetup, alertState } = useDB()
    const { config, setConfig, status, phase, currentRound, timeRemaining, nextInterimTarget, start, pause, reset, loadSetup } = roundsTimer

    const [setupName, setSetupName] = useState('')

    const updateConfig = (key, val) => {
        setConfig(prev => ({ ...prev, [key]: val === '' ? '' : (Number(val) || 0) }))
    }

    const updateRoundMin = (val) => {
        if (val === '') {
            updateConfig('round', typeof config.round === 'number' ? config.round % 60 : 0);
            return;
        }
        const m = Number(val) || 0;
        const s = typeof config.round === 'number' ? config.round % 60 : 0;
        updateConfig('round', m * 60 + s);
    }

    const updateRoundSec = (val) => {
        if (val === '') {
            updateConfig('round', Math.floor((typeof config.round === 'number' ? config.round : 0) / 60) * 60);
            return;
        }
        const m = Math.floor((typeof config.round === 'number' ? config.round : 0) / 60);
        const s = Number(val) || 0;
        updateConfig('round', m * 60 + s);
    }

    const handleSave = () => {
        if (!setupName.trim()) {
            alert('Please enter a name for this setup.');
            return;
        }
        saveRoundsSetup({ ...config, name: setupName.trim() });
        setSetupName('');
    }

    if (status === 'idle') {
        return (
            <main className="content">
                <div className="card" style={{ padding: 20 }}>
                    <div className="section-header blue" style={{ margin: '-20px -20px 20px -20px' }}>
                        ⚙️ Configure Rounds
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>Prep (sec)</label>
                            <input type="number" onFocus={e => e.target.select()} value={config.prep} onChange={e => updateConfig('prep', e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>Rounds</label>
                            <input type="number" onFocus={e => e.target.select()} value={config.rounds} onChange={e => updateConfig('rounds', e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>Round (min)</label>
                            <input type="number" onFocus={e => e.target.select()} value={config.round === '' ? '' : Math.floor(config.round / 60)} onChange={e => updateRoundMin(e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>Round (sec)</label>
                            <input type="number" onFocus={e => e.target.select()} value={config.round === '' ? '' : config.round % 60} onChange={e => updateRoundSec(e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>Rest (sec)</label>
                            <input type="number" onFocus={e => e.target.select()} value={config.rest} onChange={e => updateConfig('rest', e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4 }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>Interim Bell Interval (sec, 0 to disable)</label>
                            <input type="number" onFocus={e => e.target.select()} value={config.interim} onChange={e => updateConfig('interim', e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4 }} />
                        </div>
                    </div>

                    <button className="btn-primary" onClick={start} style={{ width: '100%', padding: 15, fontSize: '1.1rem' }}>
                        START WORKOUT
                    </button>
                </div>

                <div className="card" style={{ padding: 20, marginTop: 20 }}>
                    <div className="section-header amber" style={{ margin: '-20px -20px 20px -20px' }}>
                        💾 Saved Setups
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        <input 
                            type="text" 
                            placeholder="Setup Name..." 
                            value={setupName}
                            onChange={e => setSetupName(e.target.value)}
                            style={{ width: '100%', padding: '12px 10px', fontSize: '1rem', color: '#ffffff', opacity: 1, WebkitTextFillColor: '#ffffff', caretColor: '#ffffff' }} 
                        />
                        <button className="btn-secondary" onClick={handleSave} style={{ width: '100%' }}>SAVE</button>
                    </div>

                    {savedRoundsSetups.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {savedRoundsSetups.map(setup => (
                                <div key={setup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: 8 }}>
                                    <button onClick={() => loadSetup(setup)} style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, margin: 0 }}>
                                        <strong style={{ color: 'var(--blue)' }}>{setup.name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginTop: 4 }}>
                                            {setup.rounds}x {Math.floor(setup.round / 60)}:{String(setup.round % 60).padStart(2, '0')} (Rest: {setup.rest}s)
                                        </div>
                                    </button>
                                    <button className="btn-ghost" onClick={() => deleteRoundsSetup(setup.id)} style={{ padding: '5px 10px', color: 'var(--alert)' }}>
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--dim)', fontSize: '0.9rem', textAlign: 'center' }}>No saved setups yet.</div>
                    )}
                </div>
            </main>
        )
    }

    // Active View
    const phaseColor = phase === 'work' ? 'var(--blue)' : phase === 'rest' ? 'var(--warn)' : phase === 'prep' ? 'var(--dim)' : 'var(--green)';
    const phaseLabel = phase === 'work' ? 'WORK' : phase === 'rest' ? 'REST' : phase === 'prep' ? 'PREPARE' : 'DONE';

    const roundMin = Math.floor(config.round / 60);
    const roundSec = (config.round % 60).toString().padStart(2, '0');
    const timeToNextInterim = nextInterimTarget > 0 ? Math.ceil(timeRemaining / 1000) - nextInterimTarget : 0;

    return (
        <main className="content">
            <div className={`card ${alertState === 'main' ? 'alert-main' : alertState === 'interim' ? 'alert-interim' : ''}`} style={{ padding: 20, textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--dim)', marginBottom: 20, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <div>Rounds: {config.rounds}</div>
                    <div>Work: {roundMin}:{roundSec}</div>
                    <div>Rest: {config.rest}s</div>
                    <div>Prep: {config.prep}s</div>
                    <div>Interim: {config.interim > 0 ? `${config.interim}s` : 'Off'}</div>
                </div>

                <div className="section-header" style={{ margin: '-20px -20px 20px -20px', color: phaseColor, marginTop: 0 }}>
                    {phaseLabel}
                </div>
                
                <div style={{ fontSize: '1.2rem', color: 'var(--dim)', marginBottom: 10, fontWeight: 'bold' }}>
                    ROUND {currentRound} OF {config.rounds}
                </div>

                <div style={{ fontSize: '5rem', fontFamily: 'Courier New', fontWeight: 800, color: phaseColor, marginBottom: 10, lineHeight: 1 }}>
                    {formatTime(timeRemaining)}
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--dim)', height: 20 }}>
                    {phase === 'work' && config.interim > 0 && nextInterimTarget > 0 ? `Next bell in ${timeToNextInterim}s` : ''}
                </div>

                <div className="actions-bar" style={{ marginTop: 30 }}>
                    {status === 'done' ? (
                        <button className="btn-primary" onClick={reset} style={{ width: '100%', padding: 15 }}>
                            FINISH
                        </button>
                    ) : (
                        <>
                            <button 
                                className="btn-primary" 
                                style={{ background: `rgba(0, 238, 255, 0.1)`, color: 'var(--blue)', borderColor: 'var(--blue)', flex: 1, padding: 15 }} 
                                onClick={status === 'running' ? pause : start}
                            >
                                {status === 'running' ? 'PAUSE' : 'RESUME'}
                            </button>
                            <button className="btn-secondary" onClick={reset} style={{ flex: 1, padding: 15 }}>
                                RESET
                            </button>
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}
