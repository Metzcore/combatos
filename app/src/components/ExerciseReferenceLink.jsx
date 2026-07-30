// ExerciseReferenceLink.jsx — A11 Plan/Library exercise demonstration link.
//
// Pure presentational control rendered at the end of a Plan exercise item
// when the bundled catalogue holds a curated external reference for the
// item's `exerciseId`. Direct-open only: a semantic anchor, no modal, no
// state, no media, no network at render — the external site loads solely
// after the user's explicit tap, outside the PWA.
//
// Fail-safe by construction: any absent/unknown ID or malformed entry or
// resource renders nothing (null), so an item without a usable reference is
// structurally identical to the pre-feature layout. No name matching, no URL
// validation, no connectivity checks happen here — catalogue structure is
// pinned by validateExerciseCatalogue tests.

import { getExerciseReference } from '../data/exerciseCatalogue.js'

/**
 * Renders the "WATCH DEMO" external reference row for one exercise item.
 *
 * @param {object} props
 * @param {string} [props.exerciseId] - optional canonical exercise identity from a cartridge item
 * @returns {JSX.Element|null} the reference row, or null when no usable reference exists
 */
export default function ExerciseReferenceLink({ exerciseId }) {
    const entry = getExerciseReference(exerciseId)
    if (!entry || typeof entry.name !== 'string' || entry.name.length === 0) return null

    // First valid resource only (v1); anything malformed hides the control.
    const resource = Array.isArray(entry.resources) ? entry.resources[0] : null
    if (
        !resource ||
        typeof resource.url !== 'string' || resource.url.length === 0 ||
        typeof resource.provider !== 'string' || resource.provider.length === 0
    ) {
        return null
    }

    return (
        <div className="exercise-ref">
            <a
                className="exercise-ref__link"
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Watch ${entry.name} demonstration from ${resource.provider}; opens external site`}
            >
                <span className="exercise-ref__glyph" aria-hidden="true">▶</span>
                <span className="exercise-ref__label">WATCH DEMO</span>
                <span className="exercise-ref__glyph" aria-hidden="true">↗</span>
            </a>
            <span className="exercise-ref__provider" aria-hidden="true">{resource.provider}</span>
        </div>
    )
}
