/**
 * ResetCountdown.jsx — live "RESETS IN HH:MM:SS" countdown (W22)
 *
 * The 1-second tick is LOCAL state in this leaf component, so each tick
 * re-renders only this button — never the group list. The interval is
 * cleared in the effect cleanup; the [resetTime] dependency tears down and
 * restarts it when the reset time changes (no stacked intervals), and
 * AppShell fully unmounts the Checklist hub on hub switch, which fires the
 * cleanup too. Tapping opens the reset-time edit sheet (parent-owned).
 */
import { useState, useEffect } from 'react'
import { msUntilNextReset } from '../../utils/checklistDate.js'

function formatMs(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000))
    const pad = n => String(n).padStart(2, '0')
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function ResetCountdown({ resetTime, onTap }) {
    const [remainingMs, setRemainingMs] = useState(() => msUntilNextReset(new Date(), resetTime))

    useEffect(() => {
        const tick = () => setRemainingMs(msUntilNextReset(new Date(), resetTime))
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [resetTime])

    return (
        <button
            className="reset-countdown"
            onClick={onTap}
            aria-label={`Resets in ${formatMs(remainingMs)}. Tap to edit reset time.`}
        >
            <span className="reset-countdown__label">Resets in</span>
            <span className="reset-countdown__time">{formatMs(remainingMs)}</span>
        </button>
    )
}
