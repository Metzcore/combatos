/**
 * utils/workoutDraftState.js — A6.5 pure draft logic: no Dexie, no React.
 *
 * Everything here is a pure function over plain data so it can be unit
 * tested directly (workoutDraftState.test.js) without a database or a
 * component tree. db/workoutDrafts.js and the hook consume this module for
 * row shape, meaningful-input detection, hydration validation, and identity
 * conflict detection.
 */

export const DRAFT_SCHEMA_VERSION = 1
export const DRAFT_SLOT = 'active'

const KNOWN_IDENTITY_KINDS = new Set(['legacy-playbook', 'cartridge'])
const KNOWN_SNAPSHOT_KINDS = new Set(['legacy-workout-v1', 'cartridge-day-v1'])
const KNOWN_STATE_KINDS = new Set(['legacy-hud-v1', 'cartridge-workout-v1'])

// ─── Small predicates ──────────────────────────────────────────────────────

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value) {
    return value !== undefined && value !== null && value !== ''
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim() !== ''
}

function hasTruthyValue(obj) {
    return isPlainObject(obj) && Object.values(obj).some(Boolean)
}

// ─── Identity builders ─────────────────────────────────────────────────────

/** Legacy (playbook) identity: cartridge fields null, per plan v2 §1. */
export function buildLegacyIdentity({ day, phase, hipScore }) {
    return {
        kind: 'legacy-playbook',
        cartridgeId: null,
        cartridgeVersion: null,
        cartridgeSchemaVersion: null,
        dayTemplateKey: `legacy-day:${day}`,
        phaseId: `legacy-phase:${phase}`,
        hipScore,
    }
}

/** Cartridge identity — reserved for A7; exercised only by conflict-matrix tests today. */
export function buildCartridgeIdentity({
    cartridgeId, cartridgeVersion, cartridgeSchemaVersion, day, phaseId = null, hipScore = null,
}) {
    return {
        kind: 'cartridge',
        cartridgeId,
        cartridgeVersion,
        cartridgeSchemaVersion,
        dayTemplateKey: `day:${day}`,
        phaseId,
        hipScore,
    }
}

const LEGACY_DAY_PATTERN = /^legacy-day:(\d+)$/
const LEGACY_PHASE_PATTERN = /^legacy-phase:(\d+)$/

/** Inverse of buildLegacyIdentity's dayTemplateKey/phaseId encoding, for Continue/resume. */
export function parseLegacyDay(dayTemplateKey) {
    const match = LEGACY_DAY_PATTERN.exec(dayTemplateKey || '')
    return match ? Number(match[1]) : null
}

export function parseLegacyPhase(phaseId) {
    const match = LEGACY_PHASE_PATTERN.exec(phaseId || '')
    return match ? Number(match[1]) : null
}

// ─── Definition snapshots ──────────────────────────────────────────────────
// Freezes the resolved workout/day so a later playbook or cartridge update
// cannot silently put a live draft's values under changed exercises.

export function buildLegacyDefinitionSnapshot(workout) {
    return {
        kind: 'legacy-workout-v1',
        value: {
            isFightGymDay: Boolean(workout?.isFightGymDay),
            dailyFocus: workout?.dailyFocus ?? null,
            mobSlots: workout?.mobSlots ?? [],
            strSlots: workout?.strSlots ?? [],
            bagSlot: workout?.bagSlot ?? null,
            clrSlots: workout?.clrSlots ?? [],
        },
    }
}

export function buildCartridgeDefinitionSnapshot(day) {
    return {
        kind: 'cartridge-day-v1',
        value: day ?? {},
    }
}

// ─── State field inventories ───────────────────────────────────────────────

export const LEGACY_STATE_FIELD_KEYS = [
    'mobChecked', 'clrChecked', 'strSets', 'coreSets',
    'bagRounds', 'bagCourse', 'bagModules', 'bagWorkouts',
    'notes', 'gymSessionType', 'altRows', 'altDuration',
    'hudScrollY', 'bagBlockOpen', 'coreBlockOpen', 'mobBlockOpen', 'strBlockOpen', 'clrBlockOpen',
]

export const CARTRIDGE_STATE_FIELD_KEYS = [
    'itemStateById', 'substitutions', 'itemNotes', 'notes',
    'customSessionContent', 'conditioningProgress', 'blockOpen', 'scrollY',
]

/** Picks a plain fields object off a live-state source by key, filling gaps with `fallback`. */
export function pickFields(source, keys, fallback = {}) {
    const out = {}
    for (const key of keys) {
        out[key] = key in source ? source[key] : fallback[key]
    }
    return out
}

