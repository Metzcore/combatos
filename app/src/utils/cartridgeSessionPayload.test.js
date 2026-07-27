/**
 * cartridgeSessionPayload.test.js — A7a payload builder + validator.
 *
 * Fixtures follow docs/reference/session-payload-schema.md exactly (§2-§10).
 */
import { describe, it, expect } from 'vitest'
import {
    PAYLOAD_VERSION, SESSION_ACTIVITIES, ALLOWED_TOP_LEVEL_KEYS, FORBIDDEN_LEGACY_KEYS,
    normalizeSets, normalizePairSets, buildPrescribed, buildPerformed,
    buildCartridgeSessionPayload, validateCartridgeSessionPayload,
    isReadableCartridgeRow, isHistoricalV1Row,
} from './cartridgeSessionPayload.js'
import { computeCartridgeCompleteness } from './cartridgeCompleteness.js'

// ─── A genuine, valid v2 training-day fixture (schema §2) ──────────────────

function validTrainingPayload(overrides = {}) {
    return {
        payloadVersion: 2,
        sessionKind: 'cartridge',
        sessionId: 'uuid-1',
        date: '2026-08-02',
        startedAt: '2026-08-02T17:04:11.902Z',
        completedAt: '2026-08-02T18:21:40.115Z',
        sessionCategory: 'strength-conditioning',
        cartridgeId: 'combatos-operator-2026',
        cartridgeVersion: '1.0.1',
        cartridgeSchemaVersion: 3,
        dayTemplateKey: 'day:1',
        dayTemplateLabel: 'Day 1 — S&C: Lower + Posterior',
        dayType: 'training',
        phaseId: null,
        completeness: 62.5,
        sessionActivities: ['warmup', 'bag-workout', 'cooldown'],
        notes: 'Solid session.',
        blocks: [
            {
                kind: 'strength',
                label: 'Strength & Power',
                items: [
                    {
                        itemId: 'd1-str-1',
                        prescribed: { name: 'Barbell Back Squat', target: 'Quads / Glutes', sets: 4, reps: '4', prescription: { rpe: 8 }, pair: null, superset: null },
                        performed: { sets: [{ kg: 100, reps: 4, rpe: 7 }, { kg: 105, reps: 4, rpe: 8 }, { rpe: 9 }] },
                        substituted: false,
                    },
                ],
            },
            {
                kind: 'mobility',
                label: 'Warm-up',
                items: [
                    { itemId: 'd1-mob-1', prescribed: { name: 'Your own 10-min warm-up routine', dose: '10 min' }, performed: {}, substituted: false },
                ],
            },
        ],
        ...overrides,
    }
}

function validRestPayload(overrides = {}) {
    return {
        payloadVersion: 2, sessionKind: 'cartridge', sessionId: 'uuid-2',
        date: '2026-08-04', completedAt: '2026-08-04T09:00:00.000Z',
        sessionCategory: 'rest',
        cartridgeId: 'apex-protocol-phase1', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
        dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Rest', dayType: 'rest',
        phaseId: 'phase1', blocks: [],
        ...overrides,
    }
}

function validCustomPayload(overrides = {}) {
    return {
        payloadVersion: 2, sessionKind: 'cartridge', sessionId: 'uuid-3',
        date: '2026-08-05', startedAt: '2026-08-05T18:00:00.000Z',
        completedAt: '2026-08-05T19:15:00.000Z',
        sessionCategory: 'combat',
        cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
        dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Fight', dayType: 'custom',
        phaseId: null, blocks: [],
        customContent: '6 rounds sparring, 3 rounds pads', sessionDuration: 75,
        sessionActivities: ['bag-workout', 'abs'], notes: '',
        ...overrides,
    }
}

// A genuine payloadVersion: 1 historical fixture, per schema §10 — used to
// prove readers tolerate it and the validator rejects it as a write.
function historicalV1Payload() {
    return {
        payloadVersion: 1, sessionKind: 'cartridge', sessionId: 'uuid-v1-real',
        date: '2026-07-20', completedAt: '2026-07-20T18:00:00.000Z',
        sessionCategory: 'strength-conditioning',
        cartridgeId: 'apex-protocol-phase1', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
        dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: 'phase1',
        completeness: 80,
        blocks: [
            { kind: 'mobility', items: [{ itemId: 'm1', prescribed: { name: 'Hip 90/90' }, performed: { done: true }, substituted: false }] },
            { kind: 'conditioning', items: [{ itemId: 'c1', prescribed: { name: 'Bag Rounds', rounds: 6 }, performed: { roundsCompleted: 5 }, substituted: false }] },
        ],
    }
}

