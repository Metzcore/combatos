/**
 * utils/cartridgeSessionPayload.js — A7a cartridge session payload builder + validator.
 *
 * Implements `docs/reference/session-payload-schema.md` (v2, the corrective-pass
 * lock — D11 in OPEN-DECISIONS.md). Pure, side-effect free: no Dexie, no React.
 *
 * `payloadVersion: 2` is the only version this module ever WRITES.
 * `payloadVersion: 1` rows are a permanently tolerated, read-only historical
 * variant (schema §10, one real row already reached production Supabase) —
 * `isReadableCartridgeRow` accepts either version for READING; the builder
 * only ever produces 2, and `validateCartridgeSessionPayload` rejects a `1`
 * as a write target exactly like any other malformed input.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

export const PAYLOAD_VERSION = 2
export const SESSION_KIND = 'cartridge'

export const DAY_TYPES = ['training', 'rest', 'recovery', 'custom']

export const SESSION_ACTIVITIES = [
    'warmup', 'cooldown', 'bag-workout', 'cardio', 'mobility', 'abs', 'corrective-exercises', 'other',
]
const SESSION_ACTIVITIES_SET = new Set(SESSION_ACTIVITIES)

export const BLOCK_KINDS = ['mobility', 'strength', 'conditioning', 'cooldown', 'core']
const HOLD_KINDS = new Set(['mobility', 'cooldown'])
const LOADED_KINDS = new Set(['strength', 'core'])
const CONDITIONING_KIND = 'conditioning'

// Top-level keys ever permitted, regardless of dayType — the per-dayType
// validator narrows this further (§4: unknown top-level keys are errors).
export const ALLOWED_TOP_LEVEL_KEYS = new Set([
    'payloadVersion', 'sessionKind', 'sessionId', 'date', 'startedAt', 'completedAt',
    'sessionCategory', 'cartridgeId', 'cartridgeVersion', 'cartridgeSchemaVersion',
    'dayTemplateKey', 'dayTemplateLabel', 'dayType', 'phaseId', 'completeness',
    'sessionActivities', 'otherActivity', 'notes', 'blocks', 'sessionDuration', 'customContent',
])

const ALWAYS_REQUIRED_TOP_LEVEL_KEYS = [
    'payloadVersion', 'sessionKind', 'sessionId', 'date', 'completedAt', 'sessionCategory',
    'cartridgeId', 'cartridgeVersion', 'cartridgeSchemaVersion',
    'dayTemplateKey', 'dayTemplateLabel', 'dayType', 'phaseId', 'blocks',
]

// Legacy-only fields that must never appear on a cartridge row (§4) — kept
// here as an explicit negative-check list so a future accidental leak of one
// of these onto a cartridge payload is a validation error, not a silent
// pollution of the legacy HUD's own reader assumptions.
export const FORBIDDEN_LEGACY_KEYS = [
    'day', 'phase', 'hipScore', 'sessionType', 'mobDone', 'clrDone',
    'bagRounds', 'bagCourse', 'bagModules', 'bagWorkouts', 'strength', 'core', 'altSessionDetails',
]

const PRESCRIBED_ALLOWED_KEYS = {
    common: new Set(['name']),
    mobility: new Set(['name', 'dose']),
    cooldown: new Set(['name', 'dose']),
    strength: new Set(['name', 'target', 'sets', 'reps', 'prescription', 'pair', 'superset']),
    core: new Set(['name', 'target', 'sets', 'reps', 'prescription', 'pair', 'superset']),
    conditioning: new Set(['name', 'rounds', 'roundLength', 'rest', 'perRound']),
}

const PERFORMED_ALLOWED_KEYS_HOLD_OR_CONDITIONING = new Set(['name'])
const PERFORMED_ALLOWED_KEYS_LOADED = new Set(['name', 'sets', 'pair'])
const PERFORMED_SET_KEYS = new Set(['kg', 'reps', 'rpe', 'rir'])
const PERFORMED_PAIR_SET_KEYS = new Set(['kg', 'reps'])
const PERFORMED_PAIR_KEYS = new Set(['sets'])

// ─── Small predicates ──────────────────────────────────────────────────────

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0
}

function toFiniteNumberOrUndefined(raw) {
    if (raw === undefined || raw === null || raw === '') return undefined
    const n = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(n) ? n : undefined
}

function toFiniteIntegerOrUndefined(raw) {
    const n = toFiniteNumberOrUndefined(raw)
    return n === undefined ? undefined : Math.trunc(n)
}

// ─── normalizeSets — the RPE/RIR-only preservation fix ─────────────────────
//
// The first attempt's normalizeSets dropped an entry whenever kg/reps were
// both absent, discarding the entry BEFORE rpe/rir were ever read — an
// effort-only set (`{ rpe: 9 }`) vanished from the payload entirely. Here an
// entry survives if ANY of kg/reps/rpe/rir is present; only a truly empty
// entry (nothing at all) is dropped. Pair sets never carry rpe/rir (schema
// §5), so `includeEffort: false` strips those keys even if raw input had them.

export function normalizeSets(rawSets, { includeEffort = true } = {}) {
    if (!Array.isArray(rawSets)) return []
    const out = []
    for (const raw of rawSets) {
        if (!isPlainObject(raw)) continue
        const entry = {}
        const kg = toFiniteNumberOrUndefined(raw.kg)
        const reps = toFiniteIntegerOrUndefined(raw.reps)
        if (kg !== undefined) entry.kg = kg
        if (reps !== undefined) entry.reps = reps
        if (includeEffort) {
            const rpe = toFiniteNumberOrUndefined(raw.rpe)
            const rir = toFiniteIntegerOrUndefined(raw.rir)
            if (rpe !== undefined) entry.rpe = rpe
            if (rir !== undefined) entry.rir = rir
        }
        if (Object.keys(entry).length === 0) continue // nothing at all — not real data
        out.push(entry)
    }
    return out
}

export function normalizePairSets(rawSets) {
    return normalizeSets(rawSets, { includeEffort: false })
}

// ─── Prescribed builder — allowlist projection only, never a spread (§6) ────

export function buildPrescribed(kind, cartridgeItem) {
    const allowed = PRESCRIBED_ALLOWED_KEYS[kind] || PRESCRIBED_ALLOWED_KEYS.common
    const out = {}
    for (const key of allowed) {
        if (cartridgeItem && cartridgeItem[key] !== undefined) out[key] = cartridgeItem[key]
    }
    return out
}

// ─── Performed builder + substitution derivation ────────────────────────────
//
// `substituted` is ALWAYS derived here from prescribed.name vs. the caller's
// performed name — never trusted from draft input (schema §6).

export function buildPerformed(kind, prescribed, performedInput) {
    const input = performedInput || {}
    const substitutedName = isNonEmptyString(input.name) && input.name.trim() !== prescribed.name
        ? input.name.trim()
        : undefined
    const substituted = substitutedName !== undefined

    let performed
    if (LOADED_KINDS.has(kind)) {
        performed = { sets: normalizeSets(input.sets) }
        if (input.pair && Array.isArray(input.pair.sets)) {
            const pairSets = normalizePairSets(input.pair.sets)
            if (pairSets.length > 0) performed.pair = { sets: pairSets }
        }
        if (substituted) performed.name = substitutedName
    } else {
        // mobility / cooldown / conditioning — no completion tracking of any
        // kind (schema §6): `{}` by default, `{ name }` only if substituted.
        performed = {}
        if (substituted) performed.name = substitutedName
    }

    return { performed, substituted }
}

// ─── Top-level builder ──────────────────────────────────────────────────────
//
// `input.blocks` items are `{ kind, label, itemId, cartridgeItem, performedInput, note? }`
// grouped by the caller into `{ kind, label, items }` blocks — the builder
// itself only assembles/derives, it never re-groups.

function buildItem(kind, { itemId, cartridgeItem, performedInput, note }) {
    const prescribed = buildPrescribed(kind, cartridgeItem)
    const { performed, substituted } = buildPerformed(kind, prescribed, performedInput)
    const item = { itemId, prescribed, performed, substituted }
    if (isNonEmptyString(note)) item.note = note.trim()
    return item
}

function buildBlocks(blockInputs) {
    return (blockInputs || []).map(block => ({
        kind: block.kind,
        label: block.label,
        items: (block.items || []).map(item => buildItem(block.kind, item)),
    }))
}

/**
 * buildCartridgeSessionPayload — assembles a full, `payloadVersion: 2`
 * cartridge session payload from caller-supplied identity/day/item input.
 *
 * `completeness` is computed internally (never trusted from input) via
 * cartridgeCompleteness.js, using the exact same blocks this function builds.
 */
