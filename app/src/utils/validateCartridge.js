/**
 * validateCartridge.js — structural validation for program cartridges
 *
 * Implements Part A (the deterministic half) of the authoring reviewer
 * checklist (docs/authoring/REVIEWER-CHECKLIST.md), which mirrors the
 * validation rules in docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md.
 *
 * Pure and side-effect free: takes a parsed cartridge object and returns an
 * array of human-readable error strings — an empty array means structurally
 * valid. This is the seed of the cartridge contract the rebuilt Train tab
 * will consume; it is intentionally standalone and unit-tested before any
 * renderer code exists, and does NOT depend on the (still-open, W26-gated)
 * logging payload shape.
 *
 * Scope: full validation for `training` cartridges; basic validation for
 * `content` cartridges. A cartridge with no `type` is treated as `training`
 * (matches the spec's worked example).
 */

const PRESCRIPTION_MODELS = ['percent-1rm', 'rpe', 'straight-sets', 'time-distance', 'bodyweight']
const DAY_TYPES = ['training', 'rest', 'recovery', 'custom']
const KNOWN_FEATURES = ['hipScoreRouting', 'bagWork']

/**
 * Returns an error string if an exercise's prescription object does not match
 * the cartridge's declared model, otherwise null.
 */
function prescriptionError(model, rx, label) {
    if (rx == null || typeof rx !== 'object' || Array.isArray(rx)) {
        return `${label}: prescription must be an object`
    }
    const keys = Object.keys(rx)
    switch (model) {
        case 'percent-1rm': {
            if (typeof rx.percent !== 'number') return `${label}: percent-1rm requires a numeric "percent"`
            return null
        }
        case 'rpe': {
            if (typeof rx.rpe !== 'number' && typeof rx.rir !== 'number') {
                return `${label}: rpe model requires a numeric "rpe" or "rir"`
            }
            return null
        }
        case 'straight-sets': {
            const extra = keys.filter((k) => k !== 'suggestedLoad')
            if (extra.length) return `${label}: straight-sets prescription allows only "suggestedLoad" (got ${extra.join(', ')})`
            return null
        }
        case 'time-distance': {
            if (rx.duration == null && rx.distance == null) return `${label}: time-distance requires "duration" or "distance"`
            return null
        }
        case 'bodyweight': {
            const extra = keys.filter((k) => k !== 'addedLoad')
            if (extra.length) return `${label}: bodyweight prescription allows only "addedLoad" (got ${extra.join(', ')})`
            return null
        }
        default:
            return null
    }
}

/**
 * Basic validation for a `content` cartridge (theory/educational material).
 */
function validateContentCartridge(cartridge) {
    const errors = []
    if (!cartridge.cartridgeId) errors.push('cartridgeId is required')
    if (!Array.isArray(cartridge.sections) || cartridge.sections.length === 0) {
        errors.push('content cartridge requires a non-empty sections[]')
    }
    if (cartridge.prescription != null) errors.push('content cartridge must not declare a prescription model')
    if (cartridge.days != null) errors.push('content cartridge must not have days')

    const ids = new Set()
    const noteId = (id, label) => {
        if (!id) errors.push(`${label}: id is required`)
        else if (ids.has(id)) errors.push(`duplicate id "${id}"`)
        else ids.add(id)
    }
    for (const section of cartridge.sections || []) {
        const label = `section "${section.id || '(no id)'}"`
        noteId(section.id, label)
        if (!Array.isArray(section.items) || section.items.length === 0) {
            errors.push(`${label}: requires at least one item`)
        }
        for (const item of section.items || []) {
            noteId(item.id, `${label} item "${item.id || '(no id)'}"`)
        }
    }
    return errors
}

/**
 * Validate a program cartridge against the spec's structural rules.
 *
 * @param {object} cartridge - a parsed cartridge object
 * @returns {string[]} error messages; empty array === structurally valid
 */
