import { useState } from 'react'
import { useDB } from '../db/index.jsx'
import BasicTimerBlockActionsSheet from './BasicTimerBlockActionsSheet.jsx'

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

const BLOCK_LABELS = {
    stopwatch: '⏳ Stopwatch',
    rest: '⏱️ Rest Timer'
}

export default function BasicTimer() {
    const {
        swTime, swRunning, toggleStopwatch, resetStopwatch,
        cdTime, cdRunning, startCountdown, toggleCountdown, cancelCountdown, addCountdownTime,
        alertState,
        basicTimerBlockOrder, moveBasicTimerBlock
    } = useDB()

    // Which block's ⋮ sheet is open. Transient sheet state only — same
    // tab-local idiom as Checklist.jsx. The timers themselves tick in
    // DBProvider; nothing here holds timer or user-typed state.
    const [actionsBlockId, setActionsBlockId] = useState(null)

    // ⋮ affordance inside the colored .section-header band. Padding + negative
    // margin stretch the tap area to the full band height and card edge
    // (sweaty-thumb floor) while staying visually flush with the band.
    const blockMenuButton = (id) => (
        <button
            aria-label={`Reorder ${BLOCK_LABELS[id]} block`}
            onClick={() => setActionsBlockId(id)}
            style={{
                marginLeft: 'auto',
                marginRight: -14,
                marginTop: -10,
                marginBottom: -10,
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                color: 'inherit',
                fontSize: '1.1rem',
                fontWeight: 700,
                lineHeight: 1
            }}
        >
            ⋮
        </button>
    )

    const renderBlock = (id, index) => {
        const marginTop = index > 0 ? 20 : 0

        if (id === 'stopwatch') {
            return (
                <div key={id} className={`card ${alertState === 'main' ? 'alert-main' : ''}`} style={{ padding: 20, textAlign: 'center', marginTop }}>
                    <div className="section-header blue" style={{ margin: '-20px -20px 20px -20px' }}>
                        {BLOCK_LABELS.stopwatch}
                        {blockMenuButton(id)}
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
            )
        }

        // id === 'rest'
        return (
            <div key={id} className="card" style={{ padding: 20, textAlign: 'center', marginTop }}>
                <div className="section-header amber" style={{ margin: '-20px -20px 20px -20px' }}>
                    {BLOCK_LABELS.rest}
                    {blockMenuButton(id)}
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
        )
    }

    // The ⋮ sheet derives its target from the LIVE order each render, so
    // Move up/down keeps working across repeated taps while the sheet stays
    // open (same idiom as the checklist group sheet).
    const actionsIdx = basicTimerBlockOrder.indexOf(actionsBlockId)
    const actionsBlock = actionsIdx === -1
        ? null
        : { id: actionsBlockId, label: BLOCK_LABELS[actionsBlockId] }

    return (
        <main className="content">
            {/* W15 — user-controlled block order, persisted in settings
                (basicTimerBlockOrder). Block id as the React key keeps card
                identity across reorders. Scope truth-up vs the original W15
                prompt: post-W20 the Rounds timer is a separate top tab, not a
                stackable block — only Stopwatch/Rest Timer reorder here. */}
            {basicTimerBlockOrder.map((id, i) => renderBlock(id, i))}

            <BasicTimerBlockActionsSheet
                block={actionsBlock}
                isFirst={actionsIdx === 0}
                isLast={actionsIdx === basicTimerBlockOrder.length - 1}
                onClose={() => setActionsBlockId(null)}
                onMove={moveBasicTimerBlock}
            />
        </main>
    )
}
