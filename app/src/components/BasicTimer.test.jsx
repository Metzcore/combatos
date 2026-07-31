/**
 * BasicTimer.test.jsx (W15.1)
 *
 * Pins the Timer hub Basic tab's markup/wiring contract after the
 * Instrument Strata pass:
 * - provider-supplied W15 block order is respected;
 * - the Rest module — and ONLY the Rest module — receives the one-shot
 *   timer-alert-main class during alertState === 'main' (the §5 finding-7
 *   correction: the main alarm is Rest completion, so the Stopwatch must
 *   never falsely illuminate);
 * - idle Rest renders exactly the four existing presets; active/paused Rest
 *   renders the existing pause/resume/cancel + add-time paths;
 * - the ⋮ reorder affordance and the Move up/down BottomSheet wiring remain;
 * - running/paused/ready state is exposed as TEXT, never colour alone.
 *
 * Rendered via react-dom/server against a narrow useDB mock matching the
 * existing DBProvider contract (same idiom as ExerciseReferenceLink.test.jsx).
 * No timer-engine logic is mocked or exercised.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

let mockDB
vi.mock('../db/index.jsx', () => ({
    useDB: () => mockDB
}))

import BasicTimer from './BasicTimer.jsx'
import BasicTimerBlockActionsSheet from './BasicTimerBlockActionsSheet.jsx'

const baseDB = (overrides = {}) => ({
    swTime: 0,
    swRunning: false,
    toggleStopwatch: () => {},
    resetStopwatch: () => {},
    cdTime: 0,
    cdRunning: false,
    startCountdown: () => {},
    toggleCountdown: () => {},
    cancelCountdown: () => {},
    addCountdownTime: () => {},
    alertState: 'none',
    basicTimerBlockOrder: ['stopwatch', 'rest'],
    moveBasicTimerBlock: () => {},
    ...overrides
})

beforeEach(() => {
    mockDB = baseDB()
})

describe('BasicTimer — W15 block order', () => {
    it('renders stopwatch first, rest second in the default order', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html.indexOf('aria-label="Stopwatch"')).toBeLessThan(html.indexOf('aria-label="Rest timer"'))
    })

    it('respects a user-flipped provider order (rest first)', () => {
        mockDB = baseDB({ basicTimerBlockOrder: ['rest', 'stopwatch'] })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html.indexOf('aria-label="Rest timer"')).toBeLessThan(html.indexOf('aria-label="Stopwatch"'))
    })
})

describe('BasicTimer — Rest completion alert target (§5 finding 7)', () => {
    it('applies timer-alert-main to the REST module when alertState is main', () => {
        mockDB = baseDB({ alertState: 'main' })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('class="timer-module timer-module--rest timer-alert-main"')
    })

    it('never applies the Rest completion alert to the Stopwatch module', () => {
        mockDB = baseDB({ alertState: 'main' })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('class="timer-module timer-module--stopwatch"')
        expect(html).not.toMatch(/timer-module--stopwatch[^"]*timer-alert/)
    })

    it('applies no alert class while alertState is none', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).not.toContain('timer-alert-main')
        expect(html).not.toContain('timer-alert-interim')
    })
})

describe('BasicTimer — Rest module controls', () => {
    it('idle Rest renders exactly the four existing presets', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('>60s<')
        expect(html).toContain('>90s<')
        expect(html).toContain('>2m<')
        expect(html).toContain('>3m<')
        expect((html.match(/class="btn-secondary timer-preset"/g) || []).length).toBe(4)
    })

    it('idle Rest still offers the existing +15s/+30s add-time paths', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('>+15s<')
        expect(html).toContain('>+30s<')
    })

    it('running Rest renders PAUSE/CANCEL and add-time, not presets', () => {
        mockDB = baseDB({ cdTime: 90, cdRunning: true })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('>PAUSE<')
        expect(html).toContain('>CANCEL<')
        expect(html).toContain('>+15s<')
        expect(html).toContain('>+30s<')
        expect(html).not.toContain('timer-preset')
        expect(html).toContain('>01:30<')
    })

    it('paused Rest renders RESUME/CANCEL', () => {
        mockDB = baseDB({ cdTime: 45, cdRunning: false })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('>RESUME<')
        expect(html).toContain('>CANCEL<')
        expect(html).toContain('>00:45<')
    })
})

describe('BasicTimer — stopwatch controls', () => {
    it('idle stopwatch renders START and RESET', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('>START<')
        expect(html).toContain('>RESET<')
        expect(html).toContain('>00:00.00<')
    })

    it('running stopwatch renders PAUSE', () => {
        mockDB = baseDB({ swTime: 61234, swRunning: true })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('>PAUSE<')
        expect(html).toContain('>01:01.23<')
    })
})

describe('BasicTimer — textual state grammar (never colour alone)', () => {
    it('exposes READY for idle modules', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect((html.match(/>READY</g) || []).length).toBe(2)
    })

    it('exposes RUNNING and PAUSED as text', () => {
        mockDB = baseDB({ swRunning: true, cdTime: 45, cdRunning: false })
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('data-state="running"')
        expect(html).toContain('>RUNNING<')
        expect(html).toContain('data-state="paused"')
        expect(html).toContain('>PAUSED<')
    })
})

describe('BasicTimer — reorder affordance and sheet wiring', () => {
    it('renders a ⋮ reorder button per block with its accessible label', () => {
        const html = renderToStaticMarkup(<BasicTimer />)
        expect(html).toContain('aria-label="Reorder ⏳ Stopwatch block"')
        expect(html).toContain('aria-label="Reorder ⏱️ Rest Timer block"')
        expect((html.match(/timer-module__menu/g) || []).length).toBe(2)
    })

    it('sheet renders Move up / Move down for a middle-positioned block', () => {
        const html = renderToStaticMarkup(
            <BasicTimerBlockActionsSheet
                block={{ id: 'rest', label: '⏱️ Rest Timer' }}
                isFirst={false}
                isLast={false}
                onClose={() => {}}
                onMove={() => {}}
            />
        )
        expect(html).toContain('⏱️ Rest Timer')
        expect(html).toContain('↑ Move up')
        expect(html).toContain('↓ Move down')
        expect(html).not.toContain('disabled')
    })

    it('sheet disables Move up for the first block and Move down for the last', () => {
        const first = renderToStaticMarkup(
            <BasicTimerBlockActionsSheet
                block={{ id: 'stopwatch', label: '⏳ Stopwatch' }}
                isFirst={true}
                isLast={false}
                onClose={() => {}}
                onMove={() => {}}
            />
        )
        expect(first).toMatch(/disabled=""[^>]*>↑ Move up/)
        expect(first).not.toMatch(/disabled=""[^>]*>↓ Move down/)

        const last = renderToStaticMarkup(
            <BasicTimerBlockActionsSheet
                block={{ id: 'rest', label: '⏱️ Rest Timer' }}
                isFirst={false}
                isLast={true}
                onClose={() => {}}
                onMove={() => {}}
            />
        )
        expect(last).toMatch(/disabled=""[^>]*>↓ Move down/)
    })
})
