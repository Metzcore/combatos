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
 *
 * Invalid-input discipline (corrective-pass finding): nothing in this module
 * silently repairs or silently drops a PRESENT invalid value. A fractional
 * reps/rir/sessionDuration, a non-numeric kg, or a duplicate/unknown
 * sessionActivities id is preserved verbatim into the built payload and
 * left for `validateCartridgeSessionPayload` to reject — never truncated,
 * coerced-to-absent, or silently deduplicated by the builder. Only a
 * genuinely UNSET value (undefined/null/empty string — "not entered") is
 * ever omitted.
 */
import { computeCartridgeCompleteness } from './cartridgeCompleteness.js'

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

const BLOCK_ALLOWED_KEYS = new Set(['kind', 'label', 'items'])

// `prescribed.pair` (PAP) — PROGRAM-CARTRIDGE-SPEC.md: `{ name, sets, reps, note? }`.
const PRESCRIBED_PAIR_ALLOWED_KEYS = new Set(['name', 'sets', 'reps', 'note'])

// `prescribed.prescription` — PROGRAM-CARTRIDGE-SPEC.md §"prescription": a
// free object over exactly this documented vocabulary (percent/rpe/rir/
// addedLoad/note, seen combined freely across the three shipped
// cartridges) — closed here per the frozen contract; no new field invented.
const PRESCRIPTION_ALLOWED_KEYS = new Set(['percent', 'rpe', 'rir', 'addedLoad', 'note'])

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

/**
 * coerceNumericField — best-effort numeric-string coercion for a raw UI
 * input value, WITHOUT ever silently repairing or silently dropping a
 * present-but-invalid value.
 *
 * - undefined/null/'' → undefined (genuinely "not entered" — legitimately
 *   omittable, not an error).
 * - a real number → returned exactly as-is, including a fraction, NaN, or
 *   Infinity — never rounded/truncated into validity. The validator is the
 *   only place an out-of-range or non-integer value is rejected.
 * - a numeric-looking string → coerced to a Number (normal text-input
 *   handling: '100' -> 100, '4.5' -> 4.5 — still a fraction, still left for
 *   the validator to judge against the field's own integer/range rule).
 * - a non-numeric string or any other type → returned VERBATIM, never
 *   coerced to undefined — so a typo like 'abc' survives into the payload
 *   as an invalid `kg`/`reps`/etc. value instead of silently vanishing.
 */
function coerceNumericField(raw) {
    if (raw === undefined || raw === null || raw === '') return undefined
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string') {
        const n = Number(raw)
        return Number.isFinite(n) ? n : raw
    }
    return raw
}

// ─── normalizeSets — the RPE/RIR-only preservation fix ─────────────────────
//
// The first attempt's normalizeSets dropped an entry whenever kg/reps were
// both absent, discarding the entry BEFORE rpe/rir were ever read — an
// effort-only set (`{ rpe: 9 }`) vanished from the payload entirely. Here an
// entry survives if ANY of kg/reps/rpe/rir is present; only a truly empty
// entry (nothing at all) is dropped. Pair sets never carry rpe/rir (schema
// §5), so `includeEffort: false` strips those keys even if raw input had them.
//
// Numeric coercion never repairs invalid input (see coerceNumericField):
// a fractional reps/rir or a non-numeric kg survives into the entry exactly
// as typed, so `validateCartridgeSessionPayload` — not this function — is
// what rejects it.