export function validateCartridge(cartridge) {
    if (cartridge == null || typeof cartridge !== 'object' || Array.isArray(cartridge)) {
        return ['cartridge must be an object']
    }
    if (cartridge.type === 'content') return validateContentCartridge(cartridge)

    const errors = []

    // Rule 1 — required fields + valid prescription model
    if (!cartridge.cartridgeId) errors.push('cartridgeId is required')
    if (!cartridge.label) errors.push('label is required')
    if (!cartridge.prescription) {
        errors.push('prescription is required')
    } else if (!PRESCRIPTION_MODELS.includes(cartridge.prescription)) {
        errors.push(`prescription "${cartridge.prescription}" is not one of: ${PRESCRIPTION_MODELS.join(', ')}`)
    }

    const dayCount = cartridge.cycle && cartridge.cycle.dayCount
    if (typeof dayCount !== 'number' || dayCount < 1) {
        errors.push('cycle.dayCount must be a positive number')
    }

    if (!Array.isArray(cartridge.days)) {
        errors.push('days must be an array')
        return errors // nothing more can be checked meaningfully
    }

    // Rule 2 — days cover 1..dayCount, no gaps, no duplicates, none out of range
    const dayNums = cartridge.days.map((d) => d.day)
    if (typeof dayCount === 'number' && dayCount >= 1) {
        for (let i = 1; i <= dayCount; i++) {
            if (!dayNums.includes(i)) errors.push(`days is missing day ${i} (cycle.dayCount = ${dayCount})`)
        }
    }
    const seenDays = new Set()
    for (const n of dayNums) {
        if (seenDays.has(n)) errors.push(`duplicate day number ${n}`)
        seenDays.add(n)
        if (typeof dayCount === 'number' && (typeof n !== 'number' || n < 1 || n > dayCount)) {
            errors.push(`day number ${JSON.stringify(n)} is outside 1..${dayCount}`)
        }
    }

    // Day- and exercise-level rules
    const seenExerciseIds = new Set()
    const supersetCounts = {}
    for (const day of cartridge.days) {
        const dayLabel = `day ${day.day}`
        const type = day.type || 'training'
        if (!DAY_TYPES.includes(type)) errors.push(`${dayLabel}: unknown day type "${type}"`)

        const exercises = Array.isArray(day.exercises) ? day.exercises : []

        // Rule 3 — training days need exercises; rest/recovery must have none
        if (type === 'training' && exercises.length === 0) {
            errors.push(`${dayLabel}: training day must have at least one exercise`)
        }
        if ((type === 'rest' || type === 'recovery') && exercises.length > 0) {
            errors.push(`${dayLabel}: ${type} day must have no exercises`)
        }

        for (const ex of exercises) {
            const exLabel = `${dayLabel} exercise "${ex.id || '(no id)'}"`

            // Rule 4 — unique exercise ids
            if (!ex.id) errors.push(`${exLabel}: id is required`)
            else if (seenExerciseIds.has(ex.id)) errors.push(`duplicate exercise id "${ex.id}"`)
            else seenExerciseIds.add(ex.id)

            // Part A extras — required fields
            if (!ex.name) errors.push(`${exLabel}: name is required`)
            if (ex.sets == null) errors.push(`${exLabel}: sets is required`)
            if (ex.reps == null || ex.reps === '') errors.push(`${exLabel}: reps is required`)
            if (!ex.cue) errors.push(`${exLabel}: cue is required`)

            // Rule 5 — collect superset membership
            if (ex.superset != null) {
                supersetCounts[ex.superset] = (supersetCounts[ex.superset] || 0) + 1
            }

            // Rule 6 — prescription matches the declared model
            if (PRESCRIPTION_MODELS.includes(cartridge.prescription)) {
                const pErr = prescriptionError(cartridge.prescription, ex.prescription, exLabel)
                if (pErr) errors.push(pErr)
            }
        }
    }

    // Rule 5 — superset labels must group >= 2 exercises
    for (const [label, count] of Object.entries(supersetCounts)) {
        if (count < 2) errors.push(`superset "${label}" groups only ${count} exercise (needs >= 2)`)
    }

    // Rule 7 — only known feature flags
    if (cartridge.features && typeof cartridge.features === 'object') {
        for (const key of Object.keys(cartridge.features)) {
            if (!KNOWN_FEATURES.includes(key)) errors.push(`unknown feature flag "${key}"`)
        }
    }

    return errors
}

export default validateCartridge
