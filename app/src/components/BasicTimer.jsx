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

// Explicit textual state grammar (W15.1): the cue is never colour alone.
// Derived only from existing provider state — no new state, no new logic.
const STATE_TEXT = {
    ready: 'READY',
    running: 'RUNNING',
    paused: 'PAUSED'
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

    // ⋮ affordance in the module head. The class stretches the tap area to
    // the full head height and module edge (sweaty-thumb floor) while
    // staying visually flush; behaviour is unchanged from W15.
    const blockMenuButton = (id) => (
        <button
            className="timer-module__menu"
            aria-label={`Reorder ${BLOCK_LABELS[id]} block`}
            onClick={() => setActionsBlockId(id)}
        >
            ⋮
        </button>
    )

    const renderBlock = (id) => {
        if (id === 'stopwatch') {
            const swState = swRunning ? 'running' : swTime > 0 ? 'paused' : 'ready'
            return (
                <section
                    key={id}
                    className="timer-module timer-module--stopwatch"
                    data-state={swState}
                    aria-label="Stopwatch"
                >
                    <header className="timer-module__head">
                        <span className="timer-module__title">{BLOCK_LABELS.stopwatch}</span>
                        <span className="timer-module__state">{STATE_TEXT[swState]}</span>
                        {blockMenuButton(id)}
                    </header>
                    <div className="timer-module__time">
                        {formatTime(swTime)}
                    </div>
                    <div className="actions-bar">
                        <button className="btn-primary timer-btn timer-btn--stopwatch" onClick={toggleStopwatch}>
                            {swRunning ? 'PAUSE' : 'START'}
                        </button>
                        <button className="btn-secondary timer-btn" onClick={resetStopwatch}>
                            RESET
                        </button>
                    </div>
                </section>
            )
        }

        // id === 'rest'
        const cdState = cdRunning ? 'running' : cdTime > 0 ? 'paused' : 'ready'
        return (
            // W15.1 corrective pass (§5 finding 7): the provider's main alarm
            // fires ONLY on Rest countdown completion, so the one-shot
            // completion signal belongs on the Rest module — never on the
            // Stopwatch. alertState itself is still produced in DBProvider;
            // only its visual target moved.
            <section
                key={id}
                className={`timer-module timer-module--rest${alertState === 'main' ? ' timer-alert-main' : ''}`}
                data-state={cdState}
                aria-label="Rest timer"
            >
                <header className="timer-module__head">
                    <span className="timer-module__title">{BLOCK_LABELS.rest}</span>
                    <span className="timer-module__state">{STATE_TEXT[cdState]}</span>
                    {blockMenuButton(id)}
                </header>

                <div className="timer-module__time">
                    {formatCountdown(cdTime)}
                </div>

                {!cdRunning && cdTime === 0 ? (
                    <div className="timer-presets">
                        <button className="btn-secondary timer-preset" onClick={() => startCountdown(1)}>60s</button>
                        <button className="btn-secondary timer-preset" onClick={() => startCountdown(1.5)}>90s</button>
                        <button className="btn-secondary timer-preset" onClick={() => startCountdown(2)}>2m</button>
                        <button className="btn-secondary timer-preset" onClick={() => startCountdown(3)}>3m</button>
                    </div>
                ) : (
                    <div className="actions-bar timer-module__actions">
                        <button className="btn-primary timer-btn timer-btn--rest" onClick={toggleCountdown}>
                            {cdRunning ? 'PAUSE' : 'RESUME'}
                        </button>
                        <button className="btn-secondary timer-btn" onClick={cancelCountdown}>
                            CANCEL
                        </button>
                    </div>
                )}

                <div className="timer-addtime">
                    <button className="btn-ghost timer-addtime__btn" onClick={() => addCountdownTime(15)}>+15s</button>
                    <button className="btn-ghost timer-addtime__btn" onClick={() => addCountdownTime(30)}>+30s</button>
                </div>
            </section>
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
        <main className="content timer-basic">
            {/* W15 — user-controlled block order, persisted in settings
                (basicTimerBlockOrder). Block id as the React key keeps card
                identity across reorders. Scope truth-up vs the original W15
                prompt: post-W20 the Rounds timer is a separate top tab, not a
                stackable block — only Stopwatch/Rest Timer reorder here. */}
            {basicTimerBlockOrder.map((id) => renderBlock(id))}

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
