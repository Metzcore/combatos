/**
 * ExerciseReferenceLink.test.jsx
 *
 * Pins the A11 "WATCH DEMO" direct-open control: render predicate
 * (known / absent / unknown / malformed references), fixed wording,
 * external-link contract (href, target, rel), accessible label, and the
 * no-media guarantee. Rendered via react-dom/server — the component is
 * stateless and pure, so static markup fully determines its output. No
 * browser navigation is exercised.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ExerciseReferenceLink from './ExerciseReferenceLink.jsx'
import { EXERCISE_BY_ID } from '../data/exerciseCatalogue.js'

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

describe('ExerciseReferenceLink — render predicate', () => {
    it('renders a reference row for a known exerciseId', () => {
        const html = renderToStaticMarkup(<ExerciseReferenceLink exerciseId={KNOWN_ID} />)
        expect(html).toContain('exercise-ref')
        expect(html).toContain('<a')
    })

    it.each([undefined, null, ''])('renders nothing for absent exerciseId %s', (exerciseId) => {
        expect(renderToStaticMarkup(<ExerciseReferenceLink exerciseId={exerciseId} />)).toBe('')
    })

    it('renders nothing for an unknown exerciseId', () => {
        expect(renderToStaticMarkup(<ExerciseReferenceLink exerciseId="no-such-exercise" />)).toBe('')
    })

    it('renders nothing for an entry without resources', () => {
        injectEntry('malformed-no-resources', { exerciseId: 'malformed-no-resources', name: 'Broken' })
        expect(renderToStaticMarkup(<ExerciseReferenceLink exerciseId="malformed-no-resources" />)).toBe('')
    })

    it('renders nothing for a resource without a url', () => {
        injectEntry('malformed-no-url', {
            exerciseId: 'malformed-no-url',
            name: 'Broken',
            resources: [{ type: 'video', provider: 'ExampleProvider', label: 'Watch demo' }]
        })
        expect(renderToStaticMarkup(<ExerciseReferenceLink exerciseId="malformed-no-url" />)).toBe('')
    })

    it('renders nothing for a resource without a provider', () => {
        injectEntry('malformed-no-provider', {
            exerciseId: 'malformed-no-provider',
            name: 'Broken',
            resources: [{ type: 'video', label: 'Watch demo', url: 'https://example.com/demo' }]
        })
        expect(renderToStaticMarkup(<ExerciseReferenceLink exerciseId="malformed-no-provider" />)).toBe('')
    })
})

describe('ExerciseReferenceLink — control contract', () => {
    const html = renderToStaticMarkup(<ExerciseReferenceLink exerciseId={KNOWN_ID} />)

    it('uses the fixed visible wording "WATCH DEMO"', () => {
        expect(html).toContain('WATCH DEMO')
    })

    it('renders the play and external-link glyphs, hidden from screen readers', () => {
        expect(html).toContain('▶')
        expect(html).toContain('↗')
        expect(html).toContain('aria-hidden="true"')
    })

    it('shows the catalogue provider as visible text, hidden from screen readers', () => {
        // The link's aria-label already names the provider; the visible caption
        // would otherwise be announced twice.
        expect(html).toContain('<span class="exercise-ref__provider" aria-hidden="true">NASM</span>')
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

    it('labels the link with exercise name, provider, and external-site warning', () => {
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