describe('validateCartridgeSessionPayload — valid fixtures pass', () => {
    it('accepts the schema §2 training fixture', () => {
        expect(validateCartridgeSessionPayload(validTrainingPayload())).toEqual([])
    })
    it('accepts the schema §3 rest fixture', () => {
        expect(validateCartridgeSessionPayload(validRestPayload())).toEqual([])
    })
    it('accepts the schema §3 custom fixture', () => {
        expect(validateCartridgeSessionPayload(validCustomPayload())).toEqual([])
    })
})

describe('validateCartridgeSessionPayload — payloadVersion: 2 write-only rule', () => {
    it('rejects payloadVersion 1 as a new write, even though it is a real historical shape', () => {
        const errors = validateCartridgeSessionPayload(historicalV1Payload())
        expect(errors.some(e => e.includes('payloadVersion'))).toBe(true)
    })
    it('rejects a missing or unrecognized payloadVersion', () => {
        expect(validateCartridgeSessionPayload(validTrainingPayload({ payloadVersion: 3 }))
            .some(e => e.includes('payloadVersion'))).toBe(true)
        const { payloadVersion, ...rest } = validTrainingPayload()
        expect(validateCartridgeSessionPayload(rest).length).toBeGreaterThan(0)
    })
})

describe('validateCartridgeSessionPayload — strict top-level key set', () => {
    it('rejects an unknown top-level key', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({ bogusField: 'x' }))
        expect(errors.some(e => e.includes('unknown top-level key "bogusField"'))).toBe(true)
    })
    it('rejects every legacy-only field explicitly', () => {
        for (const key of FORBIDDEN_LEGACY_KEYS) {
            const errors = validateCartridgeSessionPayload(validTrainingPayload({ [key]: 1 }))
            expect(errors.some(e => e.includes(key))).toBe(true)
        }
    })
    it('ALLOWED_TOP_LEVEL_KEYS is exactly the schema-documented set', () => {
        expect([...ALLOWED_TOP_LEVEL_KEYS].sort()).toEqual([
            'blocks', 'cartridgeId', 'cartridgeSchemaVersion', 'cartridgeVersion',
            'completedAt', 'completeness', 'customContent', 'date', 'dayTemplateKey',
            'dayTemplateLabel', 'dayType', 'notes', 'otherActivity', 'payloadVersion',
            'phaseId', 'sessionActivities', 'sessionCategory', 'sessionDuration',
            'sessionId', 'sessionKind', 'startedAt',
        ].sort())
    })
})

describe('validateCartridgeSessionPayload — day-type field restrictions', () => {
    it('rejects sessionDuration/customContent on a training day', () => {
        const withDuration = validateCartridgeSessionPayload(validTrainingPayload({ sessionDuration: 30 }))
        expect(withDuration.some(e => e.includes('sessionDuration'))).toBe(true)
        const withContent = validateCartridgeSessionPayload(validTrainingPayload({ customContent: 'x' }))
        expect(withContent.some(e => e.includes('customContent'))).toBe(true)
    })
    it('rejects sessionActivities/completeness on a rest day', () => {
        const withActivities = validateCartridgeSessionPayload(validRestPayload({ sessionActivities: [] }))
        expect(withActivities.some(e => e.includes('sessionActivities'))).toBe(true)
        const withCompleteness = validateCartridgeSessionPayload(validRestPayload({ completeness: 50 }))
        expect(withCompleteness.some(e => e.includes('completeness'))).toBe(true)
    })
    it('requires non-empty blocks to be empty on rest/recovery/custom days', () => {
        const errors = validateCartridgeSessionPayload(validRestPayload({
            blocks: [{ kind: 'mobility', label: 'x', items: [{ itemId: 'a', prescribed: { name: 'x' }, performed: {}, substituted: false }] }],
        }))
        expect(errors.some(e => e.includes('blocks must be empty'))).toBe(true)
    })
    it('requires at least one block on a training day (blocks must be a non-empty structurally-valid array)', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({ blocks: [] }))
        // blocks: [] is structurally valid (an empty array of blocks) — no
        // block-level errors are raised; this fixture stays valid. Confirms
        // the validator doesn't invent a "must have at least one block" rule
        // for cartridge sessions (unlike the CARTRIDGE spec's day-authoring
        // rule, a different, cartridge-definition-level concern).
        expect(errors).toEqual([])
    })
})