export function buildCartridgeSessionPayload(input) {
    const dayType = input.dayType
    const blocks = dayType === 'training' ? buildBlocks(input.blocks) : []

    const payload = {
        payloadVersion: PAYLOAD_VERSION,
        sessionKind: SESSION_KIND,
        sessionId: input.sessionId,
        date: input.date,
        completedAt: input.completedAt,
        sessionCategory: input.sessionCategory,
        cartridgeId: input.cartridgeId,
        cartridgeVersion: input.cartridgeVersion,
        cartridgeSchemaVersion: input.cartridgeSchemaVersion,
        dayTemplateKey: input.dayTemplateKey,
        dayTemplateLabel: input.dayTemplateLabel,
        dayType,
        phaseId: input.phaseId ?? null,
        blocks,
    }

    if (isNonEmptyString(input.startedAt)) payload.startedAt = input.startedAt
    if (isNonEmptyString(input.notes)) payload.notes = input.notes

    if (dayType === 'training' || dayType === 'custom') {
        payload.sessionActivities = Array.isArray(input.sessionActivities)
            ? [...new Set(input.sessionActivities)]
            : []
        if (payload.sessionActivities.includes('other') && isNonEmptyString(input.otherActivity)) {
            payload.otherActivity = input.otherActivity.trim()
        }
    }

    if (dayType === 'training') {
        // computeCartridgeCompleteness (cartridgeCompleteness.js) is the single
        // source of truth — imported lazily via the caller-supplied function to
        // avoid a hard cross-module dependency cycle risk; callers pass it in.
        if (typeof input.computeCompleteness === 'function') {
            const completeness = input.computeCompleteness(blocks, dayType)
            if (completeness !== null && completeness !== undefined) payload.completeness = completeness
        }
    }

    if (dayType === 'custom') {
        if (isFiniteNumber(toFiniteIntegerOrUndefined(input.sessionDuration))) {
            payload.sessionDuration = toFiniteIntegerOrUndefined(input.sessionDuration)
        }
        if (isNonEmptyString(input.customContent)) payload.customContent = input.customContent
    }

    return payload
}

