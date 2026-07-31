/**
 * RoundsTimer.test.jsx (W15.1)
 *
 * Pins the Timer hub Custom Rounds markup/wiring contract after the
 * Instrument Strata pass:
 * - idle configuration retains every existing field, label, value, and the
 *   Start action;
 * - the derived prescription preview reflects existing config values
 *   (including empty-string intermediate input states) without mutating them;
 * - saved-setup empty and populated states keep their existing hooks;
 * - the active surface exposes textual phase + round state and one dominant
 *   clock (phase meaning is text, never colour alone), with PAUSED as text;
 * - the timer-alert-main / timer-alert-interim hooks remain on the active
 *   surface, driven only by the existing provider alertState.
 *
 * Rendered via react-dom/server against a narrow useDB mock matching the
 * existing DBProvider contract. The roundsTimer engine object is replaced by
 * a plain data double — no engine logic is exercised or altered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

let mockDB
vi.mock('../db/index.jsx', () => ({
    useDB: () => mockDB
}))

import RoundsTimer from './RoundsTimer.jsx'

const makeRoundsTimer = (overrides = {}) => ({
    config: { prep: 10, round: 180, rest: 60, rounds: 3, interim: 30 },
    setConfig: () => {},
    status: 'idle',
    phase: 'prep',
    currentRound: 1,
    timeRemaining: 10000,
    nextInterimTarget: 0,
    start: () => {},
    pause: () => {},
    reset: () => {},
    loadSetup: () => {},
    ...overrides
})

const baseDB = (rtOverrides = {}, overrides = {}) => ({
    roundsTimer: makeRoundsTimer(rtOverrides),
    savedRoundsSetups: [],
    saveRoundsSetup: () => {},
    deleteRoundsSetup: () => {},
    alertState: 'none',
    ...overrides
})

const SETUP = { id: 1, name: 'Shadowboxing A', prep: 10, round: 180, rest: 60, rounds: 3, interim: 30 }

beforeEach(() => {
    mockDB = baseDB()
})

describe('RoundsTimer — idle configuration', () => {
    it('retains every existing field label and the Start action', () => {
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('Prep (sec)')
        expect(html).toContain('Rounds')
        expect(html).toContain('Round (min)')
        expect(html).toContain('Round (sec)')
        expect(html).toContain('Rest (sec)')
        expect(html).toContain('Interim Bell Interval (sec, 0 to disable)')
        expect(html).toContain('START WORKOUT')
    })

    it('retains every existing config value in six numeric inputs', () => {
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect((html.match(/type="number"/g) || []).length).toBe(6)
        expect(html).toContain('id="rounds-prep" type="number" value="10"')
        expect(html).toContain('id="rounds-count" type="number" value="3"')
        expect(html).toContain('id="rounds-round-min" type="number" value="3"')
        expect(html).toContain('id="rounds-round-sec" type="number" value="0"')
        expect(html).toContain('id="rounds-rest" type="number" value="60"')
        expect(html).toContain('id="rounds-interim" type="number" value="30"')
    })

    it('associates every label with its input', () => {
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('for="rounds-prep"')
        expect(html).toContain('for="rounds-count"')
        expect(html).toContain('for="rounds-round-min"')
        expect(html).toContain('for="rounds-round-sec"')
        expect(html).toContain('for="rounds-rest"')
        expect(html).toContain('for="rounds-interim"')
    })
})

describe('RoundsTimer — prescription preview (display-only)', () => {
    it('restates the existing config values as one scannable line', () => {
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('3 rounds · 3:00 work · 1:00 rest · 0:10 prep · bell /30s')
    })

    it('omits the bell segment when interim is disabled (0)', () => {
        mockDB = baseDB({ config: { prep: 10, round: 180, rest: 60, rounds: 3, interim: 0 } })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('3 rounds · 3:00 work · 1:00 rest · 0:10 prep')
        expect(html).not.toContain('bell /')
    })

    it('renders empty-string intermediate input states as 0, never NaN', () => {
        mockDB = baseDB({ config: { prep: '', round: '', rest: '', rounds: '', interim: '' } })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('0 rounds · 0:00 work · 0:00 rest · 0:00 prep')
        expect(html).not.toContain('NaN')
    })
})

describe('RoundsTimer — saved setups', () => {
    it('keeps the truthful empty state and save path', () => {
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('No saved setups yet.')
        expect(html).toContain('placeholder="Setup Name..."')
        expect(html).toContain('>SAVE<')
        expect(html).toContain('>EMPTY<')
    })

    it('renders a populated setup as a loadable routine with delete hook', () => {
        mockDB = baseDB({}, { savedRoundsSetups: [SETUP] })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('Shadowboxing A')
        expect(html).toContain('3x 3:00 (Rest: 60s)')
        expect(html).toContain('aria-label="Delete saved setup Shadowboxing A"')
        expect(html).toContain('>1 SAVED<')
        expect(html).not.toContain('No saved setups yet.')
    })
})

describe('RoundsTimer — active execution surface', () => {
    const ACTIVE = {
        status: 'running',
        phase: 'work',
        currentRound: 2,
        timeRemaining: 125000,
        nextInterimTarget: 120
    }

    it('exposes textual phase, round state, and the dominant clock', () => {
        mockDB = baseDB(ACTIVE)
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('>WORK<')
        expect(html).toContain('ROUND 2 OF 3')
        expect(html).toContain('>02:05<')
        expect(html).toContain('rounds-active--work')
    })

    it('keeps the existing config summary and interim-bell information', () => {
        mockDB = baseDB(ACTIVE)
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('3 rounds')
        expect(html).toContain('Work 3:00')
        expect(html).toContain('Rest 60s')
        expect(html).toContain('Bell /30s')
        expect(html).toContain('⚡ BELL IN 5s')
    })

    it('announces phase/round through one polite live region, never the clock', () => {
        mockDB = baseDB(ACTIVE)
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect((html.match(/aria-live="polite"/g) || []).length).toBe(1)
        // The clock sits OUTSIDE the live region so ticks are never announced.
        const liveIdx = html.indexOf('aria-live="polite"')
        const clockIdx = html.indexOf('rounds-active__clock')
        expect(liveIdx).toBeGreaterThan(-1)
        expect(clockIdx).toBeGreaterThan(liveIdx)
    })

    it('keeps the main alert hook on the active surface', () => {
        mockDB = baseDB(ACTIVE, { alertState: 'main' })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('rounds-active--work timer-alert-main')
    })

    it('keeps the interim alert hook on the active surface', () => {
        mockDB = baseDB(ACTIVE, { alertState: 'interim' })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('rounds-active--work timer-alert-interim')
    })

    it('renders REST and PREPARE phases as text with their modifiers', () => {
        mockDB = baseDB({ ...ACTIVE, phase: 'rest' })
        expect(renderToStaticMarkup(<RoundsTimer />)).toContain('>REST<')
        mockDB = baseDB({ ...ACTIVE, phase: 'rest' })
        expect(renderToStaticMarkup(<RoundsTimer />)).toContain('rounds-active--rest')
        mockDB = baseDB({ status: 'running', phase: 'prep', currentRound: 1, timeRemaining: 8000, nextInterimTarget: 0 })
        const prep = renderToStaticMarkup(<RoundsTimer />)
        expect(prep).toContain('>PREPARE<')
        expect(prep).toContain('rounds-active--prep')
    })

    it('exposes PAUSED as text and offers RESUME/RESET', () => {
        mockDB = baseDB({ ...ACTIVE, status: 'paused' })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('>PAUSED<')
        expect(html).toContain('>RESUME<')
        expect(html).toContain('>RESET<')
    })

    it('running surface offers PAUSE/RESET', () => {
        mockDB = baseDB(ACTIVE)
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('>PAUSE<')
        expect(html).toContain('>RESET<')
    })

    it('done state reads DONE and offers FINISH', () => {
        mockDB = baseDB({ status: 'done', phase: 'done', currentRound: 3, timeRemaining: 0, nextInterimTarget: 0 })
        const html = renderToStaticMarkup(<RoundsTimer />)
        expect(html).toContain('>DONE<')
        expect(html).toContain('>FINISH<')
        expect(html).toContain('rounds-active--done')
        expect(html).toContain('>00:00<')
    })
})