describe('validateCartridgeSessionPayload — sessionActivities', () => {
    it('required, absent vs [] semantics: absent is required on training', () => {
        const { sessionActivities, ...rest } = validTrainingPayload()
        const errors = validateCartridgeSessionPayload(rest)
        expect(errors.some(e => e.includes('sessionActivities is required'))).toBe(true)
    })
    it('[] is valid on a training day', () => {
        expect(validateCartridgeSessionPayload(validTrainingPayload({ sessionActivities: [] }))).toEqual([])
    })
    it('rejects an unknown activity id', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({ sessionActivities: ['warmup', 'bogus'] }))
        expect(errors.some(e => e.includes('unknown id "bogus"'))).toBe(true)
    })
    it('rejects a duplicate activity id', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({ sessionActivities: ['warmup', 'warmup'] }))
        expect(errors.some(e => e.includes('duplicate id "warmup"'))).toBe(true)
    })
    it('SESSION_ACTIVITIES is the exact closed 8-value set', () => {
        expect([...SESSION_ACTIVITIES].sort()).toEqual(
            ['abs', 'bag-workout', 'cardio', 'cooldown', 'corrective-exercises', 'mobility', 'other', 'warmup'].sort()
        )
        expect(SESSION_ACTIVITIES).toHaveLength(8)
    })
})

describe('validateCartridgeSessionPayload — otherActivity', () => {
    it('valid when "other" selected and non-blank, <=120 chars', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({
            sessionActivities: ['other'], otherActivity: 'Did some sled pushes',
        }))
        expect(errors).toEqual([])
    })
    it('rejects presence without "other" selected', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({
            sessionActivities: ['warmup'], otherActivity: 'stray text',
        }))
        expect(errors.some(e => e.includes('otherActivity must not be present'))).toBe(true)
    })
    it('rejects a blank string', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({
            sessionActivities: ['other'], otherActivity: '   ',
        }))
        expect(errors.some(e => e.includes('otherActivity'))).toBe(true)
    })
    it('rejects a value over 120 characters', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({
            sessionActivities: ['other'], otherActivity: 'x'.repeat(121),
        }))
        expect(errors.some(e => e.includes('otherActivity'))).toBe(true)
    })
    it('accepts exactly 120 characters', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({
            sessionActivities: ['other'], otherActivity: 'x'.repeat(120),
        }))
        expect(errors).toEqual([])
    })
    it('rejects a multi-line value', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({
            sessionActivities: ['other'], otherActivity: 'line one\nline two',
        }))
        expect(errors.some(e => e.includes('otherActivity'))).toBe(true)
    })
    it('is absent-tolerant when "other" is selected but the field was left blank (not itself an error)', () => {
        const errors = validateCartridgeSessionPayload(validTrainingPayload({ sessionActivities: ['other'] }))
        expect(errors).toEqual([])
    })
})

describe('validateCartridgeSessionPayload — exact numeric ranges (schema §5)', () => {
    it('rejects completeness out of 0..100, NaN, Infinity', () => {
        for (const bad of [-1, 101, NaN, Infinity]) {
            expect(validateCartridgeSessionPayload(validTrainingPayload({ completeness: bad })).length).toBeGreaterThan(0)
        }
    })
    it('rejects cartridgeSchemaVersion that is not a positive integer', () => {
        for (const bad of [0, -1, 1.5, NaN]) {
            expect(validateCartridgeSessionPayload(validTrainingPayload({ cartridgeSchemaVersion: bad })).length).toBeGreaterThan(0)
        }
    })
    it('rejects sessionDuration that is negative or non-integer', () => {
        for (const bad of [-1, 1.5, NaN]) {
            expect(validateCartridgeSessionPayload(validCustomPayload({ sessionDuration: bad })).length).toBeGreaterThan(0)
        }
    })
    it('rejects an out-of-range performed.sets[] entry: negative kg, negative/fractional reps, rpe > 10, negative rir', () => {
        const badKg = validTrainingPayload()
        badKg.blocks[0].items[0].performed.sets = [{ kg: -1, reps: 4 }]
        expect(validateCartridgeSessionPayload(badKg).length).toBeGreaterThan(0)

        const badReps = validTrainingPayload()
        badReps.blocks[0].items[0].performed.sets = [{ kg: 100, reps: -1 }]
        expect(validateCartridgeSessionPayload(badReps).length).toBeGreaterThan(0)

        const badRpe = validTrainingPayload()
        badRpe.blocks[0].items[0].performed.sets = [{ kg: 100, reps: 4, rpe: 11 }]
        expect(validateCartridgeSessionPayload(badRpe).length).toBeGreaterThan(0)

        const badRir = validTrainingPayload()
        badRir.blocks[0].items[0].performed.sets = [{ kg: 100, reps: 4, rir: -1 }]
        expect(validateCartridgeSessionPayload(badRir).length).toBeGreaterThan(0)
    })
    it('accepts an RPE/RIR-only set entry (no kg/reps) — the fixed normalizeSets defect, at the validator level', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].performed.sets = [{ rpe: 9 }]
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })
    it('rejects a pair-set entry carrying rpe or rir', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.pair = { name: 'Broad Jump', sets: 3, reps: '3' }
        payload.blocks[0].items[0].performed.pair = { sets: [{ reps: 3, rpe: 7 }] }
        expect(validateCartridgeSessionPayload(payload).length).toBeGreaterThan(0)
    })
})

