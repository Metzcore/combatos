/**
 * TodayHeader.test.jsx — A11 Today premium UX/UI experiment.
 *
 * Pins the presentational additions to the persistent Today header: the
 * canonical progress rail and the save-state dot. Both are pure
 * presentation derived from values the header ALREADY computed/received
 * (done/units from itemCompleteness; saveLabel/saveStatusKind from
 * mapSaveStatusToLabel's caller) — these tests assert that derivation and
 * the non-colour-only contract, never CSS appearance. Rendered via
 * react-dom/server, matching this repo's render-test convention
 * (TodayExerciseReferenceLink.test.jsx).
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TodayHeader from './TodayHeader.jsx'

const noop = () => {}

/** One strength block, one item with `sets` prescribed units. */
function makeDay(sets) {
    return {
        label: 'Day 1 — Legs, Glutes & Deep Core',
        blocks: [
            { kind: 'strength', label: 'Strength', items: [{ id: 'sq', name: 'Back Squat', sets }] },
        ],
    }
}

/** performed map with `filled` filled sets for item 'sq' (kg counts as filled). */
function makeState(filled) {
    return { sq: { sets: Array.from({ length: filled }, () => ({ kg: 100 })) } }
}

describe('TodayHeader — canonical progress rail', () => {
    it('renders the rail with a width derived from the same done/units as the text', () => {
        const html = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={makeState(1)} saveLabel={null} saveStatusKind="idle" onRetry={noop} />
        )
        expect(html).toContain('1/4 sets')
        expect(html).toContain('today-header__rail')
        expect(html).toContain('width:25%')
    })

    it('marks the rail complete only when the canonical count is genuinely complete', () => {
        const incomplete = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={makeState(3)} saveLabel={null} saveStatusKind="idle" onRetry={noop} />
        )
        expect(incomplete).toContain('width:75%')
        expect(incomplete).not.toContain('today-header__rail--complete')

        const complete = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={makeState(4)} saveLabel={null} saveStatusKind="idle" onRetry={noop} />
        )
        expect(complete).toContain('width:100%')
        expect(complete).toContain('today-header__rail--complete')
    })

    it('renders no rail (and no progress text) when the day has no completable units', () => {
        const day = { label: 'Day 2 — Fight Gym', blocks: [{ kind: 'mobility', items: [{ id: 'm1', name: 'Couch Stretch' }] }] }
        const html = renderToStaticMarkup(
            <TodayHeader day={day} itemStateById={{}} saveLabel={null} saveStatusKind="idle" onRetry={noop} />
        )
        expect(html).not.toContain('today-header__rail')
        expect(html).not.toContain(' sets')
    })

    it('hides the decorative rail from screen readers — the "N/M sets" text already states it', () => {
        const html = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={makeState(2)} saveLabel={null} saveStatusKind="idle" onRetry={noop} />
        )
        const rail = html.match(/<div class="today-header__rail[^"]*"[^>]*>/)
        expect(rail).not.toBeNull()
        expect(rail[0]).toContain('aria-hidden="true"')
    })
})

describe('TodayHeader — save-state presentation', () => {
    it('renders the decorative dot with the status-kind class alongside the label', () => {
        const html = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={{}} saveLabel="Saved on device ✓" saveStatusKind="idle" onRetry={noop} />
        )
        expect(html).toContain('today-header__save-dot--idle')
        expect(html).toContain('Saved on device ✓')
    })

    it('keeps the dot aria-hidden so state is never colour-only', () => {
        const html = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={{}} saveLabel="Saving…" saveStatusKind="saving" onRetry={noop} />
        )
        const dot = html.match(/<span class="today-header__save-dot[^"]*"[^>]*>/)
        expect(dot).not.toBeNull()
        expect(dot[0]).toContain('aria-hidden="true"')
    })

    it('still renders the Retry button on error and no badge at all when saveLabel is null', () => {
        const error = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={{}} saveLabel="Not saved — Retry" saveStatusKind="error" onRetry={noop} />
        )
        expect(error).toContain('today-header__retry')
        expect(error).toContain('today-header__save-dot--error')

        const neutral = renderToStaticMarkup(
            <TodayHeader day={makeDay(4)} itemStateById={{}} saveLabel={null} saveStatusKind="idle" onRetry={noop} />
        )
        expect(neutral).not.toContain('today-header__save-status')
        expect(neutral).not.toContain('today-header__save-dot')
    })
})
