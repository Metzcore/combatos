/**
 * TodayExerciseReferenceLink.test.jsx
 *
 * Pins the A11 Today "DEMO" direct-open control: render predicate
 * (known / absent / unknown / malformed references, substitution hiding),
 * external-link contract (href, target, rel), accessible label, and the
 * no-media guarantee. Rendered via react-dom/server — the component is
 * stateless and pure, so static markup fully determines its output. No
 * browser navigation is exercised.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TodayExerciseReferenceLink from './TodayExerciseReferenceLink.jsx'
import PerformedHoldItem from './PerformedHoldItem.jsx'
import PerformedConditioningItem from './PerformedConditioningItem.jsx'
import { StrengthItemHeader, buildStrengthItemView } from './PerformedStrengthItem.jsx'
import { EXERCISE_BY_ID } from '../../data/exerciseCatalogue.js'

// Real seeded entry: dead-bug → NASM video resource.
const KNOWN_ID = 'dead-bug'
const KNOWN_URL = 'https://www.nasm.org/resource-center/exercise-library/dead-bug'

/** Test-only malformed entries injected into the resolver's Map per test. */
const INJECTED_IDS = []

function injectEntry(exerciseId, entry) {
    EXERCISE_BY_ID.set(exerciseId, entry)
    INJECTED_IDS.push(exerciseId)
}

afterEach(() => {
    while (INJECTED_IDS.length > 0) EXERCISE_BY_ID.delete(INJECTED_IDS.pop())
})

describe('TodayExerciseReferenceLink — render predicate', () => {
    it('renders exactly one compact external anchor for a known exerciseId', () => {
        const html = renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId={KNOWN_ID} />)
        expect(html).toContain('today-exercise-ref')
        expect((html.match(/<a /g) || []).length).toBe(1)
    })

    it.each([undefined, null, ''])('renders nothing for absent exerciseId %s', (exerciseId) => {
        expect(renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId={exerciseId} />)).toBe('')
    })

    it('renders nothing for an unknown exerciseId', () => {
        expect(renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId="no-such-exercise" />)).toBe('')
    })

    it('renders nothing for an entry without resources', () => {
        injectEntry('malformed-no-resources', { exerciseId: 'malformed-no-resources', name: 'Broken' })
        expect(renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId="malformed-no-resources" />)).toBe('')
    })

    it('renders nothing for a resource without a url', () => {
        injectEntry('malformed-no-url', {
            exerciseId: 'malformed-no-url',
            name: 'Broken',
            resources: [{ type: 'video', provider: 'ExampleProvider', label: 'Watch demo' }]
        })
        expect(renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId="malformed-no-url" />)).toBe('')
    })

    it('renders nothing for a resource without a provider', () => {
        injectEntry('malformed-no-provider', {
            exerciseId: 'malformed-no-provider',
            name: 'Broken',
            resources: [{ type: 'video', label: 'Watch demo', url: 'https://example.com/demo' }]
        })
        expect(renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId="malformed-no-provider" />)).toBe('')
    })
})

describe('TodayExerciseReferenceLink — substitution safety', () => {
    it('hides an otherwise-valid prescribed reference when substitutedName is truthy', () => {
        const html = renderToStaticMarkup(
            <TodayExerciseReferenceLink exerciseId={KNOWN_ID} substitutedName="Goblet Squat" />
        )
        expect(html).toBe('')
    })

    it.each([undefined, null, ''])('permits the prescribed reference when substitutedName is %s', (substitutedName) => {
        const html = renderToStaticMarkup(
            <TodayExerciseReferenceLink exerciseId={KNOWN_ID} substitutedName={substitutedName} />
        )
        expect(html).toContain('today-exercise-ref')
    })
})