describe('validateCartridgeSessionPayload — nested closed-key validation', () => {
    it('rejects an unknown key inside prescribed', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.bogus = true
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('unknown key "bogus"'))).toBe(true)
    })
    it('rejects a mobility/cooldown prescribed key not on its allowlist (e.g. "sets")', () => {
        const payload = validTrainingPayload()
        payload.blocks[1].items[0].prescribed.sets = 3
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('unknown key "sets"'))).toBe(true)
    })
    it('rejects performed.done / performed.roundsCompleted on mobility/cooldown/conditioning (the v1 shape, forbidden in v2)', () => {
        const payload = validTrainingPayload()
        payload.blocks[1].items[0].performed = { done: true }
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('no completion tracking permitted'))).toBe(true)
    })
    it('rejects an unknown key inside a performed.sets[] entry', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].performed.sets = [{ kg: 100, reps: 4, bogus: 1 }]
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('unknown key "bogus"'))).toBe(true)
    })
    it('rejects an unknown top-level item key', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].bogus = 1
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('unknown key "bogus"'))).toBe(true)
    })
    it('rejects an unknown block kind', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].kind = 'bogus-kind'
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('unknown'))).toBe(true)
    })
})

describe('validateCartridgeSessionPayload — substitution invariants (independently re-derived)', () => {
    it('rejects substituted=true with performed.name absent', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].substituted = true
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('substituted=true'))).toBe(true)
    })
    it('rejects substituted=true with performed.name equal to prescribed.name', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].substituted = true
        payload.blocks[0].items[0].performed.name = 'Barbell Back Squat'
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('substituted=true'))).toBe(true)
    })
    it('rejects substituted=false with performed.name present', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].performed.name = 'Front Squat'
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('substituted=false'))).toBe(true)
    })
    it('accepts a genuine substitution: substituted=true, performed.name different and non-empty', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].substituted = true
        payload.blocks[0].items[0].performed.name = 'Front Squat'
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })
})

describe('isReadableCartridgeRow / isHistoricalV1Row — reader tolerance (§10)', () => {
    it('accepts both v1 and v2 rows as readable cartridge rows', () => {
        expect(isReadableCartridgeRow(historicalV1Payload())).toBe(true)
        expect(isReadableCartridgeRow(validTrainingPayload())).toBe(true)
    })
    it('rejects a legacy row (no sessionKind) and a non-cartridge sessionKind', () => {
        expect(isReadableCartridgeRow({ sessionType: 'S&C', day: 1 })).toBe(false)
        expect(isReadableCartridgeRow({ sessionKind: 'something-else', payloadVersion: 2 })).toBe(false)
    })
    it('never throws on null/undefined/non-object input', () => {
        expect(isReadableCartridgeRow(null)).toBe(false)
        expect(isReadableCartridgeRow(undefined)).toBe(false)
        expect(isReadableCartridgeRow('a string')).toBe(false)
    })
    it('isHistoricalV1Row is true only for payloadVersion 1 cartridge rows', () => {
        expect(isHistoricalV1Row(historicalV1Payload())).toBe(true)
        expect(isHistoricalV1Row(validTrainingPayload())).toBe(false)
        expect(isHistoricalV1Row({ sessionType: 'S&C' })).toBe(false)
    })
})

