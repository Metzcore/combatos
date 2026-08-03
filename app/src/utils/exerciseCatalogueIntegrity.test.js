/**
 * exerciseCatalogueIntegrity.test.js
 *
 * Deterministic cross-reference integrity for the A11a exercise reference
 * foundation:
 *
 *   1. The canonical root catalogue and the app-bundled mirror stay equal.
 *   2. Every `exerciseId` authored on a training cartridge item resolves to
 *      exactly one catalogue entry — an unknown authored ID must not silently
 *      ship. The production cartridges author a small curated set; explicit
 *      fixtures additionally prove both a resolving ID and an unknown ID.
 *   3. The runtime resolver (app/src/data/exerciseCatalogue.js) is fail-safe:
 *      known ID → entry, unknown/absent ID → null, never a throw.
 *
 * Fixture IDs and URLs are test-only placeholders — never real curated links.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { validateExerciseCatalogue } from './validateExerciseCatalogue.js'

const here = dirname(fileURLToPath(import.meta.url))
const loadJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

// Resolver tests stay independent of curated production content: a known-ID
// lookup uses a fixture, mocking the bundled JSON before the registry module
// is imported. Declared at top level (Vitest hoists it above the imports).
vi.mock('../data/exerciseCatalogue.json', () => ({
    default: {
        catalogueVersion: '1.0.0',
        exercises: [
            {
                exerciseId: 'fixture-squat',
                name: 'Fixture Squat',
                resources: [{ type: 'video', provider: 'ExampleProvider', label: 'Watch demo', url: 'https://example.com/demo' }]
            }
        ]
    }
}))

const CANONICAL_CATALOGUE_PATH = resolve(here, '../../../catalogue/exercise-catalogue.json')
const BUNDLED_CATALOGUE_PATH = resolve(here, '../data/exerciseCatalogue.json')
const CARTRIDGE_NAMES = ['combatos-foundation-2026.json', 'combatos-operator-2026.json', 'apex-protocol-phase1.json', 'pilot-01-full-body-base-2026.json']

/** Collect every authored training-item exerciseId in a parsed cartridge. */
function collectAuthoredExerciseIds(cartridge) {
    const ids = []
    for (const day of cartridge.days || []) {
        for (const block of day.blocks || []) {
            for (const item of block.items || []) {
                if (item.exerciseId != null) ids.push(item.exerciseId)
            }
        }
    }
    return ids
}

/** Return the authored IDs that do not resolve to exactly one catalogue entry. */
function unresolvedReferences(cartridge, catalogue) {
    const knownIds = new Set((catalogue.exercises || []).map((exercise) => exercise.exerciseId))
    return collectAuthoredExerciseIds(cartridge).filter((id) => !knownIds.has(id))
}

describe('exercise catalogue — canonical/mirror equality', () => {
    it('app-bundled mirror matches the canonical root catalogue', () => {
        expect(loadJson(BUNDLED_CATALOGUE_PATH)).toEqual(loadJson(CANONICAL_CATALOGUE_PATH))
    })

    it('production catalogue validates clean', () => {
        expect(validateExerciseCatalogue(loadJson(CANONICAL_CATALOGUE_PATH))).toEqual([])
    })
})

describe('exercise catalogue — cartridge reference integrity', () => {
    const catalogue = loadJson(CANONICAL_CATALOGUE_PATH)

    it.each(CARTRIDGE_NAMES)('every authored exerciseId in %s resolves to a catalogue entry', (name) => {
        const cartridge = loadJson(resolve(here, '../../../cartridges/', name))
        expect(unresolvedReferences(cartridge, catalogue)).toEqual([])
    })

    it('fixture: a resolving authored ID passes the audit', () => {
        const fixtureCatalogue = {
            catalogueVersion: '1.0.0',
            exercises: [
                {
                    exerciseId: 'fixture-squat',
                    name: 'Fixture Squat',
                    resources: [{ type: 'video', provider: 'ExampleProvider', label: 'Watch demo', url: 'https://example.com/demo' }]
                }
            ]
        }
        const fixtureCartridge = {
            days: [{ day: 1, type: 'training', blocks: [{ kind: 'strength', items: [{ id: 'd1-str-1', name: 'Squat', exerciseId: 'fixture-squat' }] }] }]
        }
        expect(unresolvedReferences(fixtureCartridge, fixtureCatalogue)).toEqual([])
    })

    it('fixture: an unknown authored ID is caught by the audit', () => {
        const fixtureCartridge = {
            days: [{ day: 1, type: 'training', blocks: [{ kind: 'strength', items: [{ id: 'd1-str-1', name: 'Squat', exerciseId: 'not-in-catalogue' }] }] }]
        }
        expect(unresolvedReferences(fixtureCartridge, catalogue)).toEqual(['not-in-catalogue'])
    })
})

describe('runtime resolver — fail-safe behavior (fixture catalogue)', () => {
    it('known ID returns the catalogue entry; unknown/absent ID returns null', async () => {
        const { EXERCISE_CATALOGUE, EXERCISE_BY_ID, getExerciseReference } = await import('../data/exerciseCatalogue.js')

        expect(EXERCISE_CATALOGUE.catalogueVersion).toBe('1.0.0')
        expect(EXERCISE_BY_ID.get('fixture-squat').name).toBe('Fixture Squat')

        const entry = getExerciseReference('fixture-squat')
        expect(entry).toEqual(EXERCISE_CATALOGUE.exercises[0])

        expect(getExerciseReference('not-in-catalogue')).toBeNull()
        expect(getExerciseReference(undefined)).toBeNull()
        expect(getExerciseReference(null)).toBeNull()
        expect(getExerciseReference('')).toBeNull()
    })
})
