import { describe, it, expect } from 'vitest'
import {
    DRAFT_SCHEMA_VERSION,
    buildLegacyIdentity, buildCartridgeIdentity,
    buildLegacyDefinitionSnapshot, buildCartridgeDefinitionSnapshot,
    buildDraftRow,
    isLegacyStateMeaningful, isCartridgeStateMeaningful, isStateMeaningful,
    validateDraftRow,
    identitiesConflict, requiresConflictGuard,
    parseLegacyDay, parseLegacyPhase,
} from './workoutDraftState.js'

const OWNER_A = '11111111-1111-4111-8111-111111111111'
const OWNER_B = '22222222-2222-4222-8222-222222222222'

// ─── Identity builders ──────────────────────────────────────────────────────

describe('buildLegacyIdentity', () => {
    it('nulls every cartridge field and namespaces day/phase as legacy-*', () => {
        const identity = buildLegacyIdentity({ day: 3, phase: 2, hipScore: 4 })
        expect(identity).toEqual({
            kind: 'legacy-playbook',
            cartridgeId: null,
            cartridgeVersion: null,
            cartridgeSchemaVersion: null,
            dayTemplateKey: 'legacy-day:3',
            phaseId: 'legacy-phase:2',
            hipScore: 4,
        })
    })
})

describe('buildCartridgeIdentity', () => {
    it('uses day:{n} template keys and the given cartridge fields', () => {
        const identity = buildCartridgeIdentity({
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.0',
            cartridgeSchemaVersion: 3, day: 5, phaseId: 'phase1', hipScore: 2,
        })
        expect(identity).toEqual({
            kind: 'cartridge',
            cartridgeId: 'combatos-operator-2026',
            cartridgeVersion: '1.0.0',
            cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:5',
            phaseId: 'phase1',
            hipScore: 2,
        })
    })
})

// ─── Meaningful-input predicate ─────────────────────────────────────────────

describe('isLegacyStateMeaningful', () => {
    it('is false for defaults and UI/identity-only fields', () => {
        expect(isLegacyStateMeaningful({})).toBe(false)
        expect(isLegacyStateMeaningful({
            mobChecked: {}, clrChecked: {}, strSets: {}, coreSets: {},
            bagRounds: '', bagCourse: '', bagModules: '', bagWorkouts: '',
            notes: '', altRows: [], altDuration: '',
            hudScrollY: 500, bagBlockOpen: true, coreBlockOpen: true,
            mobBlockOpen: false, strBlockOpen: false, clrBlockOpen: false,
            gymSessionType: 'Cardio',
        })).toBe(false)
    })

    it('a single checked mobility item is meaningful', () => {
        expect(isLegacyStateMeaningful({ mobChecked: { 1: true } })).toBe(true)
    })

    it('a single checked cooldown item is meaningful', () => {
        expect(isLegacyStateMeaningful({ clrChecked: { 2: true } })).toBe(true)
    })

    it('a non-empty strength kg/reps/papReps value is meaningful', () => {
        expect(isLegacyStateMeaningful({ strSets: { 'ex1-s1': { kg: '60' } } })).toBe(true)
        expect(isLegacyStateMeaningful({ strSets: { 'ex1-s1': { reps: '8' } } })).toBe(true)
        expect(isLegacyStateMeaningful({ strSets: { 'ex1-s1': { papReps: '3' } } })).toBe(true)
        expect(isLegacyStateMeaningful({ strSets: { 'ex1-s1': { kg: '' } } })).toBe(false)
    })

    it('a non-empty core exercise/sets/reps value is meaningful', () => {
        expect(isLegacyStateMeaningful({ coreSets: { 1: { ex: 'Plank' } } })).toBe(true)
        expect(isLegacyStateMeaningful({ coreSets: { 1: { sets: '3' } } })).toBe(true)
        expect(isLegacyStateMeaningful({ coreSets: { 1: { reps: '15' } } })).toBe(true)
    })

    it('any non-empty bag field is meaningful', () => {
        expect(isLegacyStateMeaningful({ bagRounds: '4' })).toBe(true)
        expect(isLegacyStateMeaningful({ bagCourse: 'A' })).toBe(true)
        expect(isLegacyStateMeaningful({ bagModules: 'jab-cross' })).toBe(true)
        expect(isLegacyStateMeaningful({ bagWorkouts: 'x' })).toBe(true)
    })

    it('blank/whitespace-only notes are NOT meaningful; real notes are', () => {
        expect(isLegacyStateMeaningful({ notes: '' })).toBe(false)
        expect(isLegacyStateMeaningful({ notes: '   ' })).toBe(false)
        expect(isLegacyStateMeaningful({ notes: 'felt strong today' })).toBe(true)
    })

    it('an altRow needs real content, not just an empty row shell', () => {
        expect(isLegacyStateMeaningful({ altRows: [{ id: 1, name: '', v1: '', v2: '', v3: '' }] })).toBe(false)
        expect(isLegacyStateMeaningful({ altRows: [{ id: 1, name: 'Sprints', v1: '', v2: '', v3: '' }] })).toBe(true)
    })

    it('a non-empty duration is meaningful', () => {
        expect(isLegacyStateMeaningful({ altDuration: '45' })).toBe(true)
    })

    it('day/phase/hip-score/session-type/scroll/collapse never make it meaningful alone', () => {
        // These aren't even part of state.fields (they live in workoutIdentity /
        // UI-only fields), but guard against a future caller passing them in.
        expect(isLegacyStateMeaningful({ gymSessionType: 'Combat', hudScrollY: 999 })).toBe(false)
    })
})