// ─── Reader tolerance (§1, §10) ─────────────────────────────────────────────
//
// A lenient, version-agnostic shape check used by READERS (categoryOf,
// findLastPerformance, phase-unlock exclusion, backup/rollback) so they can
// recognize "this is a cartridge row" — of EITHER version — without crashing,
// without applying v2's strict field rules to a v1 row, and without ever
// treating it as write-acceptable. This is deliberately much looser than
// validateCartridgeSessionPayload.

export function isReadableCartridgeRow(row) {
    if (!isPlainObject(row)) return false
    if (row.sessionKind !== SESSION_KIND) return false
    return row.payloadVersion === 1 || row.payloadVersion === 2
}

export function isHistoricalV1Row(row) {
    return isReadableCartridgeRow(row) && row.payloadVersion === 1
}

// ─── Validator ───────────────────────────────────────────────────────────────
//
// Pure, returns string[] errors (empty === valid) — same convention as
// validateCartridge.js. Always requires payloadVersion === 2: a `1` is
// rejected as a write target exactly like any other malformed input (schema
// §10's "never written again" rule).

function validateSetEntry(entry, label, { allowEffort }) {
    const errors = []
    if (!isPlainObject(entry)) {
        errors.push(`${label}: must be an object`)
        return errors
    }
    const allowedKeys = allowEffort ? PERFORMED_SET_KEYS : PERFORMED_PAIR_SET_KEYS
    for (const key of Object.keys(entry)) {
        if (!allowedKeys.has(key)) errors.push(`${label}: unknown key "${key}"`)
    }
    if ('kg' in entry && !(isFiniteNumber(entry.kg) && entry.kg >= 0)) {
        errors.push(`${label}.kg must be a finite number >= 0`)
    }
    if ('reps' in entry && !(Number.isInteger(entry.reps) && entry.reps >= 0)) {
        errors.push(`${label}.reps must be a finite non-negative integer`)
    }
    if (allowEffort) {
        if ('rpe' in entry && !(isFiniteNumber(entry.rpe) && entry.rpe >= 0 && entry.rpe <= 10)) {
            errors.push(`${label}.rpe must be a finite number between 0 and 10`)
        }
        if ('rir' in entry && !(Number.isInteger(entry.rir) && entry.rir >= 0)) {
            errors.push(`${label}.rir must be a finite non-negative integer`)
        }
    }
    return errors
}

