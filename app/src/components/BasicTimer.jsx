import { useDB } from '../db/index.jsx'

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    const msParts = Math.floor((ms % 1000) / 10)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${msParts.toString().padStart(2, '0')}`
}

function formatCountdown(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function BasicTimer() {
    const {
        swTime, swRunning, toggleStopwatch, resetStopwatch,
        cdTime, cdRunning, startCountdown, toggleCountdown, cancelCountdown, addCountdownTime,
        alertState
    } = useDB()

    return (
        <main className="content">
            <div className={`card ${alertState === 'main' ? 'alert-main' : ''}`} style={{ padding: 20, textAlign: 'center' }}>
                <div className="section-header blue" style={{ margin: '-20px -20px 20px -20px' }}>
                    ⏳ Stopwatch
                </div>
                <div style={{ fontSize: '3rem', fontFamily: 'Courier New', fontWeight: 800, color: 'var(--blue)', marginBottom: 20 }}>
                    {formatTime(swTime)}
                </div>
                <div className="actions-bar">
                    <button className="btn-primary" style={{ background: 'rgba(0, 238, 255, 0.1)', color: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={toggleStopwatch}>
                        {swRunning ? 'PAUSE' : 'START'}
                    </button>
                    <button className="btn-secondary" onClick={resetStopwatch}>
                        RESET
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 20, textAlign: 'center', marginTop: 20 }}>
                <div className="section-header amber" style={{ margin: '-20px -20px 20px -20px' }}>
                    ⏱️ Rest Timer
                </div>

                <div style={{ fontSize: '4rem', fontFamily: 'Courier New', fontWeight: 800, color: cdTime === 0 ? 'var(--dim)' : 'var(--warn)', marginBottom: 20 }}>
                    {formatCountdown(cdTime)}
                </div>

                {!cdRunning && cdTime === 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                        <button className="btn-secondary" onClick={() => startCountdown(1)}>60s</button>
                        <button className="btn-secondary" onClick={() => startCountdown(1.5)}>90s</button>
                        <button className="btn-secondary" onClick={() => startCountdown(2)}>2m</button>
                        <button className="btn-secondary" onClick={() => startCountdown(3)}>3m</button>
                    </div>
                ) : (
                    <div className="actions-bar" style={{ marginBottom: 20 }}>
                        <button className="btn-primary" style={{ background: 'rgba(255, 170, 0, 0.1)', color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={toggleCountdown}>
                            {cdRunning ? 'PAUSE' : 'RESUME'}
                        </button>
                        <button className="btn-secondary" onClick={cancelCountdown}>
                            CANCEL
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button className="btn-ghost" onClick={() => addCountdownTime(15)}>+15s</button>
                    <button className="btn-ghost" onClick={() => addCountdownTime(30)}>+30s</button>
                </div>
            </div>
        </main>
    )
}
