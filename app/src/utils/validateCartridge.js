/**
 * validateCartridge.js — structural validation for program cartridges (block model, v3)
 *
 * Implements Part A (the deterministic half) of the authoring reviewer
 * checklist (docs/authoring/REVIEWER-CHECKLIST.md) against the block-composable
 * schema (docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md).
 *
 * Model: a day is an ordered list of BLOCKS; each block has a `kind` that
 * decides its item shape:
 *   - mobility / cooldown : descriptive holds — { name, dose, note?, cue? }
 *   - strength / core     : loaded work — { name, sets, reps, prescription?, pair?, cue? }
 *   - conditioning        : rounds/intervals — { name, rounds, roundLength?, rest?, perRound?, cue? }
 * Prescription is per strength/core item and OPTIONAL (a free object such as
 * { rpe } / { percent } / { note }) — the v1 "one model per cartridge" rule was
 * dropped because real multi-modal days mix prescription styles freely.
 *
 * Pure and side-effect free: takes a parsed cartridge object, returns an array
 * of human-readable error strings — empty array === structurally valid.
 */

const KNOWN_KINDS = ['mobility', 'strength', 'conditioning', 'cooldown', 'core']
const DAY_TYPES = ['training', 'rest', 'recovery', 'custom']
const KNOWN_FEATURES = ['hipScoreRouting', 'bagWork']
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const LOWER_KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function trainingMetadataErrors(cartridge) {
    const errors = []

    if (cartridge.schemaVersion !== 3) {
        errors.push('schemaVersion must be exactly 3')
    }
    if (typeof cartridge.cartridgeVersion !== 'string' || !SEMVER_PATTERN.test(cartridge.cartridgeVersion)) {
        errors.push('cartridgeVersion must be a semantic version such as "1.0.0"')
    }

    if (typeof cartridge.summary !== 'string' || cartridge.summary.trim().length === 0 || cartridge.summary.length > 160 || /[\r\n]/.test(cartridge.summary)) {
        errors.push('summary must be a single-line string between 1 and 160 characters')
    }

    if (!Array.isArray(cartridge.outcomes)) {
        errors.push('outcomes must be an array')
    } else {
        if (cartridge.outcomes.length < 2 || cartridge.outcomes.length > 4) {
            errors.push('outcomes must contain between 2 and 4 items')
        }
        const normalizedOutcomes = new Set()
        for (const outcome of cartridge.outcomes) {
            if (typeof outcome !== 'string' || outcome.trim().length === 0 || outcome.length > 80 || /[\r\n]/.test(outcome)) {
                errors.push('each outcome must be a single-line string between 1 and 80 characters')
                continue
            }
            normalizedOutcomes.add(outcome.trim().toLowerCase())
        }
        if (normalizedOutcomes.size !== cartridge.outcomes.length) errors.push('outcomes must be unique')
    }

    if (!Array.isArray(cartridge.tags)) {
        errors.push('tags must be an array')
    } else {
        if (cartridge.tags.length < 1 || cartridge.tags.length > 8) {
            errors.push('tags must contain between 1 and 8 items')
        }
        const uniqueTags = new Set(cartridge.tags)
        if (uniqueTags.size !== cartridge.tags.length) errors.push('tags must be unique')
        for (const tag of cartridge.tags) {
            if (typeof tag !== 'string' || !LOWER_KEBAB_PATTERN.test(tag)) {
                errors.push('each tag must be a lowercase-kebab string')
            }
        }
    }

    const equipment = cartridge.requirements && cartridge.requirements.equipment
    if (!Array.isArray(equipment)) {
        errors.push('requirements.equipment must be an array')
    } else {
        const normalizedEquipment = new Set()
        for (const item of equipment) {
            if (typeof item !== 'string' || item.trim().length === 0) {
                errors.push('each requirements.equipment item must be a non-empty string')
                continue
            }
            normalizedEquipment.add(item.trim().toLowerCase())
        }
        if (normalizedEquipment.size !== equipment.length) errors.push('requirements.equipment items must be unique')
    }

    return errors
}

