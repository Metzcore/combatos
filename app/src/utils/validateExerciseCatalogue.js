/**
 * validateExerciseCatalogue.js — structural validation for the canonical
 * exercise reference catalogue (A11a foundation)
 *
 * The catalogue (`catalogue/exercise-catalogue.json`, mirrored app-side at
 * app/src/data/exerciseCatalogue.json) is source-controlled read-only product
 * content: curated external-resource references keyed by canonical
 * `exerciseId`. This module is the deterministic half of its review gate,
 * following the established validateCartridge() convention.
 *
 * Pure and side-effect free: takes a parsed catalogue object, returns an array
 * of human-readable error strings — empty array === structurally valid.
 *
 * Deliberately NOT validated here: network requests, HEAD checks, provider
 * allowlisting, link-rot checks, or live URL verification. Duplicate URLs
 * across different exercises are allowed — one curated demonstration can
 * legitimately cover more than one movement.
 */

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const LOWER_KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptySingleLineString(value) {
    return typeof value === 'string' && value.trim().length > 0 && !/[\r\n]/.test(value)
}

function resourceErrors(resource, label) {
    if (!isPlainObject(resource)) return [`${label}: resource must be an object`]

    const errors = []
    if (resource.type !== 'video') errors.push(`${label}: type must be exactly "video"`)
    if (!isNonEmptySingleLineString(resource.provider)) {
        errors.push(`${label}: provider must be a non-empty single-line string`)
    }
    if (!isNonEmptySingleLineString(resource.label)) {
        errors.push(`${label}: label must be a non-empty single-line string`)
    }

    let url = null
    try {
        url = new URL(resource.url)
    } catch {
        errors.push(`${label}: url must be a valid URL`)
    }
    if (url && url.protocol !== 'https:') errors.push(`${label}: url must use the https: protocol`)

    return errors
}

/**
 * Validate an exercise catalogue against the v1 structural rules.
 *
 * @param {object} catalogue - a parsed catalogue object
 * @returns {string[]} error messages; empty array === structurally valid
 */
export function validateExerciseCatalogue(catalogue) {
    if (!isPlainObject(catalogue)) {
        return ['catalogue must be an object']
    }

    const errors = []

    if (typeof catalogue.catalogueVersion !== 'string' || !SEMVER_PATTERN.test(catalogue.catalogueVersion)) {
        errors.push('catalogueVersion must be a semantic version such as "1.0.0"')
    }

    if (!Array.isArray(catalogue.exercises)) {
        errors.push('exercises must be an array')
        return errors
    }

    // An empty exercises array remains structurally valid: emptiness is not
    // an error, even though production now ships curated entries.

    const seenIds = new Set()
    for (const exercise of catalogue.exercises) {
        if (!isPlainObject(exercise)) {
            errors.push('each exercise must be an object')
            continue
        }

        const label = `exercise "${exercise.exerciseId || '(no id)'}"`

        if (typeof exercise.exerciseId !== 'string' || !LOWER_KEBAB_PATTERN.test(exercise.exerciseId)) {
            errors.push(`${label}: exerciseId must be a non-empty lowercase-kebab string`)
        } else if (seenIds.has(exercise.exerciseId)) {
            errors.push(`duplicate exerciseId "${exercise.exerciseId}"`)
        } else {
            seenIds.add(exercise.exerciseId)
        }

        if (!isNonEmptySingleLineString(exercise.name)) {
            errors.push(`${label}: name must be a non-empty single-line string`)
        }

        if (!Array.isArray(exercise.resources) || exercise.resources.length === 0) {
            errors.push(`${label}: resources must be a non-empty array`)
            continue
        }
        exercise.resources.forEach((resource, index) => {
            errors.push(...resourceErrors(resource, `${label} resource ${index + 1}`))
        })
    }

    return errors
}

export default validateExerciseCatalogue