// ─── normalizeSets — the RPE/RIR-only preservation fix ──────────────────────

describe('normalizeSets', () => {
    it('preserves an RPE/RIR-only entry (the fixed defect)', () => {
        expect(normalizeSets([{ rpe: 9 }])).toEqual([{ rpe: 9 }])
        expect(normalizeSets([{ rir: 1 }])).toEqual([{ rir: 1 }])
    })
    it('drops a truly empty entry (nothing at all)', () => {
        expect(normalizeSets([{}])).toEqual([])
        expect(normalizeSets([{ kg: '', reps: undefined }])).toEqual([])
    })
    it('coerces numeric strings and drops non-finite/garbage values', () => {
        expect(normalizeSets([{ kg: '100', reps: '4' }])).toEqual([{ kg: 100, reps: 4 }])
        expect(normalizeSets([{ kg: 'not-a-number', reps: '4' }])).toEqual([{ reps: 4 }])
    })
    it('keeps every entry, including extra sets beyond any prescribed count (retention, not truncation)', () => {
        const sets = [{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }, { kg: 100, reps: 3 }, { kg: 90, reps: 5 }]
        expect(normalizeSets(sets)).toHaveLength(4)
    })
    it('non-array input returns []', () => {
        expect(normalizeSets(undefined)).toEqual([])
        expect(normalizeSets(null)).toEqual([])
    })
})

describe('normalizePairSets — never carries rpe/rir even if raw input had them', () => {
    it('strips rpe/rir from a pair-set entry', () => {
        expect(normalizePairSets([{ kg: 24, reps: 6, rpe: 8, rir: 1 }])).toEqual([{ kg: 24, reps: 6 }])
    })
    it('preserves a reps-only pair entry (no kg)', () => {
        expect(normalizePairSets([{ reps: 3 }])).toEqual([{ reps: 3 }])
    })
})

// ─── buildPrescribed — allowlist projection, never a spread ────────────────

describe('buildPrescribed', () => {
    it('projects only the allowed keys for strength/core, dropping anything else', () => {
        const cartridgeItem = { name: 'Back Squat', target: 'Quads', sets: 4, reps: '4', prescription: { rpe: 8 }, pair: null, superset: null, cue: 'brace hard', internalNote: 'author only' }
        const prescribed = buildPrescribed('strength', cartridgeItem)
        expect(prescribed).toEqual({ name: 'Back Squat', target: 'Quads', sets: 4, reps: '4', prescription: { rpe: 8 }, pair: null, superset: null })
        expect(prescribed).not.toHaveProperty('cue')
        expect(prescribed).not.toHaveProperty('internalNote')
    })
    it('projects only name+dose for mobility/cooldown', () => {
        const prescribed = buildPrescribed('mobility', { name: 'Hip 90/90', dose: '2x60s', cue: 'slow' })
        expect(prescribed).toEqual({ name: 'Hip 90/90', dose: '2x60s' })
    })
    it('projects rounds/roundLength/rest/perRound for conditioning', () => {
        const prescribed = buildPrescribed('conditioning', { name: 'Bag Rounds', rounds: 6, roundLength: '3 min', rest: '60s', perRound: ['R1'], cue: 'x' })
        expect(prescribed).toEqual({ name: 'Bag Rounds', rounds: 6, roundLength: '3 min', rest: '60s', perRound: ['R1'] })
    })
    it('omits an unset optional field rather than null-filling it', () => {
        const prescribed = buildPrescribed('strength', { name: 'Squat', sets: 4, reps: '4' })
        expect(prescribed).not.toHaveProperty('pair')
        expect(prescribed).not.toHaveProperty('superset')
    })
})

// ─── buildPerformed — substitution derivation ───────────────────────────────