function validatePrescribed(kind, prescribed, label) {
    const errors = []
    if (!isPlainObject(prescribed)) {
        errors.push(`${label}.prescribed must be an object`)
        return errors
    }
    const allowedKeys = PRESCRIBED_ALLOWED_KEYS[kind] || PRESCRIBED_ALLOWED_KEYS.common
    for (const key of Object.keys(prescribed)) {
        if (!allowedKeys.has(key)) errors.push(`${label}.prescribed: unknown key "${key}" for kind "${kind}"`)
    }
    if (!isNonEmptyString(prescribed.name)) errors.push(`${label}.prescribed.name is required`)
    return errors
}

function validatePerformed(kind, performed, label) {
    const errors = []
    if (!isPlainObject(performed)) {
        errors.push(`${label}.performed must be an object`)
        return errors
    }

    if (LOADED_KINDS.has(kind)) {
        for (const key of Object.keys(performed)) {
            if (!PERFORMED_ALLOWED_KEYS_LOADED.has(key)) errors.push(`${label}.performed: unknown key "${key}"`)
        }
        if (!Array.isArray(performed.sets)) {
            errors.push(`${label}.performed.sets must be an array`)
        } else {
            performed.sets.forEach((entry, i) => {
                errors.push(...validateSetEntry(entry, `${label}.performed.sets[${i}]`, { allowEffort: true }))
            })
        }
        if (performed.pair !== undefined) {
            if (!isPlainObject(performed.pair)) {
                errors.push(`${label}.performed.pair must be an object`)
            } else {
                for (const key of Object.keys(performed.pair)) {
                    if (!PERFORMED_PAIR_KEYS.has(key)) errors.push(`${label}.performed.pair: unknown key "${key}"`)
                }
                if (!Array.isArray(performed.pair.sets)) {
                    errors.push(`${label}.performed.pair.sets must be an array`)
                } else {
                    performed.pair.sets.forEach((entry, i) => {
                        errors.push(...validateSetEntry(entry, `${label}.performed.pair.sets[${i}]`, { allowEffort: false }))
                    })
                }
            }
        }
    } else {
        // mobility / cooldown / conditioning — {} or { name } only.
        for (const key of Object.keys(performed)) {
            if (!PERFORMED_ALLOWED_KEYS_HOLD_OR_CONDITIONING.has(key)) {
                errors.push(`${label}.performed: unknown key "${key}" for kind "${kind}" (no completion tracking permitted)`)
            }
        }
    }

    return errors
}

