import { useState } from 'react'
import { useDB } from '../db/index.jsx'

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// W15.1 — pure display helper: a compact textual prescription preview derived
// ONLY from the existing config values. It never mutates config; empty-string
// intermediate input states ('' while the user is clearing a field) render as
// 0 rather than NaN. No total-duration metric is computed (prompt §8).
function formatPrescription(config) {
    const asSecs = (v) => (typeof v === 'number' ? v : 0)
    const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
    const parts = [
        `${asSecs(config.rounds)} rounds`,
        `${mmss(asSecs(config.round))} work`,
        `${mmss(asSecs(config.rest))} rest`,
        `${mmss(asSecs(config.prep))} prep`
    ]
    if (asSecs(config.interim) > 0) parts.push(`bell /${asSecs(config.interim)}s`)
    return parts.join(' · ')
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
            <main className="content timer-rounds">
                <section className="timer-module timer-module--config" aria-label="Configure rounds">
                    <header className="timer-module__head">
                        <span className="timer-module__title">⚙️ Configure Rounds</span>
                        <span className="timer-module__state">READY</span>
                    </header>

                    <div className="rounds-fields">
                        <div className="rounds-field">
                            <label htmlFor="rounds-prep">Prep (sec)</label>
                            <input id="rounds-prep" type="number" onFocus={e => e.target.select()} value={config.prep} onChange={e => updateConfig('prep', e.target.value)} />
                        </div>
                        <div className="rounds-field">
                            <label htmlFor="rounds-count">Rounds</label>
                            <input id="rounds-count" type="number" onFocus={e => e.target.select()} value={config.rounds} onChange={e => updateConfig('rounds', e.target.value)} />
                        </div>
                        <div className="rounds-field">
                            <label htmlFor="rounds-round-min">Round (min)</label>
                            <input id="rounds-round-min" type="number" onFocus={e => e.target.select()} value={config.round === '' ? '' : Math.floor(config.round / 60)} onChange={e => updateRoundMin(e.target.value)} />
                        </div>
                        <div className="rounds-field">
                            <label htmlFor="rounds-round-sec">Round (sec)</label>
                            <input id="rounds-round-sec" type="number" onFocus={e => e.target.select()} value={config.round === '' ? '' : config.round % 60} onChange={e => updateRoundSec(e.target.value)} />
                        </div>
                        <div className="rounds-field">
                            <label htmlFor="rounds-rest">Rest (sec)</label>
                            <input id="rounds-rest" type="number" onFocus={e => e.target.select()} value={config.rest} onChange={e => updateConfig('rest', e.target.value)} />
                        </div>
                        <div className="rounds-field rounds-field--wide">
                            <label htmlFor="rounds-interim">Interim Bell Interval (sec, 0 to disable)</label>
                            <input id="rounds-interim" type="number" onFocus={e => e.target.select()} value={config.interim} onChange={e => updateConfig('interim', e.target.value)} />
                        </div>
                    </div>

                    {/* Verify step: the prescription restated as one scannable
                        line before committing to Start. Display-only. */}
                    <p className="rounds-preview">{formatPrescription(config)}</p>

                    <button className="btn-primary timer-btn timer-btn--start" onClick={start}>
                        START WORKOUT
                    </button>
                </section>

                <section className="timer-module timer-module--saved" aria-label="Saved setups">
                    <header className="timer-module__head">
                        <span className="timer-module__title">💾 Saved Setups</span>
                        <span className="timer-module__state">
                            {savedRoundsSetups.length > 0 ? `${savedRoundsSetups.length} SAVED` : 'EMPTY'}
                        </span>
                    </header>
                    <div className="rounds-save">
                        <input
                            type="text"
                            placeholder="Setup Name..."
                            value={setupName}
                            onChange={e => setSetupName(e.target.value)}
                            style={{ width: '100%', padding: '12px 10px', fontSize: '1rem', color: '#ffffff', opacity: 1, WebkitTextFillColor: '#ffffff', caretColor: '#ffffff' }}
                        />
                        <button className="btn-secondary timer-btn" onClick={handleSave}>SAVE</button>
                    </div>

                    {savedRoundsSetups.length > 0 ? (
                        <ul className="rounds-setups">
                            {savedRoundsSetups.map(setup => (
                                <li key={setup.id} className="rounds-setup">
                                    <button className="rounds-setup__load" onClick={() => loadSetup(setup)}>
                                        <strong className="rounds-setup__name">{setup.name}</strong>
                                        <span className="rounds-setup__summary">
                                            {setup.rounds}x {Math.floor(setup.round / 60)}:{String(setup.round % 60).padStart(2, '0')} (Rest: {setup.rest}s)
                                        </span>
                                    </button>
                                    <button className="btn-ghost rounds-setup__delete" onClick={() => deleteRoundsSetup(setup.id)} aria-label={`Delete saved setup ${setup.name}`}>
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="rounds-empty">No saved setups yet.</div>
                    )}
                </section>
            </main>
        )
    }

    // Active View
    // Phase identity is carried by the rounds-active--<phase> modifier
    // (scoped --phase custom property) PLUS the explicit textual phase label
    // below — never colour alone. Phase engine semantics are unchanged.
    const phaseLabel =
        phase === 'work'  ? 'WORK' :
        phase === 'rest'  ? 'REST' :
        phase === 'prep'  ? 'PREPARE' : 'DONE';

    const roundMin = Math.floor(config.round / 60);
    const roundSec = (config.round % 60).toString().padStart(2, '0');
    const timeToNextInterim = nextInterimTarget > 0 ? Math.ceil(timeRemaining / 1000) - nextInterimTarget : 0;

    return (
        <main className="content timer-rounds">
            <section
                className={`timer-module rounds-active rounds-active--${phase}${alertState === 'main' ? ' timer-alert-main' : alertState === 'interim' ? ' timer-alert-interim' : ''}`}
                aria-label="Rounds session"
            >
                {/* Config summary bar */}
                <div className="rounds-active__summary">
                    <span>{config.rounds} rounds</span>
                    <span>Work {roundMin}:{roundSec}</span>
                    <span>Rest {config.rest}s</span>
                    {config.interim > 0 && <span>Bell /{config.interim}s</span>}
                </div>

                {/* Phase + round state: announced politely on change only.
                    The clock below is deliberately OUTSIDE this live region so
                    screen readers never hear every tick. */}
                <div className="rounds-active__status" aria-live="polite">
                    <div className="rounds-active__phase">
                        {phaseLabel}
                    </div>
                    <div className="rounds-active__round">
                        ROUND {currentRound} OF {config.rounds}
                    </div>
                    {status === 'paused' && (
                        <div className="rounds-active__paused">PAUSED</div>
                    )}
                </div>

                {/* Dominant clock */}
                <div className="rounds-active__clock">
                    {formatTime(timeRemaining)}
                </div>

                {/* Interim bell countdown */}
                <div className="rounds-active__interim">
                    {phase === 'work' && config.interim > 0 && nextInterimTarget > 0
                        ? `⚡ BELL IN ${timeToNextInterim}s`
                        : ''}
                </div>

                {/* Action buttons */}
                <div className="actions-bar rounds-active__actions">
                    {status === 'done' ? (
                        <button className="btn-primary timer-btn" onClick={reset}>
                            FINISH
                        </button>
                    ) : (
                        <>
                            <button
                                className="btn-primary timer-btn rounds-active__toggle"
                                onClick={status === 'running' ? pause : start}
                            >
                                {status === 'running' ? 'PAUSE' : 'RESUME'}
                            </button>
                            <button className="btn-secondary timer-btn" onClick={reset}>
                                RESET
                            </button>
                        </>
                    )}
                </div>
            </section>
        </main>
    )
}