describe('isCartridgeStateMeaningful', () => {
    it('is false for an empty/default state', () => {
        expect(isCartridgeStateMeaningful({})).toBe(false)
        expect(isCartridgeStateMeaningful({
            itemStateById: {}, substitutions: {}, itemNotes: {}, notes: '', customSessionContent: '',
            blockOpen: { mob: true }, scrollY: 200,
        })).toBe(false)
    })

    it('a checked item is meaningful', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { checked: true } } })).toBe(true)
    })

    it('a raw performed value/set is meaningful', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { kg: '80' } } })).toBe(true)
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { reps: '5' } } })).toBe(true)
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { value: 'x' } } })).toBe(true)
    })

    it('a substitution is meaningful even with no performed values yet', () => {
        expect(isCartridgeStateMeaningful({ substitutions: { 'd1-str-1': 'Front Squat' } })).toBe(true)
    })

    it('item or session notes are meaningful; blank ones are not', () => {
        expect(isCartridgeStateMeaningful({ itemNotes: { 'd1-str-1': 'felt heavy' } })).toBe(true)
        expect(isCartridgeStateMeaningful({ itemNotes: { 'd1-str-1': '  ' } })).toBe(false)
        expect(isCartridgeStateMeaningful({ notes: 'good session' })).toBe(true)
    })

    it('custom-session content is meaningful', () => {
        expect(isCartridgeStateMeaningful({ customSessionContent: 'ran 5k' })).toBe(true)
    })

    it('identity and UI state alone are never meaningful', () => {
        expect(isCartridgeStateMeaningful({ blockOpen: { mob: true }, scrollY: 500 })).toBe(false)
    })
})

describe('isStateMeaningful — dispatches by state.kind', () => {
    it('routes legacy-hud-v1 to the legacy predicate and cartridge-workout-v1 to the cartridge one', () => {
        expect(isStateMeaningful('legacy-hud-v1', { notes: 'x' })).toBe(true)
        expect(isStateMeaningful('cartridge-workout-v1', { notes: 'x' })).toBe(true)
        expect(isStateMeaningful('cartridge-workout-v1', { mobChecked: { 1: true } })).toBe(false)
    })
})

// ─── Row validation ─────────────────────────────────────────────────────────

function validRow(overrides = {}) {
    return buildDraftRow({
        ownerUserId: OWNER_A,
        workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
        definitionSnapshot: buildLegacyDefinitionSnapshot({}),
        state: { kind: 'legacy-hud-v1', fields: { notes: 'hi' } },
        ...overrides,
    })
}