function validateSubstitutionInvariant(kind, prescribed, performed, substituted, label) {
    const errors = []
    if (typeof substituted !== 'boolean') {
        errors.push(`${label}.substituted must be a boolean`)
        return errors
    }
    const performedName = isPlainObject(performed) ? performed.name : undefined
    if (substituted) {
        if (!isNonEmptyString(performedName) || performedName === prescribed?.name) {
            errors.push(`${label}: substituted=true requires performed.name to be a non-empty string different from prescribed.name`)
        }
    } else if (performedName !== undefined) {
        errors.push(`${label}: substituted=false requires performed.name to be absent`)
    }
    return errors
}

function validateItem(kind, item, label) {
    const errors = []
    if (!isPlainObject(item)) {
        errors.push(`${label} must be an object`)
        return errors
    }
    const allowedKeys = new Set(['itemId', 'prescribed', 'performed', 'substituted', 'note'])
    for (const key of Object.keys(item)) {
        if (!allowedKeys.has(key)) errors.push(`${label}: unknown key "${key}"`)
    }
    if (!isNonEmptyString(item.itemId)) errors.push(`${label}.itemId is required`)
    errors.push(...validatePrescribed(kind, item.prescribed, label))
    errors.push(...validatePerformed(kind, item.performed, label))
    errors.push(...validateSubstitutionInvariant(kind, item.prescribed, item.performed, item.substituted, label))
    if (item.note !== undefined && !isNonEmptyString(item.note)) errors.push(`${label}.note must be a non-empty string when present`)
    return errors
}

function validateBlocks(blocks) {
    const errors = []
    if (!Array.isArray(blocks)) {
        errors.push('blocks must be an array')
        return errors
    }
    blocks.forEach((block, bi) => {
        const blockLabel = `blocks[${bi}]`
        if (!isPlainObject(block)) {
            errors.push(`${blockLabel} must be an object`)
            return
        }
        if (!BLOCK_KINDS.includes(block.kind)) errors.push(`${blockLabel}.kind is unknown: "${block.kind}"`)
        if (!Array.isArray(block.items) || block.items.length === 0) {
            errors.push(`${blockLabel}.items must be a non-empty array`)
            return
        }
        block.items.forEach((item, ii) => {
            errors.push(...validateItem(block.kind, item, `${blockLabel}.items[${ii}]`))
        })
    })
    return errors
}

function validateOtherActivity(payload) {
    const errors = []
    const activities = Array.isArray(payload.sessionActivities) ? payload.sessionActivities : []
    const hasOther = activities.includes('other')
    if ('otherActivity' in payload) {
        if (!hasOther) errors.push('otherActivity must not be present unless sessionActivities includes "other"')
        const v = payload.otherActivity
        if (typeof v !== 'string' || /[\r\n]/.test(v) || v.trim().length === 0 || v.trim().length > 120 || v !== v.trim()) {
            errors.push('otherActivity must be a trimmed single-line string, 1-120 characters')
        }
    } else if (hasOther) {
        // Absent otherActivity while 'other' is selected is only valid if the
        // field was left blank by the user — nothing to enforce here beyond
        // "not required", per schema §4 ("Absent... or the field was left blank").
    }
    return errors
}

function validateSessionActivities(payload) {
    const errors = []
    if (!('sessionActivities' in payload)) return errors
    const activities = payload.sessionActivities
    if (!Array.isArray(activities)) {
        errors.push('sessionActivities must be an array')
        return errors
    }
    const seen = new Set()
    for (const id of activities) {
        if (!SESSION_ACTIVITIES_SET.has(id)) errors.push(`sessionActivities: unknown id "${id}"`)
        if (seen.has(id)) errors.push(`sessionActivities: duplicate id "${id}"`)
        seen.add(id)
    }
    return errors
}