// ─── Meaningful-input predicates (plan v2 §4) ──────────────────────────────
// Identity, selection (day/phase/hip/session-type) and UI-only fields
// (scroll, collapse) never make a draft meaningful by themselves — but once
// meaningful content exists, ALL fields (including those) are saved with it.

export function isLegacyStateMeaningful(fields) {
    if (!isPlainObject(fields)) return false

    if (hasTruthyValue(fields.mobChecked)) return true
    if (hasTruthyValue(fields.clrChecked)) return true

    if (isPlainObject(fields.strSets)) {
        for (const entry of Object.values(fields.strSets)) {
            if (!isPlainObject(entry)) continue
            if (nonEmpty(entry.kg) || nonEmpty(entry.reps) || nonEmpty(entry.papReps)) return true
        }
    }

    if (isPlainObject(fields.coreSets)) {
        for (const entry of Object.values(fields.coreSets)) {
            if (!isPlainObject(entry)) continue
            if (nonEmpty(entry.ex) || nonEmpty(entry.sets) || nonEmpty(entry.reps)) return true
        }
    }

    if (nonEmpty(fields.bagRounds) || nonEmpty(fields.bagCourse)
        || nonEmpty(fields.bagModules) || nonEmpty(fields.bagWorkouts)) return true

    if (nonBlank(fields.notes)) return true

    if (Array.isArray(fields.altRows)) {
        for (const row of fields.altRows) {
            if (!isPlainObject(row)) continue
            if (nonEmpty(row.name) || nonEmpty(row.v1) || nonEmpty(row.v2) || nonEmpty(row.v3)) return true
        }
    }

    if (nonEmpty(fields.altDuration)) return true

    return false
}

export function isCartridgeStateMeaningful(fields) {
    if (!isPlainObject(fields)) return false

    if (isPlainObject(fields.itemStateById)) {
        for (const entry of Object.values(fields.itemStateById)) {
            if (!isPlainObject(entry)) continue
            if (entry.checked) return true
            if (nonEmpty(entry.value) || nonEmpty(entry.kg) || nonEmpty(entry.reps) || nonEmpty(entry.sets)) return true
        }
    }

    if (isPlainObject(fields.substitutions) && Object.keys(fields.substitutions).length > 0) return true
    if (isPlainObject(fields.itemNotes) && Object.values(fields.itemNotes).some(nonBlank)) return true
    if (nonBlank(fields.notes)) return true
    if (nonBlank(fields.customSessionContent)) return true

    return false
}

export function isStateMeaningful(stateKind, fields) {
    if (stateKind === 'cartridge-workout-v1') return isCartridgeStateMeaningful(fields)
    return isLegacyStateMeaningful(fields)
}

// ─── Row assembly ───────────────────────────────────────────────────────────

export function buildDraftRow({ ownerUserId, workoutIdentity, definitionSnapshot, state, createdAt, updatedAt }) {
    const now = updatedAt || new Date().toISOString()
    return {
        ownerUserId,
        slot: DRAFT_SLOT,
        draftSchemaVersion: DRAFT_SCHEMA_VERSION,
        createdAt: createdAt || now,
        updatedAt: now,
        workoutIdentity,
        definitionSnapshot,
        state,
    }
}

// ─── Hydration validation (plan v2 §5, §10) ────────────────────────────────