describe('validateDraftRow', () => {
    it('accepts a well-formed, owner-matched, current-schema row', () => {
        const result = validateDraftRow(validRow(), OWNER_A)
        expect(result.ok).toBe(true)
    })

    it('fails closed on owner mismatch without exposing/rewriting it', () => {
        const result = validateDraftRow(validRow(), OWNER_B)
        expect(result).toEqual({ ok: false, reason: 'owner-mismatch' })
    })

    it('flags an unsupported draftSchemaVersion as preservable-but-unsupported', () => {
        const row = { ...validRow(), draftSchemaVersion: DRAFT_SCHEMA_VERSION + 1 }
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'unsupported-schema' })
    })

    it('flags an unrecognized state/identity/snapshot kind as unsupported-state', () => {
        const row = { ...validRow(), state: { kind: 'future-kind-v9', fields: {} } }
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'unsupported-state' })
    })

    it('fails closed on structurally malformed rows without hydrating them', () => {
        expect(validateDraftRow(null, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
        expect(validateDraftRow({}, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
        expect(validateDraftRow({ ...validRow(), state: 'not-an-object' }, OWNER_A))
            .toEqual({ ok: false, reason: 'corrupt' })
        expect(validateDraftRow({ ...validRow(), slot: 'other' }, OWNER_A))
            .toEqual({ ok: false, reason: 'corrupt' })
        expect(validateDraftRow({ ...validRow(), workoutIdentity: { kind: 'legacy-playbook' } }, OWNER_A))
            .toEqual({ ok: false, reason: 'corrupt' }) // missing dayTemplateKey
    })
})

// ─── Identity conflict matrix ───────────────────────────────────────────────

describe('identitiesConflict', () => {
    const legacyDay1 = buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 })
    const legacyDay2 = buildLegacyIdentity({ day: 2, phase: 1, hipScore: 3 })
    const legacyPhase2 = buildLegacyIdentity({ day: 1, phase: 2, hipScore: 3 })
    const legacyHip5 = buildLegacyIdentity({ day: 1, phase: 1, hipScore: 5 })
    const cartA = buildCartridgeIdentity({ cartridgeId: 'a', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3, day: 1 })
    const cartAv2 = buildCartridgeIdentity({ cartridgeId: 'a', cartridgeVersion: '2.0.0', cartridgeSchemaVersion: 3, day: 1 })
    const cartB = buildCartridgeIdentity({ cartridgeId: 'b', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3, day: 1 })

    it('no conflict for identical identity', () => {
        expect(identitiesConflict(legacyDay1, buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }))).toBe(false)
    })

    it('day, phase, and hip-score changes each conflict within legacy', () => {
        expect(identitiesConflict(legacyDay1, legacyDay2)).toBe(true)
        expect(identitiesConflict(legacyDay1, legacyPhase2)).toBe(true)
        expect(identitiesConflict(legacyDay1, legacyHip5)).toBe(true)
    })

    it('legacy vs cartridge NEVER conflicts — no false conflict before A7', () => {
        expect(identitiesConflict(legacyDay1, cartA)).toBe(false)
        expect(identitiesConflict(cartA, legacyDay1)).toBe(false)
    })

    it('a different cartridge, or a version bump of the same cartridge, conflicts', () => {
        expect(identitiesConflict(cartA, cartB)).toBe(true)
        expect(identitiesConflict(cartA, cartAv2)).toBe(true)
        expect(identitiesConflict(cartA, buildCartridgeIdentity({
            cartridgeId: 'a', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3, day: 1,
        }))).toBe(false)
    })

    it('handles null live/target identity as no conflict', () => {
        expect(identitiesConflict(null, legacyDay1)).toBe(false)
        expect(identitiesConflict(legacyDay1, null)).toBe(false)
    })
})

describe('requiresConflictGuard — combines meaningfulness with identity conflict', () => {
    it('never guards a non-meaningful draft, even across identities', () => {
        const liveRow = {
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            state: { kind: 'legacy-hud-v1', fields: {} },
        }
        const target = buildLegacyIdentity({ day: 2, phase: 1, hipScore: 3 })
        expect(requiresConflictGuard({ liveRow, targetIdentity: target })).toBe(false)
    })

    it('guards a meaningful draft moving to a different legacy identity', () => {
        const liveRow = {
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'in progress' } },
        }
        const target = buildLegacyIdentity({ day: 2, phase: 1, hipScore: 3 })
        expect(requiresConflictGuard({ liveRow, targetIdentity: target })).toBe(true)
    })

    it('does not guard when there is no live row at all', () => {
        expect(requiresConflictGuard({ liveRow: null, targetIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }) }))
            .toBe(false)
    })

    it('does not guard a meaningful legacy draft against cartridge activation', () => {
        const liveRow = {
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'in progress' } },
        }
        const target = buildCartridgeIdentity({ cartridgeId: 'a', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3, day: 1 })
        expect(requiresConflictGuard({ liveRow, targetIdentity: target })).toBe(false)
    })
})

// ─── Legacy day/phase round-trip ────────────────────────────────────────────

describe('parseLegacyDay / parseLegacyPhase — inverse of buildLegacyIdentity', () => {
    it('round-trips through the identity builder', () => {
        const identity = buildLegacyIdentity({ day: 6, phase: 3, hipScore: 1 })
        expect(parseLegacyDay(identity.dayTemplateKey)).toBe(6)
        expect(parseLegacyPhase(identity.phaseId)).toBe(3)
    })

    it('returns null for unrecognized or missing keys', () => {
        expect(parseLegacyDay('day:3')).toBeNull() // cartridge-style key, not legacy
        expect(parseLegacyDay(undefined)).toBeNull()
        expect(parseLegacyPhase('phase1')).toBeNull()
        expect(parseLegacyPhase(null)).toBeNull()
    })
})

// ─── Definition snapshot builders (smoke) ──────────────────────────────────

describe('definition snapshot builders', () => {
    it('legacy snapshot captures the resolved workout shape', () => {
        const snap = buildLegacyDefinitionSnapshot({
            isFightGymDay: false, dailyFocus: 'Lower Body', mobSlots: [1], strSlots: [2], bagSlot: null, clrSlots: [3],
        })
        expect(snap.kind).toBe('legacy-workout-v1')
        expect(snap.value.dailyFocus).toBe('Lower Body')
        expect(snap.value.strSlots).toEqual([2])
    })

    it('cartridge snapshot wraps the raw day object', () => {
        const day = { day: 1, label: 'Day 1', blocks: [] }
        expect(buildCartridgeDefinitionSnapshot(day)).toEqual({ kind: 'cartridge-day-v1', value: day })
    })
})