/** Kind-specific field checks for a single item (id/uniqueness handled by caller). */
function itemFieldErrors(kind, item, label) {
    const errors = []
    if (!item.name) errors.push(`${label}: name is required`)

    switch (kind) {
        case 'mobility':
        case 'cooldown':
            if (!item.dose) errors.push(`${label}: ${kind} item requires a "dose"`)
            break
        case 'strength':
        case 'core':
            if (item.sets == null) errors.push(`${label}: ${kind} item requires "sets"`)
            if (item.reps == null || item.reps === '') errors.push(`${label}: ${kind} item requires "reps"`)
            if (item.prescription != null && (typeof item.prescription !== 'object' || Array.isArray(item.prescription))) {
                errors.push(`${label}: prescription must be an object`)
            }
            if (item.pair != null) {
                if (typeof item.pair !== 'object' || Array.isArray(item.pair)) {
                    errors.push(`${label}: pair must be an object`)
                } else if (!item.pair.name) {
                    errors.push(`${label}: pair requires a "name"`)
                }
            }
            break
        case 'conditioning':
            if (typeof item.rounds !== 'number') errors.push(`${label}: conditioning item requires a numeric "rounds"`)
            if (item.perRound != null && !Array.isArray(item.perRound)) errors.push(`${label}: perRound must be an array`)
            break
        default:
            break // unknown kind already reported by caller
    }
    return errors
}

/** Basic validation for a `content` cartridge (theory/educational material). */
function validateContentCartridge(cartridge) {
    const errors = []
    if (!cartridge.cartridgeId) errors.push('cartridgeId is required')
    if (!Array.isArray(cartridge.sections) || cartridge.sections.length === 0) {
        errors.push('content cartridge requires a non-empty sections[]')
    }
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
 * Validate a program cartridge against the block-model structural rules.
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

    // Required fields
    if (!cartridge.cartridgeId) errors.push('cartridgeId is required')
    if (!cartridge.label) errors.push('label is required')
    errors.push(...trainingMetadataErrors(cartridge))

    const dayCount = cartridge.cycle && cartridge.cycle.dayCount
    if (typeof dayCount !== 'number' || dayCount < 1) {
        errors.push('cycle.dayCount must be a positive number')
    }

    if (!Array.isArray(cartridge.days)) {
        errors.push('days must be an array')
        return errors
    }

    // Days cover 1..dayCount, no gaps, no duplicates, none out of range
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

    const seenItemIds = new Set()
    const supersetCounts = {}
    for (const day of cartridge.days) {
        const dayLabel = `day ${day.day}`
        const type = day.type || 'training'
        if (!DAY_TYPES.includes(type)) errors.push(`${dayLabel}: unknown day type "${type}"`)

        const blocks = Array.isArray(day.blocks) ? day.blocks : []

        // training days need blocks; rest/recovery must have none; custom is free-form
        if (type === 'training' && blocks.length === 0) {
            errors.push(`${dayLabel}: training day must have at least one block`)
        }
        if ((type === 'rest' || type === 'recovery') && blocks.length > 0) {
            errors.push(`${dayLabel}: ${type} day must have no blocks`)
        }

        for (const block of blocks) {
            const blockLabel = `${dayLabel} block "${block.kind || '(no kind)'}"`
            if (!block.kind) errors.push(`${blockLabel}: block kind is required`)
            else if (!KNOWN_KINDS.includes(block.kind)) {
                errors.push(`${blockLabel}: unknown block kind "${block.kind}"`)
            }

            const items = Array.isArray(block.items) ? block.items : []
            if (items.length === 0) errors.push(`${blockLabel}: block must have at least one item`)

            for (const item of items) {
                const itemLabel = `${blockLabel} item "${item.id || '(no id)'}"`
                if (!item.id) errors.push(`${itemLabel}: id is required`)
                else if (seenItemIds.has(item.id)) errors.push(`duplicate item id "${item.id}"`)
                else seenItemIds.add(item.id)

                errors.push(...itemFieldErrors(block.kind, item, itemLabel))

                if (item.superset != null) {
                    supersetCounts[item.superset] = (supersetCounts[item.superset] || 0) + 1
                }
            }
        }
    }

    for (const [label, count] of Object.entries(supersetCounts)) {
        if (count < 2) errors.push(`superset "${label}" groups only ${count} item (needs >= 2)`)
    }

    if (cartridge.features && typeof cartridge.features === 'object') {
        for (const key of Object.keys(cartridge.features)) {
            if (!KNOWN_FEATURES.includes(key)) errors.push(`unknown feature flag "${key}"`)
        }
    }

    return errors
}

export default validateCartridge
