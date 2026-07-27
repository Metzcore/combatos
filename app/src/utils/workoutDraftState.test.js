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
    classifyHydratedDraft,
    CARTRIDGE_STATE_FIELD_KEYS, trackedFieldValues,
} from './workoutDraftState.js'
import { CARTRIDGES } from '../data/cartridges/index.js'

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

    // A7a corrective pass (finding #2): v2 has NO completion-flag concept on
    // an item (no `checked`/`done`/`roundsCompleted`) — only real
    // kg/reps/RPE/RIR set values, a substitution, or a note make an item
    // meaningful. An initialized-but-empty entry must not.
    it('an item with sets: [] (initialized, nothing entered) is NOT meaningful', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [] } } })).toBe(false)
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': {} } })).toBe(false)
    })
    it('an empty pair.sets: [] (initialized, nothing entered) is NOT meaningful', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [], pair: { sets: [] } } } })).toBe(false)
    })
    it('a real kg or reps value in performed.sets is meaningful', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [{ kg: 80 }] } } })).toBe(true)
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [{ reps: 5 }] } } })).toBe(true)
    })
    it('an RPE-only or RIR-only entered set is meaningful (matches the payload-level RPE/RIR-only fix)', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [{ rpe: 9 }] } } })).toBe(true)
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [{ rir: 1 }] } } })).toBe(true)
    })
    it('a real pair-set value is meaningful even with an empty main sets array', () => {
        expect(isCartridgeStateMeaningful({ itemStateById: { 'd1-str-1': { sets: [], pair: { sets: [{ reps: 3 }] } } } })).toBe(true)
    })

    it('a real (non-blank) substitution is meaningful even with no performed values yet', () => {
        expect(isCartridgeStateMeaningful({ substitutions: { 'd1-str-1': 'Front Squat' } })).toBe(true)
    })
    it('a blank substitution placeholder is NOT meaningful', () => {
        expect(isCartridgeStateMeaningful({ substitutions: { 'd1-str-1': '' } })).toBe(false)
        expect(isCartridgeStateMeaningful({ substitutions: { 'd1-str-1': '   ' } })).toBe(false)
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

    // A7a — analytics-ready activity fields.
    it('a non-empty sessionActivities selection is meaningful; an empty one is not', () => {
        expect(isCartridgeStateMeaningful({ sessionActivities: ['warmup'] })).toBe(true)
        expect(isCartridgeStateMeaningful({ sessionActivities: [] })).toBe(false)
    })
    it('a non-blank otherActivity is meaningful; a blank one is not', () => {
        expect(isCartridgeStateMeaningful({ otherActivity: 'sled pushes' })).toBe(true)
        expect(isCartridgeStateMeaningful({ otherActivity: '   ' })).toBe(false)
    })
    it('a typed sessionDuration is meaningful; empty/undefined is not', () => {
        expect(isCartridgeStateMeaningful({ sessionDuration: 30 })).toBe(true)
        expect(isCartridgeStateMeaningful({ sessionDuration: '' })).toBe(false)
        expect(isCartridgeStateMeaningful({})).toBe(false)
    })
})

describe('CARTRIDGE_STATE_FIELD_KEYS — A7a additions', () => {
    it('includes sessionDuration, sessionActivities, otherActivity (the fixed dependency-array defect fields)', () => {
        expect(CARTRIDGE_STATE_FIELD_KEYS).toEqual(expect.arrayContaining(['sessionDuration', 'sessionActivities', 'otherActivity']))
    })
})