export function validateCartridgeSessionPayload(payload) {
    const errors = []
    if (!isPlainObject(payload)) return ['payload must be an object']

    for (const key of Object.keys(payload)) {
        if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) errors.push(`unknown top-level key "${key}"`)
    }
    for (const key of FORBIDDEN_LEGACY_KEYS) {
        if (key in payload) errors.push(`legacy-only key "${key}" must never appear on a cartridge payload`)
    }
    for (const key of ALWAYS_REQUIRED_TOP_LEVEL_KEYS) {
        if (!(key in payload)) errors.push(`"${key}" is required`)
    }

    if (payload.payloadVersion !== PAYLOAD_VERSION) {
        errors.push(`payloadVersion must be exactly ${PAYLOAD_VERSION} for a new write (got ${JSON.stringify(payload.payloadVersion)})`)
    }
    if (payload.sessionKind !== SESSION_KIND) errors.push(`sessionKind must be "${SESSION_KIND}"`)
    if (!isNonEmptyString(payload.sessionId)) errors.push('sessionId is required')
    if (!isNonEmptyString(payload.date)) errors.push('date is required')
    if (!isNonEmptyString(payload.completedAt)) errors.push('completedAt is required')
    if (!isNonEmptyString(payload.sessionCategory)) errors.push('sessionCategory is required')
    if (!isNonEmptyString(payload.cartridgeId)) errors.push('cartridgeId is required')
    if (!isNonEmptyString(payload.cartridgeVersion)) errors.push('cartridgeVersion is required')
    if (!(Number.isInteger(payload.cartridgeSchemaVersion) && payload.cartridgeSchemaVersion >= 1)) {
        errors.push('cartridgeSchemaVersion must be a finite positive integer')
    }
    if (!isNonEmptyString(payload.dayTemplateKey)) errors.push('dayTemplateKey is required')
    if (!isNonEmptyString(payload.dayTemplateLabel)) errors.push('dayTemplateLabel is required')
    if (!DAY_TYPES.includes(payload.dayType)) errors.push(`dayType must be one of ${DAY_TYPES.join('/')}`)
    if (!('phaseId' in payload) || (payload.phaseId !== null && typeof payload.phaseId !== 'string')) {
        errors.push('phaseId must be a string or null')
    }
    if (payload.startedAt !== undefined && !isNonEmptyString(payload.startedAt)) {
        errors.push('startedAt must be a non-empty string when present')
    }
    if (payload.notes !== undefined && typeof payload.notes !== 'string') {
        errors.push('notes must be a string when present')
    }

    const dayType = payload.dayType

    // completeness — training-only, exact numeric range.
    if ('completeness' in payload) {
        if (dayType !== 'training') errors.push('completeness may only be present on a training day')
        if (!(isFiniteNumber(payload.completeness) && payload.completeness >= 0 && payload.completeness <= 100)) {
            errors.push('completeness must be a finite number between 0 and 100')
        }
    }

    // sessionActivities/otherActivity — required on training/custom, forbidden elsewhere.
    if (dayType === 'training' || dayType === 'custom') {
        if (!('sessionActivities' in payload)) errors.push('sessionActivities is required on a training/custom day')
    } else if ('sessionActivities' in payload) {
        errors.push(`sessionActivities must not be present on a ${dayType} day`)
    }
    errors.push(...validateSessionActivities(payload))
    errors.push(...validateOtherActivity(payload))

    // sessionDuration/customContent — custom-only.
    if ('sessionDuration' in payload) {
        if (dayType !== 'custom') errors.push('sessionDuration may only be present on a custom day')
        if (!(Number.isInteger(payload.sessionDuration) && payload.sessionDuration >= 0)) {
            errors.push('sessionDuration must be a finite non-negative integer (minutes)')
        }
    }
    if ('customContent' in payload) {
        if (dayType !== 'custom') errors.push('customContent may only be present on a custom day')
        if (typeof payload.customContent !== 'string') errors.push('customContent must be a string')
    }

    // blocks — training carries real blocks; rest/recovery/custom are always [].
    if (dayType === 'training') {
        errors.push(...validateBlocks(payload.blocks))
    } else if (Array.isArray(payload.blocks)) {
        if (payload.blocks.length > 0) errors.push(`blocks must be empty on a ${dayType} day`)
    } else {
        errors.push('blocks must be an array')
    }

    return errors
}
