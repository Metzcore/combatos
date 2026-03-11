import { useState, useEffect, useRef, useCallback } from 'react'

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

export default function Timer() {
    // ── Screen WakeLock ──
    const wakeLockRef = useRef(null)
    const requestWakeLock = async () => {
        try {
            if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock) {
                wakeLockRef.current = await navigator.wakeLock.request('screen')
            }
        } catch (err) {
            console.warn('WakeLock rejected or not supported:', err)
        }
    }
    const releaseWakeLock = () => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(console.warn)
            wakeLockRef.current = null
        }
    }

    // ── Audio & Flash State ──
    const audioRef = useRef(null)
    const [isFlashing, setIsFlashing] = useState(false)

    useEffect(() => {
        // Preload the boxing bell sound
        audioRef.current = new Audio('/bell.mp3')
        return () => releaseWakeLock()
    }, [])

    const triggerAlarm = useCallback(() => {
        // 1. Play Audio (force restart if already playing)
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
        }

        // 2. Vibrate (Long, Short, Long)
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([500, 200, 500])
            }
        } catch (e) {
            console.warn('Vibration not supported', e)
        }

        // 3. Screen Flash
        setIsFlashing(true)
        setTimeout(() => setIsFlashing(false), 2000) // Flash for 2 seconds
    }, [])

    // Stopwatch state
    const [swTime, setSwTime] = useState(0)
    const [swRunning, setSwRunning] = useState(false)
    const swInterval = useRef(null)

    useEffect(() => {
        let start = 0;
        if (swRunning) {
            requestWakeLock()
            start = Date.now() - swTime
            swInterval.current = setInterval(() => {
                setSwTime(Date.now() - start)
            }, 10)
        } else {
            clearInterval(swInterval.current)
            if (!cdRunning) releaseWakeLock()
        }
        return () => clearInterval(swInterval.current)
    }, [swRunning, cdRunning])

    // Countdown state
    const [cdTime, setCdTime] = useState(0) // time left in seconds
    const [cdRunning, setCdRunning] = useState(false)
    const cdInterval = useRef(null)

    useEffect(() => {
        if (cdRunning && cdTime > 0) {
            requestWakeLock()
            cdInterval.current = setInterval(() => {
                setCdTime(prev => {
                    if (prev <= 1) {
                        setCdRunning(false)
                        triggerAlarm()
                        if (!swRunning) releaseWakeLock()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else {
            clearInterval(cdInterval.current)
            if (!cdRunning && !swRunning) releaseWakeLock()
        }
        return () => clearInterval(cdInterval.current)
    }, [cdRunning, cdTime, triggerAlarm, swRunning])

    const startCountdown = (minutes) => {
        setCdTime(minutes * 60)
        setCdRunning(true)
    }

    const addTime = (seconds) => {
        setCdTime(prev => prev + seconds)
    }

    return (
        <div className="app" style={isFlashing ? { backgroundColor: 'var(--alert)', transition: 'background-color 0.1s ease-in-out' } : { transition: 'background-color 1s ease-out' }}>
            <header className="page-header">
                <h1>⏱️ Timer</h1>
                <div className="subtitle">Stopwatch & Rest intervals</div>
            </header>

            <main className="content">
                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                    <div className="section-header blue" style={{ margin: '-20px -20px 20px -20px' }}>
                        ⏳ Stopwatch
                    </div>
                    <div style={{ fontSize: '3rem', fontFamily: 'Courier New', fontWeight: 800, color: 'var(--blue)', marginBottom: 20 }}>
                        {formatTime(swTime)}
                    </div>
                    <div className="actions-bar">
                        <button className="btn-primary" style={{ background: 'rgba(0, 238, 255, 0.1)', color: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={() => setSwRunning(!swRunning)}>
                            {swRunning ? 'PAUSE' : 'START'}
                        </button>
                        <button className="btn-secondary" onClick={() => { setSwRunning(false); setSwTime(0) }}>
                            RESET
                        </button>
                    </div>
                </div>

                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
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
                            <button className="btn-primary" style={{ background: 'rgba(255, 170, 0, 0.1)', color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => setCdRunning(!cdRunning)}>
                                {cdRunning ? 'PAUSE' : 'RESUME'}
                            </button>
                            <button className="btn-secondary" onClick={() => { setCdRunning(false); setCdTime(0) }}>
                                CANCEL
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button className="btn-ghost" onClick={() => addTime(15)}>+15s</button>
                        <button className="btn-ghost" onClick={() => addTime(30)}>+30s</button>
                    </div>
                </div>
            </main>
        </div>
    )
}