describe('TodayExerciseReferenceLink — control contract', () => {
    const html = renderToStaticMarkup(<TodayExerciseReferenceLink exerciseId={KNOWN_ID} />)

    it('renders a semantic anchor, not a button', () => {
        expect(html).toMatch(/^<a /)
        expect(html).not.toContain('<button')
    })

    it('uses the fixed visible wording "DEMO"', () => {
        expect(html).toContain('DEMO')
    })

    it('renders the play and external-link glyphs, hidden from screen readers', () => {
        expect(html).toContain('▶')
        expect(html).toContain('↗')
        expect(html).toContain('aria-hidden="true"')
    })

    it('links to the first resource url', () => {
        expect(html).toContain(`href="${KNOWN_URL}"`)
    })

    it('opens in a new tab', () => {
        expect(html).toContain('target="_blank"')
    })

    it('sets rel with both noopener and noreferrer', () => {
        const rel = html.match(/rel="([^"]*)"/)
        expect(rel).not.toBeNull()
        expect(rel[1]).toContain('noopener')
        expect(rel[1]).toContain('noreferrer')
    })

    it('labels the link with exercise name, provider, and external-site meaning', () => {
        const label = html.match(/aria-label="([^"]*)"/)
        expect(label).not.toBeNull()
        expect(label[1]).toContain('Dead Bug')
        expect(label[1]).toContain('NASM')
        expect(label[1]).toContain('opens external site')
    })

    it('introduces no iframe, video, image, or fetch mechanism', () => {
        expect(html).not.toMatch(/<iframe|<video|<img|<picture|<source/i)
        expect(html).not.toContain('fetch(')
    })
})

/** Counts occurrences of the compact link's own class attribute — the
 *  precise "at most one video affordance per exercise header" assertion,
 *  independent of any other `<a>` a renderer might otherwise contain. */
function countReferenceAnchors(html) {
    return (html.match(/class="today-exercise-ref"/g) || []).length
}

describe('TodayExerciseReferenceLink — renderer integration', () => {
    const noop = () => {}

    it('PerformedHoldItem renders exactly one reference for a referenced prescribed item', () => {
        const item = { id: 'hold-1', name: 'Dead Bug', exerciseId: KNOWN_ID, dose: '3x10' }
        const html = renderToStaticMarkup(
            <PerformedHoldItem item={item} substitutedName={undefined} onSubstitute={noop} note="" onNoteChange={noop} />
        )
        expect(countReferenceAnchors(html)).toBe(1)
        expect(html).toContain(`href="${KNOWN_URL}"`)
    })

    it('PerformedHoldItem renders no reference once the item is substituted', () => {
        const item = { id: 'hold-1', name: 'Dead Bug', exerciseId: KNOWN_ID, dose: '3x10' }
        const html = renderToStaticMarkup(
            <PerformedHoldItem item={item} substitutedName="Bird Dog" onSubstitute={noop} note="" onNoteChange={noop} />
        )
        expect(countReferenceAnchors(html)).toBe(0)
    })

    it('PerformedConditioningItem renders exactly one reference for a referenced prescribed item', () => {
        const item = { id: 'cond-1', name: 'Dead Bug', exerciseId: KNOWN_ID, rounds: 3 }
        const html = renderToStaticMarkup(
            <PerformedConditioningItem item={item} substitutedName={undefined} onSubstitute={noop} note="" onNoteChange={noop} />
        )
        expect(countReferenceAnchors(html)).toBe(1)
        expect(html).toContain(`href="${KNOWN_URL}"`)
    })

    it('PerformedConditioningItem renders no reference once the item is substituted', () => {
        const item = { id: 'cond-1', name: 'Dead Bug', exerciseId: KNOWN_ID, rounds: 3 }
        const html = renderToStaticMarkup(
            <PerformedConditioningItem item={item} substitutedName="Bike Sprints" onSubstitute={noop} note="" onNoteChange={noop} />
        )
        expect(countReferenceAnchors(html)).toBe(0)
    })

    it('the shared StrengthItemHeader renders exactly one reference alongside a superset member label', () => {
        const item = { id: 'strength-1', name: 'Dead Bug', exerciseId: KNOWN_ID, sets: 3, reps: 10, prescription: {} }
        const view = buildStrengthItemView(item, undefined, undefined, null)
        const html = renderToStaticMarkup(
            <StrengthItemHeader item={item} view={view} memberLabel="A1" onUseLastValues={noop} substitutedName={undefined} />
        )
        expect(countReferenceAnchors(html)).toBe(1)
        expect(html).toContain(`href="${KNOWN_URL}"`)
        expect(html).toContain('A1')
    })

    it('the shared StrengthItemHeader renders no reference once its member is substituted', () => {
        const item = { id: 'strength-1', name: 'Dead Bug', exerciseId: KNOWN_ID, sets: 3, reps: 10, prescription: {} }
        const substitutedName = 'Plank'
        const view = buildStrengthItemView(item, undefined, substitutedName, null)
        const html = renderToStaticMarkup(
            <StrengthItemHeader item={item} view={view} memberLabel="A1" onUseLastValues={noop} substitutedName={substitutedName} />
        )
        expect(countReferenceAnchors(html)).toBe(0)
        expect(html).toContain('A1')
    })
})