describe('trackedFieldValues — dependency-array derivation', () => {
    it('returns one value per key, in key order, undefined for a missing field', () => {
        expect(trackedFieldValues({ a: 1, b: 2 }, ['a', 'b', 'c'])).toEqual([1, 2, undefined])
    })

    it('a sessionDuration-only change produces a different tracked-values array — proves a useEffect deps array built from CARTRIDGE_STATE_FIELD_KEYS would detect it', () => {
        const sharedItemStateById = {} // same reference in both — isolates the change to sessionDuration alone
        const before = { itemStateById: sharedItemStateById, sessionDuration: undefined }
        const after = { itemStateById: sharedItemStateById, sessionDuration: 30 }
        const depsBefore = trackedFieldValues(before, CARTRIDGE_STATE_FIELD_KEYS)
        const depsAfter = trackedFieldValues(after, CARTRIDGE_STATE_FIELD_KEYS)
        expect(depsBefore).not.toEqual(depsAfter)
        // Confirms sessionDuration is the ONLY thing that changed between the
        // two arrays (i.e. it really is tracked, not some other field masking it).
        const changedIndices = depsBefore.map((v, i) => (v !== depsAfter[i] ? i : -1)).filter(i => i >= 0)
        expect(changedIndices).toEqual([CARTRIDGE_STATE_FIELD_KEYS.indexOf('sessionDuration')])
    })

    it('a stable-length array for a fixed key list regardless of fields content', () => {
        expect(trackedFieldValues({}, CARTRIDGE_STATE_FIELD_KEYS)).toHaveLength(CARTRIDGE_STATE_FIELD_KEYS.length)
        expect(trackedFieldValues(null, CARTRIDGE_STATE_FIELD_KEYS)).toHaveLength(CARTRIDGE_STATE_FIELD_KEYS.length)
    })

    // Finding #7: the canonical field list must include every durable
    // cartridge field, especially startedAt and sessionDuration, and each
    // one must independently participate in the derived dependency array —
    // not just sit in the list unused. This exhaustively proves EVERY key
    // in CARTRIDGE_STATE_FIELD_KEYS, not just sessionDuration, actually
    // changes the tracked-values array in isolation.
    it('includes startedAt and sessionDuration (explicitly named in the finding)', () => {
        expect(CARTRIDGE_STATE_FIELD_KEYS).toContain('startedAt')
        expect(CARTRIDGE_STATE_FIELD_KEYS).toContain('sessionDuration')
    })

    const SENTINEL_BY_KEY = {
        itemStateById: { 'd1-str-1': { sets: [{ kg: 100 }] } },
        substitutions: { 'd1-str-1': 'Front Squat' },
        itemNotes: { 'd1-str-1': 'felt heavy' },
        notes: 'changed',
        customSessionContent: 'changed',
        blockOpen: { strength: true },
        scrollY: 999,
        startedAt: '2026-08-02T17:04:11.902Z',
        sessionDuration: 30,
        sessionActivities: ['warmup'],
        otherActivity: 'changed',
    }

    it('SENTINEL_BY_KEY covers every field in CARTRIDGE_STATE_FIELD_KEYS (test premise check)', () => {
        expect(Object.keys(SENTINEL_BY_KEY).sort()).toEqual([...CARTRIDGE_STATE_FIELD_KEYS].sort())
    })

    it.each(CARTRIDGE_STATE_FIELD_KEYS)('changing ONLY "%s" changes the tracked-values array at exactly that field\'s index', (key) => {
        // A shared base object: spreading it into `before`/`after` gives every
        // OTHER key the exact same reference in both, so only the field under
        // test can possibly differ.
        const base = { ...SENTINEL_BY_KEY }
        const before = { ...base, [key]: undefined }
        const after = { ...base, [key]: SENTINEL_BY_KEY[key] }

        const depsBefore = trackedFieldValues(before, CARTRIDGE_STATE_FIELD_KEYS)
        const depsAfter = trackedFieldValues(after, CARTRIDGE_STATE_FIELD_KEYS)

        expect(depsBefore).not.toEqual(depsAfter)
        const changedIndices = depsBefore.map((v, i) => (v !== depsAfter[i] ? i : -1)).filter(i => i >= 0)
        expect(changedIndices).toEqual([CARTRIDGE_STATE_FIELD_KEYS.indexOf(key)])
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

// Matches what production actually writes: every LEGACY_STATE_FIELD_KEYS
// entry present with its real container type (pickFields() always finds
// every key on DBProvider's live state, never falls back to undefined) —
// not a minimal stub. Required so this fixture satisfies the render-safety
// container checks the same way a real row does.
function validRow(overrides = {}) {
    return buildDraftRow({
        ownerUserId: OWNER_A,
        workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
        definitionSnapshot: buildLegacyDefinitionSnapshot({}),
        state: {
            kind: 'legacy-hud-v1',
            fields: { mobChecked: {}, clrChecked: {}, strSets: {}, coreSets: {}, altRows: [], notes: 'hi' },
        },
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

    it('rejects an internally incoherent discriminator triple as corrupt, even though each field is individually recognized', () => {
        // legacy identity + cartridge snapshot + legacy state — nothing this
        // app produces ever mixes kinds; this is a broken invariant, not a
        // forward-compatible future format.
        const mixed = {
            ...validRow(),
            definitionSnapshot: { kind: 'cartridge-day-v1', value: { day: 1 } },
        }
        expect(validateDraftRow(mixed, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const mixed2 = { ...validRow(), state: { kind: 'cartridge-workout-v1', fields: {} } }
        expect(validateDraftRow(mixed2, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    // A7a corrective pass (finding #1): a structurally sound, render-safe
    // cartridge-kind draft is now a valid `ok: true` result — it is no
    // longer unconditionally rejected as 'unsupported-state'.
    function validCartridgeFields(overrides = {}) {
        return {
            itemStateById: {}, substitutions: {}, itemNotes: {}, notes: '',
            customSessionContent: '', blockOpen: {}, scrollY: 0,
            sessionActivities: [],
            ...overrides,
        }
    }
    function cartridgeRow(fields, snapshotValue = { day: 1, label: 'Day 1', blocks: [] }) {
        return buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildCartridgeIdentity({
                cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3, day: 1,
            }),
            definitionSnapshot: buildCartridgeDefinitionSnapshot(snapshotValue),
            state: { kind: 'cartridge-workout-v1', fields },
        })
    }

    it('a structurally sound, render-safe cartridge draft hydrates successfully (ok: true) — no longer unsupported-state', () => {
        const row = cartridgeRow(validCartridgeFields({ notes: 'good session' }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: true, row })
    })

    it('rejects an incomplete cartridge fields object (missing required keys) as corrupt, not unsupported-state', () => {
        const row = cartridgeRow({ notes: 'x' }) // missing itemStateById/substitutions/etc entirely
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects an unparseable cartridge dayTemplateKey as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields())
        row.workoutIdentity = { ...row.workoutIdentity, dayTemplateKey: 'not-a-day-key' }
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a cartridge identity with an empty cartridgeId as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields())
        row.workoutIdentity = { ...row.workoutIdentity, cartridgeId: '' }
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects wrong container types in cartridge state fields as corrupt (render-unsafe)', () => {
        const row = cartridgeRow(validCartridgeFields({ itemStateById: null }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    // ─── Cartridge day snapshot render safety (corrective pass) ────────────

    const trainingItem = (overrides = {}) => ({ id: 'd1-str-1', name: 'Barbell Back Squat', target: 'Quads / Glutes', sets: 4, reps: '4-5', prescription: { rpe: 8 }, pair: { name: 'Box Jump', sets: 4, reps: '3' }, cue: 'Controlled descent.', ...overrides })
    const mobilityItem = (overrides = {}) => ({ id: 'd1-mob-1', name: '90/90 Hip Rotation', dose: '2x60s each side', note: 'RIGHT priority', cue: 'Breathe.', ...overrides })
    const conditioningItem = (overrides = {}) => ({ id: 'd1-bag-1', name: 'Jab-Cross Foundation', rounds: 6, roundLength: '3 min', rest: '60s', perRound: ['R1: Technical Jab-Cross'], cue: 'Stay loose.', ...overrides })

    const trainingSnapshot = {
        day: 1, label: 'Day 1 — Lower Body', type: 'training', focus: 'Squat strength',
        blocks: [
            { kind: 'mobility', label: 'Mobility & Prep', items: [mobilityItem()] },
            { kind: 'strength', label: 'Strength', items: [trainingItem()] },
            { kind: 'conditioning', label: 'Bag Work', items: [conditioningItem()] },
        ],
    }
    const restSnapshot = { day: 2, label: 'Day 2 — Rest', type: 'rest', focus: 'Rest & Recovery' } // no blocks key at all
    const recoverySnapshot = { day: 3, label: 'Day 3 — Recovery', type: 'recovery' }
    const customSnapshot = { day: 4, label: 'Day 4 — Custom', type: 'custom' }

    it('a valid training-day snapshot (real block/item shapes) hydrates successfully', () => {
        const row = cartridgeRow(validCartridgeFields(), trainingSnapshot)
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: true, row })
    })

    it('a valid rest/recovery snapshot with NO blocks key at all hydrates successfully', () => {
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), restSnapshot), OWNER_A).ok).toBe(true)
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), recoverySnapshot), OWNER_A).ok).toBe(true)
    })

    it('a valid custom-day snapshot with no blocks key hydrates successfully', () => {
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), customSnapshot), OWNER_A).ok).toBe(true)
    })

    it('rejects a non-array blocks (when present) as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, blocks: 'not-an-array' })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a null entry inside blocks as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, blocks: [null] })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a block with a non-string kind or label as corrupt', () => {
        const badKind = { ...trainingSnapshot, blocks: [{ kind: 123, label: 'x', items: [mobilityItem()] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badKind), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const badLabel = { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: { en: 'x' }, items: [mobilityItem()] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badLabel), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a block whose items is not an array as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: 'not-an-array' }] })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a null entry inside a block\'s items as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: [null] }] })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects an item missing id or name as corrupt', () => {
        const noId = { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: [mobilityItem({ id: undefined })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), noId), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const noName = { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: [mobilityItem({ name: '' })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), noName), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects an object-valued display field (dose/target/cue/note) as corrupt — would crash as a JSX child', () => {
        const objDose = { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: [mobilityItem({ dose: { en: '2x60s' } })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), objDose), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const objTarget = { ...trainingSnapshot, blocks: [{ kind: 'strength', label: 'x', items: [trainingItem({ target: { en: 'Quads' } })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), objTarget), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a wrong-type render-accessed nested container (prescription/pair/perRound) as corrupt', () => {
        const badPrescription = { ...trainingSnapshot, blocks: [{ kind: 'strength', label: 'x', items: [trainingItem({ prescription: 'rpe 8' })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badPrescription), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const badPair = { ...trainingSnapshot, blocks: [{ kind: 'strength', label: 'x', items: [trainingItem({ pair: 'Box Jump' })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badPair), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const badPerRound = { ...trainingSnapshot, blocks: [{ kind: 'conditioning', label: 'x', items: [conditioningItem({ perRound: 'R1' })] }] }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badPerRound), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects an object-valued top-level day label or focus as corrupt', () => {
        const objLabel = { ...trainingSnapshot, label: { en: 'Day 1' } }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), objLabel), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const objFocus = { ...trainingSnapshot, focus: { en: 'Squat strength' } }
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), objFocus), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('never returns ok:true for any of the malformed snapshots above (premise cross-check)', () => {
        const malformed = [
            { ...trainingSnapshot, blocks: 'x' },
            { ...trainingSnapshot, blocks: [null] },
            { ...trainingSnapshot, blocks: [{ kind: 1, label: 'x', items: [] }] },
            { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: [null] }] },
            { ...trainingSnapshot, blocks: [{ kind: 'mobility', label: 'x', items: [mobilityItem({ dose: {} })] }] },
        ]
        for (const snapshot of malformed) {
            expect(validateDraftRow(cartridgeRow(validCartridgeFields(), snapshot), OWNER_A).ok).toBe(false)
        }
    })

    // ─── Second corrective pass: nested render-consumed value regressions ──
    // Six independently-reproduced cases where the FIRST pass's container-
    // type-only checks let a corrupt value through as ok:true.

    function withStrengthItem(overrides) {
        return { ...trainingSnapshot, blocks: [{ kind: 'strength', label: 'Strength', items: [trainingItem(overrides)] }] }
    }
    function withConditioningItem(overrides) {
        return { ...trainingSnapshot, blocks: [{ kind: 'conditioning', label: 'Bag Work', items: [conditioningItem(overrides)] }] }
    }

    it('reproduced case 1 — item.superset = { bad: true } is rejected as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), withStrengthItem({ superset: { bad: true } }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('reproduced case 2 — item.sets = { bad: true } is rejected as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), withStrengthItem({ sets: { bad: true } }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('reproduced case 3 — item.prescription = { note: { bad: true } } is rejected as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), withStrengthItem({ prescription: { note: { bad: true } } }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('reproduced case 4 — item.pair = { name: { bad: true } } is rejected as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), withStrengthItem({ pair: { name: { bad: true } } }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('reproduced case 5 — item.perRound = [{ bad: true }] is rejected as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), withConditioningItem({ perRound: [{ bad: true }] }))
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('reproduced case 6 — day.type = { bad: true } is rejected as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, type: { bad: true } })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('a missing day.type defaults to "training" (the cartridge format\'s own convention) and is not corrupt', () => {
        const { type, ...withoutType } = trainingSnapshot
        const row = cartridgeRow(validCartridgeFields(), withoutType)
        expect(validateDraftRow(row, OWNER_A).ok).toBe(true)
    })

    it('rejects an unrecognized block.kind (not one of the five renderer kinds) as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, blocks: [{ kind: 'bogus-kind', label: 'x', items: [mobilityItem()] }] })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects an unrecognized day.type string as corrupt', () => {
        const row = cartridgeRow(validCartridgeFields(), { ...trainingSnapshot, type: 'bogus-type' })
        expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a pair with a wrong-typed sets/reps/note as corrupt', () => {
        const badSets = withStrengthItem({ pair: { name: 'Box Jump', sets: { bad: true } } })
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badSets), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const badNote = withStrengthItem({ pair: { name: 'Box Jump', sets: 4, note: { bad: true } } })
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badNote), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a prescription with a wrong-typed rpe/rir/percent/addedLoad as corrupt (unknown keys still tolerated)', () => {
        const badRpe = withStrengthItem({ prescription: { rpe: '8' } })
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badRpe), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        const badAddedLoad = withStrengthItem({ prescription: { addedLoad: { kg: 20 } } })
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), badAddedLoad), OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        // A genuinely unrecognized prescription key is tolerated — prescription
        // stays a free object per PROGRAM-CARTRIDGE-SPEC.md; only the fields a
        // formatter actually reads are type-checked.
        const unknownKey = withStrengthItem({ prescription: { rpe: 8, someFutureField: 'x' } })
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), unknownKey), OWNER_A).ok).toBe(true)
    })

    it('representative valid strength/mobility/conditioning snapshots still hydrate after the strengthened checks', () => {
        expect(validateDraftRow(cartridgeRow(validCartridgeFields(), trainingSnapshot), OWNER_A).ok).toBe(true)
    })

    // ─── Every real authored day, from every bundled cartridge ─────────────
    // Table-tested so the strengthened validator cannot accidentally reject
    // real authored data — the single strongest guard against over-fitting
    // to the reproduced synthetic cases above.

    const allBundledDays = CARTRIDGES
        .filter(c => c.type !== 'content') // content cartridges have no days[]/blocks — a different cartridge type entirely
        .flatMap(c => (c.days || []).map(day => ({ cartridgeId: c.cartridgeId, day })))

    it('the bundled-cartridge premise holds: at least one real cartridge with real days was found', () => {
        expect(allBundledDays.length).toBeGreaterThan(0)
    })

    it.each(allBundledDays.map(({ cartridgeId, day }) => [`${cartridgeId} day ${day.day} (${day.type || 'training'})`, day]))(
        '%s hydrates successfully as a real authored snapshot',
        (_label, day) => {
            const row = cartridgeRow(validCartridgeFields(), day)
            expect(validateDraftRow(row, OWNER_A)).toEqual({ ok: true, row })
        }
    )

    it('rejects a legacy-workout-v1 snapshot with a non-array mobSlots/strSlots/clrSlots as corrupt (render-unsafe)', () => {
        const base = validRow()
        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, mobSlots: null } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, strSlots: 'not-an-array' } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { mobSlots: [], strSlots: [] } }, // clrSlots missing entirely
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects a slot array containing a null entry as corrupt — MobilityBlock/StrengthBlock/CooldownBlock dereference slot.* directly and would crash', () => {
        const base = validRow()
        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, mobSlots: [null] } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, strSlots: [{ exercise: 'ok' }, null] } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, clrSlots: ['not-an-object'] } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects an object-valued dailyFocus as corrupt — rendered directly as a JSX child, an object there crashes React', () => {
        const base = validRow()
        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, dailyFocus: { label: 'Push Day' } } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        // null and a plain string both remain valid.
        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, dailyFocus: null } },
        }, OWNER_A).ok).toBe(true)
        expect(validateDraftRow({
            ...base,
            definitionSnapshot: { ...base.definitionSnapshot, value: { ...base.definitionSnapshot.value, dailyFocus: 'Push Day' } },
        }, OWNER_A).ok).toBe(true)
    })

    it('rejects an unparseable or out-of-range legacy identity as corrupt', () => {
        const base = validRow()
        // Unparseable dayTemplateKey/phaseId (doesn't match legacy-day:{n}/legacy-phase:{n}).
        expect(validateDraftRow({
            ...base,
            workoutIdentity: { ...base.workoutIdentity, dayTemplateKey: 'garbage' },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        // Out-of-range day (only 1-7 exist in DAY_LABELS).
        expect(validateDraftRow({
            ...base,
            workoutIdentity: { ...base.workoutIdentity, dayTemplateKey: 'legacy-day:99' },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            workoutIdentity: { ...base.workoutIdentity, dayTemplateKey: 'legacy-day:0' },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        // Out-of-range phase (only 1-3 exist).
        expect(validateDraftRow({
            ...base,
            workoutIdentity: { ...base.workoutIdentity, phaseId: 'legacy-phase:9' },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        // Out-of-range / wrong-typed hipScore (only 1-5 exist in HIP_LABELS).
        expect(validateDraftRow({
            ...base,
            workoutIdentity: { ...base.workoutIdentity, hipScore: 99 },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            workoutIdentity: { ...base.workoutIdentity, hipScore: '3' },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects malformed state.fields container types as corrupt — resumeDraft()/handleLog dereference them as objects/arrays directly', () => {
        const base = validRow()
        // mobChecked/clrChecked/strSets/coreSets must be plain objects.
        expect(validateDraftRow({
            ...base,
            state: { ...base.state, fields: { ...base.state.fields, mobChecked: [] } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            state: { ...base.state, fields: { ...base.state.fields, strSets: 'not-an-object' } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        expect(validateDraftRow({
            ...base,
            state: { ...base.state, fields: { ...base.state.fields, coreSets: null } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })

        // altRows must be an array — HUD's handleLog calls altRows.map() directly.
        expect(validateDraftRow({
            ...base,
            state: { ...base.state, fields: { ...base.state.fields, altRows: { 0: { name: 'x' } } } },
        }, OWNER_A)).toEqual({ ok: false, reason: 'corrupt' })
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

// ─── Hydration outcome classification ──────────────────────────────────────

describe('classifyHydratedDraft', () => {
    it('a read failure is its own protected state — NEVER treated as "no draft"', () => {
        const outcome = classifyHydratedDraft({ row: null, readError: new Error('IDB unavailable'), ownerUserId: OWNER_A })
        expect(outcome).toEqual({ continueDraft: null, draftIssue: { reason: 'read-failed' } })
    })

    it('a read failure wins even if a row happens to also be present (defensive)', () => {
        const outcome = classifyHydratedDraft({ row: validRow(), readError: new Error('x'), ownerUserId: OWNER_A })
        expect(outcome.draftIssue).toEqual({ reason: 'read-failed' })
        expect(outcome.continueDraft).toBeNull()
    })

    it('no row and no error — nothing to offer or protect', () => {
        expect(classifyHydratedDraft({ row: null, readError: null, ownerUserId: OWNER_A }))
            .toEqual({ continueDraft: null, draftIssue: null })
        expect(classifyHydratedDraft({ row: undefined, readError: null, ownerUserId: OWNER_A }))
            .toEqual({ continueDraft: null, draftIssue: null })
    })

    it('owner mismatch behaves exactly like "no draft" — never exposed as an issue', () => {
        expect(classifyHydratedDraft({ row: validRow(), readError: null, ownerUserId: OWNER_B }))
            .toEqual({ continueDraft: null, draftIssue: null })
    })

    it('a valid row is offered as continueDraft', () => {
        const row = validRow()
        expect(classifyHydratedDraft({ row, readError: null, ownerUserId: OWNER_A }))
            .toEqual({ continueDraft: row, draftIssue: null })
    })

    it('corrupt/unsupported rows are preserved as a content-free draftIssue', () => {
        expect(classifyHydratedDraft({
            row: { ...validRow(), draftSchemaVersion: DRAFT_SCHEMA_VERSION + 1 }, readError: null, ownerUserId: OWNER_A,
        })).toEqual({ continueDraft: null, draftIssue: { reason: 'unsupported-schema' } })

        expect(classifyHydratedDraft({ row: {}, readError: null, ownerUserId: OWNER_A }))
            .toEqual({ continueDraft: null, draftIssue: { reason: 'corrupt' } })
    })
})