describe('buildPerformed', () => {
    it('derives substituted=false and omits performed.name when the name matches prescribed', () => {
        const prescribed = { name: 'Back Squat' }
        const { performed, substituted } = buildPerformed('strength', prescribed, { name: 'Back Squat', sets: [{ kg: 100, reps: 4 }] })
        expect(substituted).toBe(false)
        expect(performed).not.toHaveProperty('name')
    })
    it('derives substituted=true and sets performed.name when a genuinely different name is given', () => {
        const prescribed = { name: 'Back Squat' }
        const { performed, substituted } = buildPerformed('strength', prescribed, { name: 'Front Squat', sets: [] })
        expect(substituted).toBe(true)
        expect(performed.name).toBe('Front Squat')
    })
    it('mobility/cooldown/conditioning performed defaults to {} — no completion fields', () => {
        const { performed, substituted } = buildPerformed('mobility', { name: 'Hip 90/90' }, {})
        expect(performed).toEqual({})
        expect(substituted).toBe(false)
    })
    it('strength/core performed retains a valid pair only when it has real sets', () => {
        const prescribed = { name: 'Bulgarian Split Squat', pair: { name: 'Broad Jump', sets: 3 } }
        const { performed } = buildPerformed('strength', prescribed, { sets: [], pair: { sets: [{ reps: 3 }] } })
        expect(performed.pair).toEqual({ sets: [{ reps: 3 }] })
    })
    it('omits pair entirely when no pair sets were performed', () => {
        const prescribed = { name: 'Bulgarian Split Squat', pair: { name: 'Broad Jump', sets: 3 } }
        const { performed } = buildPerformed('strength', prescribed, { sets: [] })
        expect(performed).not.toHaveProperty('pair')
    })
})

// ─── buildCartridgeSessionPayload — full builder round-trips validator ──────

describe('buildCartridgeSessionPayload', () => {
    it('produces a payload that itself passes validateCartridgeSessionPayload (training)', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-1', date: '2026-08-02', startedAt: '2026-08-02T17:00:00.000Z',
            completedAt: '2026-08-02T18:00:00.000Z', sessionCategory: 'strength-conditioning',
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            sessionActivities: ['warmup'], notes: 'good',
            computeCompleteness: computeCartridgeCompleteness,
            blocks: [
                {
                    kind: 'strength', label: 'Strength',
                    items: [{
                        itemId: 'd1-str-1',
                        cartridgeItem: { name: 'Back Squat', target: 'Quads', sets: 4, reps: '4', prescription: { rpe: 8 } },
                        performedInput: { sets: [{ kg: '100', reps: '4', rpe: '7' }, { rpe: '9' }] },
                    }],
                },
            ],
        })
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
        expect(payload.payloadVersion).toBe(2)
        expect(payload.completeness).toBeLessThan(100) // 1 of 4 prescribed main sets filled
    })

    it('omits completeness when total units is zero (mobility-only training day)', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-2', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            sessionActivities: [], computeCompleteness: computeCartridgeCompleteness,
            blocks: [{ kind: 'mobility', label: 'Warm-up', items: [{ itemId: 'm1', cartridgeItem: { name: 'Hip 90/90', dose: '2x60s' }, performedInput: {} }] }],
        })
        expect(payload).not.toHaveProperty('completeness')
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })

    it('builds a valid rest-day payload (empty blocks, no sessionActivities/completeness)', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-3', date: '2026-08-04', completedAt: '2026-08-04T09:00:00.000Z',
            sessionCategory: 'rest', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Rest', dayType: 'rest', phaseId: 'phase1',
        })
        expect(payload.blocks).toEqual([])
        expect(payload).not.toHaveProperty('sessionActivities')
        expect(payload).not.toHaveProperty('completeness')
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })

    it('builds a valid custom-day payload with sessionDuration/customContent', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-4', date: '2026-08-05', completedAt: '2026-08-05T19:00:00.000Z',
            sessionCategory: 'combat', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Fight', dayType: 'custom', phaseId: null,
            sessionActivities: ['bag-workout', 'other'], otherActivity: 'extra rounds',
            sessionDuration: '75', customContent: '6 rounds sparring',
        })
        expect(payload.sessionDuration).toBe(75)
        expect(payload.customContent).toBe('6 rounds sparring')
        expect(payload.otherActivity).toBe('extra rounds')
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })

    it('never emits any of the forbidden legacy keys', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-5', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null, sessionActivities: [],
        })
        for (const key of FORBIDDEN_LEGACY_KEYS) expect(payload).not.toHaveProperty(key)
    })

    it('never leaks UI-only fields (blockOpen/scrollY) into a built payload', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-6', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null, sessionActivities: [],
            blockOpen: { strength: true }, scrollY: 400, // if a caller accidentally spread its whole state in
        })
        expect(payload).not.toHaveProperty('blockOpen')
        expect(payload).not.toHaveProperty('scrollY')
    })
})
