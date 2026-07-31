/**
 * components/today/TodayExerciseReferenceLink.jsx — A11 Today exercise
 * demonstration affordance.
 *
 * A Today-specific compact sibling of ../ExerciseReferenceLink.jsx, sharing
 * its URL-selection rule via getPrimaryExerciseVideoReference — one shared
 * resolution contract, not a second interpretation. Direct-open only: a
 * semantic anchor, no modal, no state, no media, no network at render — the
 * external site loads solely after the user's explicit tap.
 *
 * Substitution safety (binding rule): any truthy substitutedName hides the
 * prescribed item's video completely. The free-text replacement name is
 * never matched against the catalogue and never used to infer a replacement
 * exerciseId — a plausible-looking but incorrect demonstration is worse than
 * no demonstration.
 */
import { getPrimaryExerciseVideoReference } from '../../data/exerciseCatalogue.js'

/**
 * @param {object} props
 * @param {string} [props.exerciseId] - optional canonical exercise identity from a cartridge item
 * @param {string} [props.substitutedName] - free-text performed-name override, when substituted
 * @returns {JSX.Element|null} the compact reference anchor, or null when nothing should render
 */
export default function TodayExerciseReferenceLink({ exerciseId, substitutedName }) {
    if (substitutedName) return null

    const reference = getPrimaryExerciseVideoReference(exerciseId)
    if (!reference) return null

    return (
        <a
            className="today-exercise-ref"
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Watch ${reference.name} demonstration from ${reference.provider}; opens external site`}
        >
            <span className="today-exercise-ref__glyph" aria-hidden="true">▶</span>
            <span className="today-exercise-ref__label">DEMO</span>
            <span className="today-exercise-ref__glyph today-exercise-ref__glyph--ext" aria-hidden="true">↗</span>
        </a>
    )
}
