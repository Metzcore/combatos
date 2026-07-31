/**
 * validateExerciseCatalogue.test.js
 *
 * Pins the deterministic validation contract for the canonical exercise
 * reference catalogue. Inline fixtures per rule — all entries here are
 * test-only and use placeholder URLs, never real curated links.
 */
import { describe, it, expect } from 'vitest'
import { validateExerciseCatalogue } from './validateExerciseCatalogue.js'

/** A minimal, structurally-valid one-entry catalogue to mutate per test. */
function validCatalogue() {
    return {
        catalogueVersion: '1.0.0',
        exercises: [
            {
                exerciseId: 'fixture-squat',
                name: 'Fixture Squat',
                resources: [
                    { type: 'video', provider: 'ExampleProvider', label: 'Watch demo', url: 'https://example.com/demo' }
                ]
            }
        ]
    }
}

describe('validateExerciseCatalogue — valid input', () => {
    it('accepts an empty catalogue (empty stays structurally valid)', () => {
        expect(validateExerciseCatalogue({ catalogueVersion: '1.0.0', exercises: [] })).toEqual([])
    })

    it('accepts a valid one-entry catalogue', () => {
        expect(validateExerciseCatalogue(validCatalogue())).toEqual([])
    })

    it('accepts duplicate URLs across different exercises', () => {
        const c = validCatalogue()
        c.exercises.push({
            exerciseId: 'fixture-front-squat',
            name: 'Fixture Front Squat',
            resources: [
                { type: 'video', provider: 'ExampleProvider', label: 'Watch demo', url: 'https://example.com/demo' }
            ]
        })
        expect(validateExerciseCatalogue(c)).toEqual([])
    })
})

describe('validateExerciseCatalogue — root shape', () => {
    it.each([null, undefined, 42, 'x', []])('rejects non-object root %s', (input) => {
        expect(validateExerciseCatalogue(input)).toEqual(['catalogue must be an object'])
    })

    it.each(['1', 'v1.0.0', '1.0', 1])('rejects invalid catalogueVersion %s', (version) => {
        const c = validCatalogue()
        c.catalogueVersion = version
        expect(validateExerciseCatalogue(c).some((e) => e.includes('catalogueVersion'))).toBe(true)
    })

    it.each([undefined, null, {}, 'x'])('rejects non-array exercises %s', (exercises) => {
        const c = validCatalogue()
        c.exercises = exercises
        expect(validateExerciseCatalogue(c)).toContain('exercises must be an array')
    })

    it('rejects a non-object exercise entry', () => {
        const c = validCatalogue()
        c.exercises = ['not-an-object', 42, null]
        const errors = validateExerciseCatalogue(c)
        expect(errors.filter((e) => e === 'each exercise must be an object')).toHaveLength(3)
    })
})

describe('validateExerciseCatalogue — exerciseId', () => {
    it.each([undefined, '', 'Back Squat', 'BackSquat', 'back_squat', 'back--squat', 7])(
        'rejects invalid exerciseId %s',
        (exerciseId) => {
            const c = validCatalogue()
            c.exercises[0].exerciseId = exerciseId
            expect(validateExerciseCatalogue(c).some((e) => e.includes('exerciseId must be a non-empty lowercase-kebab string'))).toBe(true)
        }
    )

    it('rejects a duplicate exerciseId', () => {
        const c = validCatalogue()
        c.exercises.push({ ...c.exercises[0], name: 'Another Fixture Squat' })
        expect(validateExerciseCatalogue(c)).toContain('duplicate exerciseId "fixture-squat"')
    })
})

describe('validateExerciseCatalogue — entry fields', () => {
    it.each(['', '   ', 'Line one\nLine two', 42])('rejects invalid name %j', (name) => {
        const c = validCatalogue()
        c.exercises[0].name = name
        expect(validateExerciseCatalogue(c).some((e) => e.includes('name must be a non-empty single-line string'))).toBe(true)
    })

    it('rejects missing resources', () => {
        const c = validCatalogue()
        delete c.exercises[0].resources
        expect(validateExerciseCatalogue(c).some((e) => e.includes('resources must be a non-empty array'))).toBe(true)
    })

    it('rejects empty resources', () => {
        const c = validCatalogue()
        c.exercises[0].resources = []
        expect(validateExerciseCatalogue(c).some((e) => e.includes('resources must be a non-empty array'))).toBe(true)
    })

    it('rejects a non-object resource', () => {
        const c = validCatalogue()
        c.exercises[0].resources = ['https://example.com/demo']
        expect(validateExerciseCatalogue(c).some((e) => e.includes('resource must be an object'))).toBe(true)
    })
})

describe('validateExerciseCatalogue — resource fields', () => {
    it.each([undefined, 'article', 'Video', 'IMAGE'])('rejects invalid resource type %s', (type) => {
        const c = validCatalogue()
        c.exercises[0].resources[0].type = type
        expect(validateExerciseCatalogue(c).some((e) => e.includes('type must be exactly "video"'))).toBe(true)
    })

    it.each(['', 'a\nb', 42])('rejects invalid provider %j', (provider) => {
        const c = validCatalogue()
        c.exercises[0].resources[0].provider = provider
        expect(validateExerciseCatalogue(c).some((e) => e.includes('provider must be a non-empty single-line string'))).toBe(true)
    })

    it.each(['', 'a\nb', 42])('rejects invalid label %j', (label) => {
        const c = validCatalogue()
        c.exercises[0].resources[0].label = label
        expect(validateExerciseCatalogue(c).some((e) => e.includes('label must be a non-empty single-line string'))).toBe(true)
    })

    it.each(['not a url', '/relative/path', 'example.com/demo', 42])('rejects malformed or relative url %j', (url) => {
        const c = validCatalogue()
        c.exercises[0].resources[0].url = url
        expect(validateExerciseCatalogue(c).some((e) => e.includes('url must be a valid URL'))).toBe(true)
    })

    it.each(['http://example.com/demo', 'ftp://example.com/demo'])('rejects non-HTTPS url %s', (url) => {
        const c = validCatalogue()
        c.exercises[0].resources[0].url = url
        expect(validateExerciseCatalogue(c).some((e) => e.includes('url must use the https: protocol'))).toBe(true)
    })
})