function isStructurallySound(row) {
    if (!isPlainObject(row)) return false
    if (typeof row.ownerUserId !== 'string' || !row.ownerUserId) return false
    if (row.slot !== DRAFT_SLOT) return false
    if (typeof row.draftSchemaVersion !== 'number') return false
    if (typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string') return false
    if (!isPlainObject(row.workoutIdentity) || typeof row.workoutIdentity.kind !== 'string') return false
    if (typeof row.workoutIdentity.dayTemplateKey !== 'string') return false
    if (!isPlainObject(row.definitionSnapshot) || typeof row.definitionSnapshot.kind !== 'string') return false
    if (!isPlainObject(row.definitionSnapshot.value)) return false
    if (!isPlainObject(row.state) || typeof row.state.kind !== 'string') return false
    if (!isPlainObject(row.state.fields)) return false
    return true
}

// A row's three discriminators (workoutIdentity.kind, definitionSnapshot.kind,
// state.kind) must each be individually recognized AND form one of these
// coherent combinations — this app never produces a mixed triple, so one
// isn't a "future format", it's a broken invariant (→ corrupt).
const COHERENT_LEGACY_TRIPLE = { identity: 'legacy-playbook', snapshot: 'legacy-workout-v1', state: 'legacy-hud-v1' }
const COHERENT_CARTRIDGE_TRIPLE = { identity: 'cartridge', snapshot: 'cartridge-day-v1', state: 'cartridge-workout-v1' }

function matchesTriple(row, triple) {
    return row.workoutIdentity.kind === triple.identity &&
        row.definitionSnapshot.kind === triple.snapshot &&
        row.state.kind === triple.state
}

// The legacy HUD calls .filter()/.reduce()/.map() on these three fields
// directly (MobilityBlock/StrengthBlock/CooldownBlock, completeness()), and
// each block component then dereferences properties directly on every
// entry (slot.exercise, slot.duration, …) — a null/non-object entry (e.g.
// `[null]`) crashes there just as surely as a non-array field does.
// dailyFocus is rendered directly as a JSX child (`{workout.dailyFocus}`)
// — an object value there is a React crash ("objects are not valid as a
// React child"), not just bad data — so it must be null or a string.
function isRenderSafeLegacySnapshot(value) {
    if (!Array.isArray(value.mobSlots) || !Array.isArray(value.strSlots) || !Array.isArray(value.clrSlots)) {
        return false
    }
    const allEntries = [...value.mobSlots, ...value.strSlots, ...value.clrSlots]
    if (!allEntries.every(isPlainObject)) return false
    if (value.dailyFocus !== null && typeof value.dailyFocus !== 'string') return false
    return true
}

// Legacy day/phase/hip-score must not just be well-typed strings/numbers —
// they must actually PARSE (dayTemplateKey/phaseId matching the
// legacy-day:{n}/legacy-phase:{n} encoding) and fall within the ranges this
// app's HUD actually offers (DAY_LABELS: 7 days; 3 phases; HIP_LABELS: 5
// scores). An out-of-range or unparseable value would resume as a
// <select> with nothing selected, or feed usePlaybook() a day/phase/hip
// combination it was never designed to look up.
const LEGACY_DAY_RANGE = [1, 7]
const LEGACY_PHASE_RANGE = [1, 3]
const LEGACY_HIP_SCORE_RANGE = [1, 5]

function isIntegerInRange(value, [min, max]) {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function isValidLegacyIdentity(identity) {
    return (
        isIntegerInRange(parseLegacyDay(identity.dayTemplateKey), LEGACY_DAY_RANGE) &&
        isIntegerInRange(parseLegacyPhase(identity.phaseId), LEGACY_PHASE_RANGE) &&
        isIntegerInRange(identity.hipScore, LEGACY_HIP_SCORE_RANGE)
    )
}

// resumeDraft() restores these onto DBProvider's setters directly
// (setMobChecked(f.mobChecked), altRows.map(...) in HUD's handleLog, …) —
// the wrong container type there crashes exactly like a malformed
// definitionSnapshot does.
function isRenderSafeLegacyState(fields) {
    return (
        isPlainObject(fields.mobChecked) &&
        isPlainObject(fields.clrChecked) &&
        isPlainObject(fields.strSets) &&
        isPlainObject(fields.coreSets) &&
        Array.isArray(fields.altRows)
    )
}

/**
 * Returns { ok: true, row } for a hydratable row, or { ok: false, reason }
 * where reason is one of:
 *   'corrupt'            — malformed, render-unsafe (bad container types,
 *                           null slot entries, an object-valued display
 *                           field, an unparseable/out-of-range legacy
 *                           identity), or an internally incoherent
 *                           discriminator triple; fail closed, never
 *                           hydrate/overwrite/show contents.
 *   'owner-mismatch'      — never hydrate, expose, rewrite or merge.
 *   'unsupported-schema'  — readable but a draftSchemaVersion this build doesn't know;
 *                           preserve, show update-required state with Discard.
 *   'unsupported-state'   — readable, individually-recognized, and internally
 *                           coherent, but a combination this app surface
 *                           doesn't support hydrating yet (a well-formed
 *                           cartridge-kind row before A7's renderer exists);
 *                           preserve, show update-required state with Discard.
 */
export function validateDraftRow(row, ownerUserId) {
    if (!isStructurallySound(row)) {
        return { ok: false, reason: 'corrupt' }
    }
    if (row.ownerUserId !== ownerUserId) {
        return { ok: false, reason: 'owner-mismatch' }
    }
    if (row.draftSchemaVersion !== DRAFT_SCHEMA_VERSION) {
        return { ok: false, reason: 'unsupported-schema' }
    }

    const knownKinds =
        KNOWN_IDENTITY_KINDS.has(row.workoutIdentity.kind) &&
        KNOWN_SNAPSHOT_KINDS.has(row.definitionSnapshot.kind) &&
        KNOWN_STATE_KINDS.has(row.state.kind)
    if (!knownKinds) {
        return { ok: false, reason: 'unsupported-state' }
    }

    const isLegacyTriple = matchesTriple(row, COHERENT_LEGACY_TRIPLE)
    const isCartridgeTriple = matchesTriple(row, COHERENT_CARTRIDGE_TRIPLE)
    if (!isLegacyTriple && !isCartridgeTriple) {
        return { ok: false, reason: 'corrupt' }
    }

    if (isCartridgeTriple) {
        // Structurally coherent, but the legacy HUD — the only renderer that
        // exists before A7 — must never offer a cartridge-kind draft. This
        // has no live path today (nothing creates one), but validateDraftRow
        // must not silently pass one through regardless.
        return { ok: false, reason: 'unsupported-state' }
    }

    if (!isValidLegacyIdentity(row.workoutIdentity)) {
        return { ok: false, reason: 'corrupt' }
    }
    if (!isRenderSafeLegacySnapshot(row.definitionSnapshot.value)) {
        return { ok: false, reason: 'corrupt' }
    }
    if (!isRenderSafeLegacyState(row.state.fields)) {
        return { ok: false, reason: 'corrupt' }
    }

    return { ok: true, row }
}

// ─── Identity conflict detection (plan v2 §7) ──────────────────────────────
// A current legacy draft has null cartridge identity, so a different `kind`
// is never itself a conflict (no false conflict before A7).

export function identitiesConflict(liveIdentity, targetIdentity) {
    if (!liveIdentity || !targetIdentity) return false
    if (liveIdentity.kind !== targetIdentity.kind) return false

    if (liveIdentity.kind === 'legacy-playbook') {
        return (
            liveIdentity.dayTemplateKey !== targetIdentity.dayTemplateKey ||
            liveIdentity.phaseId !== targetIdentity.phaseId ||
            liveIdentity.hipScore !== targetIdentity.hipScore
        )
    }

    if (liveIdentity.kind === 'cartridge') {
        return (
            liveIdentity.cartridgeId !== targetIdentity.cartridgeId ||
            liveIdentity.cartridgeVersion !== targetIdentity.cartridgeVersion ||
            liveIdentity.dayTemplateKey !== targetIdentity.dayTemplateKey ||
            liveIdentity.phaseId !== targetIdentity.phaseId ||
            liveIdentity.hipScore !== targetIdentity.hipScore
        )
    }

    return false
}

/**
 * True only when BOTH the live draft is meaningful AND the identity change
 * would move it somewhere else — the single predicate HUD/CartridgeViewer
 * use to decide whether to show the Keep/Discard sheet.
 */
export function requiresConflictGuard({ liveRow, targetIdentity }) {
    if (!liveRow) return false
    if (!isStateMeaningful(liveRow.state?.kind, liveRow.state?.fields)) return false
    return identitiesConflict(liveRow.workoutIdentity, targetIdentity)
}

// ─── Hydration outcome classification ──────────────────────────────────────
// Pure reducer from a raw load attempt to what the UI should do — extracted
// so this decision is unit-testable without React (this repo has no
// render-test infrastructure). db/index.jsx's hydration effect does the
// actual `loadActiveDraft` read, then hands the result here and applies the
// outcome via setState; it makes no decisions of its own.

/**
 * @param {{ row: object|null|undefined, readError: unknown, ownerUserId: string }} args
 * @returns {{ continueDraft: object|null, draftIssue: { reason: string }|null }}
 *
 * - A read failure (readError set) is its own protected state ('read-failed')
 *   — NEVER treated as "no draft exists". Retry is the only recovery path;
 *   there is nothing to discard because it's unknown whether a row exists.
 * - No row: nothing to offer or protect.
 * - Owner mismatch: behaves exactly like "no row" — never hydrated, exposed,
 *   rewritten or merged.
 * - Any other invalid reason ('corrupt', 'unsupported-schema',
 *   'unsupported-state'): preserved, surfaced as a content-free draftIssue.
 * - Valid: offered as continueDraft.
 */
export function classifyHydratedDraft({ row, readError, ownerUserId }) {
    if (readError) {
        return { continueDraft: null, draftIssue: { reason: 'read-failed' } }
    }
    if (!row) {
        return { continueDraft: null, draftIssue: null }
    }
    const result = validateDraftRow(row, ownerUserId)
    if (!result.ok) {
        if (result.reason === 'owner-mismatch') {
            return { continueDraft: null, draftIssue: null }
        }
        return { continueDraft: null, draftIssue: { reason: result.reason } }
    }
    return { continueDraft: result.row, draftIssue: null }
}