export function normalizeSets(rawSets, { includeEffort = true } = {}) {
    if (!Array.isArray(rawSets)) return []
    const out = []
    for (const raw of rawSets) {
        if (!isPlainObject(raw)) continue
        const entry = {}
        const kg = coerceNumericField(raw.kg)
        const reps = coerceNumericField(raw.reps)
        if (kg !== undefined) entry.kg = kg
        if (reps !== undefined) entry.reps = reps
        if (includeEffort) {
            const rpe = coerceNumericField(raw.rpe)
            const rir = coerceNumericField(raw.rir)
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
 * `completeness` is NON-INJECTABLE: it is always computed internally via
 * `computeCartridgeCompleteness` (imported directly, not caller-suppliable)
 * over the exact same `blocks` this function builds — no caller can omit,
 * override, or replace the algorithm.
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
        // Preserved VERBATIM — never Set-deduplicated or filtered here. A
        // duplicate or unknown id must survive into the payload so
        // validateCartridgeSessionPayload can reject it; silently cleaning
        // it up in the builder would hide invalid caller input.
        payload.sessionActivities = Array.isArray(input.sessionActivities) ? [...input.sessionActivities] : []
        if (payload.sessionActivities.includes('other') && isNonEmptyString(input.otherActivity)) {
            payload.otherActivity = input.otherActivity.trim()
        }
    }

    if (dayType === 'training') {
        const completeness = computeCartridgeCompleteness(blocks, dayType)
        if (completeness !== null) payload.completeness = completeness
    }

    if (dayType === 'custom') {
        // coerceNumericField never truncates a fractional duration into a
        // valid integer, and never silently drops a present-but-invalid
        // value — see the module-level note and finding #5.
        const sessionDuration = coerceNumericField(input.sessionDuration)
        if (sessionDuration !== undefined) payload.sessionDuration = sessionDuration
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

function validatePrescription(prescription, label) {
    const errors = []
    if (!isPlainObject(prescription)) {
        errors.push(`${label}.prescription must be an object`)
        return errors
    }
    if (Object.keys(prescription).length === 0) errors.push(`${label}.prescription must not be an empty object`)
    for (const key of Object.keys(prescription)) {
        if (!PRESCRIPTION_ALLOWED_KEYS.has(key)) errors.push(`${label}.prescription: unknown key "${key}"`)
    }
    if ('percent' in prescription && !(isFiniteNumber(prescription.percent) && prescription.percent >= 0)) {
        errors.push(`${label}.prescription.percent must be a finite number >= 0`)
    }
    if ('rpe' in prescription && !(isFiniteNumber(prescription.rpe) && prescription.rpe >= 0 && prescription.rpe <= 10)) {
        errors.push(`${label}.prescription.rpe must be a finite number between 0 and 10`)
    }
    if ('rir' in prescription && !(Number.isInteger(prescription.rir) && prescription.rir >= 0)) {
        errors.push(`${label}.prescription.rir must be a finite non-negative integer`)
    }
    if ('addedLoad' in prescription && !isNonEmptyString(prescription.addedLoad)) {
        errors.push(`${label}.prescription.addedLoad must be a non-empty string`)
    }
    if ('note' in prescription && typeof prescription.note !== 'string') {
        errors.push(`${label}.prescription.note must be a string`)
    }
    return errors
}

function validatePrescribedPair(pair, label) {
    const errors = []
    if (!isPlainObject(pair)) {
        errors.push(`${label}.pair must be an object`)
        return errors
    }
    for (const key of Object.keys(pair)) {
        if (!PRESCRIBED_PAIR_ALLOWED_KEYS.has(key)) errors.push(`${label}.pair: unknown key "${key}"`)
    }
    if (!isNonEmptyString(pair.name)) errors.push(`${label}.pair.name is required`)
    if ('sets' in pair && !(Number.isInteger(pair.sets) && pair.sets >= 1)) {
        errors.push(`${label}.pair.sets must be a finite positive integer`)
    }
    if ('reps' in pair && typeof pair.reps !== 'string' && typeof pair.reps !== 'number') {
        errors.push(`${label}.pair.reps must be a string or number`)
    }
    if ('note' in pair && typeof pair.note !== 'string') errors.push(`${label}.pair.note must be a string`)
    return errors
}

function validatePerRound(perRound, label) {
    const errors = []
    if (!Array.isArray(perRound)) {
        errors.push(`${label}.perRound must be an array`)
        return errors
    }
    perRound.forEach((entry, i) => {
        if (typeof entry !== 'string') errors.push(`${label}.perRound[${i}] must be a string`)
    })
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

    if (LOADED_KINDS.has(kind)) {
        if ('prescription' in prescribed) errors.push(...validatePrescription(prescribed.prescription, `${label}.prescribed`))
        if ('pair' in prescribed && prescribed.pair !== null) errors.push(...validatePrescribedPair(prescribed.pair, `${label}.prescribed`))
        if ('superset' in prescribed && prescribed.superset !== null && !isNonEmptyString(prescribed.superset)) {
            errors.push(`${label}.prescribed.superset must be null or a non-empty string`)
        }
        if ('target' in prescribed && typeof prescribed.target !== 'string') {
            errors.push(`${label}.prescribed.target must be a string`)
        }
        if (!('sets' in prescribed) || !(Number.isInteger(prescribed.sets) && prescribed.sets >= 1)) {
            errors.push(`${label}.prescribed.sets must be a finite positive integer`)
        }
        if (!('reps' in prescribed) || (typeof prescribed.reps !== 'string' && typeof prescribed.reps !== 'number')) {
            errors.push(`${label}.prescribed.reps must be a string or number`)
        }
    } else if (kind === CONDITIONING_KIND) {
        if (!('rounds' in prescribed) || !(Number.isInteger(prescribed.rounds) && prescribed.rounds >= 1)) {
            errors.push(`${label}.prescribed.rounds must be a finite positive integer`)
        }
        if ('roundLength' in prescribed && typeof prescribed.roundLength !== 'string') {
            errors.push(`${label}.prescribed.roundLength must be a string`)
        }
        if ('rest' in prescribed && typeof prescribed.rest !== 'string') {
            errors.push(`${label}.prescribed.rest must be a string`)
        }
        if ('perRound' in prescribed) errors.push(...validatePerRound(prescribed.perRound, `${label}.prescribed`))
    } else if (HOLD_KINDS.has(kind)) {
        if (!('dose' in prescribed) || !isNonEmptyString(prescribed.dose)) {
            errors.push(`${label}.prescribed.dose is required`)
        }
    }

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
        for (const key of Object.keys(block)) {
            if (!BLOCK_ALLOWED_KEYS.has(key)) errors.push(`${blockLabel}: unknown key "${key}"`)
        }
        if (!BLOCK_KINDS.includes(block.kind)) errors.push(`${blockLabel}.kind is unknown: "${block.kind}"`)
        if (typeof block.label !== 'string' || block.label.trim().length === 0) {
            errors.push(`${blockLabel}.label is required`)
        }
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

    // completeness — NON-INJECTABLE: independently recomputed here (finding
    // #3), never merely range-checked. A training payload with measurable
    // strength/core/PAP units must carry EXACTLY the recomputed value;
    // zero measurable units must carry no completeness at all; any other
    // dayType must never carry one. A caller cannot omit, inflate, deflate,
    // or otherwise falsify this figure without the validator catching it.
    if (dayType === 'training') {
        if (!(isFiniteNumber(payload.completeness) || !('completeness' in payload))) {
            // present but not even a finite number — report the type error
            // directly rather than letting the recompute-comparison below
            // produce a confusing "expected X, got NaN"-style message.
            errors.push('completeness must be a finite number between 0 and 100')
        } else {
            const recomputed = Array.isArray(payload.blocks)
                ? computeCartridgeCompleteness(payload.blocks, dayType)
                : undefined // blocks itself is malformed — validateBlocks already reports that; skip the cross-check
            if (recomputed !== undefined) {
                if (recomputed === null) {
                    if ('completeness' in payload) {
                        errors.push('completeness must be absent — this training day has zero measurable strength/core/PAP units')
                    }
                } else if (!('completeness' in payload)) {
                    errors.push(`completeness is required for this training day and must equal the recomputed value (expected ${recomputed})`)
                } else if (payload.completeness !== recomputed) {
                    errors.push(`completeness must exactly equal the recomputed value (expected ${recomputed}, got ${JSON.stringify(payload.completeness)})`)
                }
            }
        }
    } else if ('completeness' in payload) {
        errors.push('completeness may only be present on a training day')
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
