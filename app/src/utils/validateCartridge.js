/**
 * validateCartridge.js — structural validation for program cartridges (block model, v2)
 *
 * Implements Part A (the deterministic half) of the authoring reviewer
 * checklist (docs/authoring/REVIEWER-CHECKLIST.md) against the block-composable
 * schema (docs/planning/rebuild/BLOCK-MODEL-DRAFT.md).
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
