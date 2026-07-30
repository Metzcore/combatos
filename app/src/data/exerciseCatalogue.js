// exerciseCatalogue.js — bundled exercise reference registry (A11a foundation)
//
// exerciseCatalogue.json MIRRORS the canonical, authored source at repo-root
// `catalogue/exercise-catalogue.json`; a regression test
// (app/src/utils/exerciseCatalogueIntegrity.test.js) asserts the two parsed
// documents stay equal. It is bundled as a module — not fetched at runtime —
// so catalogue metadata is available offline through the existing JavaScript
// bundle. Same pattern as data/cartridges/index.js mirroring root
// `cartridges/*.json`.
//
// `exerciseId` is the canonical exercise identity: stable across cartridges
// when a human has deliberately ruled two items to represent the same
// exercise. It is NOT the prescription-slot identity (`item.id` / logged
// `itemId`) and is never derived from it, from item position, or from the
// display name. It is additive schema-v3 metadata and is never logged.
//
// The production catalogue carries a small curated seed; entries are added
// only by a deliberate human curation pass. Resolution here is fail-safe
// (absent or unknown ID → null) so no render path can throw on a missing
// reference. Structural validation lives in deterministic tests
// (app/src/utils/validateExerciseCatalogue.test.js), matching the cartridge
// registry convention of no module-load validation.

import catalogue from './exerciseCatalogue.json'

/** The parsed app-bundled exercise catalogue. */
export const EXERCISE_CATALOGUE = catalogue

/** Catalogue entries keyed by `exerciseId`. */
export const EXERCISE_BY_ID = new Map(
    (EXERCISE_CATALOGUE.exercises || []).map((exercise) => [exercise.exerciseId, exercise])
)

/**
 * Fail-safe exercise reference resolver.
 *
 * @param {string} [exerciseId] - optional canonical exercise identity from a cartridge item
 * @returns {object|null} the catalogue entry, or null when the ID is absent or unknown
 */
export function getExerciseReference(exerciseId) {
    if (typeof exerciseId !== 'string' || exerciseId.length === 0) return null
    return EXERCISE_BY_ID.get(exerciseId) || null
}

export default EXERCISE_CATALOGUE
