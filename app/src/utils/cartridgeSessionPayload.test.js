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
        // 2 of 4 prescribed main sets filled (the third entry is RPE-only, no
        // pair prescribed) — must exactly match computeCartridgeCompleteness's
        // real output; the "completeness is non-injectable" tests below prove
        // the validator recomputes and enforces this rather than trusting it.
        completeness: 50,
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
    it('blocks: [] is structurally valid on a training day (no invented "must have a block" rule) — but then has zero measurable units, so completeness must be absent', () => {
        // Confirms the validator doesn't invent a "must have at least one
        // block" rule for cartridge sessions (unlike the CARTRIDGE spec's
        // day-authoring rule, a different, cartridge-definition-level
        // concern) — the only consequence of an empty blocks array is that
        // completeness has nothing to measure (finding #3's recompute rule).
        const payload = validTrainingPayload({ blocks: [] })
        delete payload.completeness
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
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
    it('SESSION_ACTIVITIES is the exact closed 9-value set', () => {
        expect([...SESSION_ACTIVITIES].sort()).toEqual(
            ['abs', 'bag-workout', 'cardio', 'cooldown', 'corrective-exercises', 'mobility', 'other', 'warmup', 'weights'].sort()
        )
        expect(SESSION_ACTIVITIES).toHaveLength(9)
    })
    it("accepts 'weights' as a valid activity id", () => {
        expect(validateCartridgeSessionPayload(validTrainingPayload({ sessionActivities: ['weights'] }))).toEqual([])
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
        payload.completeness = 0 // 0 of 4 main sets filled now (rpe-only never counts as filled)
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
    it('drops a truly empty entry (nothing at all — legitimately "not entered")', () => {
        expect(normalizeSets([{}])).toEqual([])
        expect(normalizeSets([{ kg: '', reps: undefined }])).toEqual([])
    })
    it('coerces legitimate numeric strings', () => {
        expect(normalizeSets([{ kg: '100', reps: '4' }])).toEqual([{ kg: 100, reps: 4 }])
    })
    it('never silently truncates a fractional reps/rir value into a valid integer (finding #5)', () => {
        expect(normalizeSets([{ kg: 100, reps: 4.5 }])).toEqual([{ kg: 100, reps: 4.5 }])
        expect(normalizeSets([{ kg: 100, reps: 4, rir: 1.5 }])).toEqual([{ kg: 100, reps: 4, rir: 1.5 }])
    })
    it('never silently drops a present-but-invalid non-numeric value — preserves it verbatim for the validator to reject (finding #5)', () => {
        expect(normalizeSets([{ kg: 'not-a-number', reps: '4' }])).toEqual([{ kg: 'not-a-number', reps: 4 }])
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

    it("preserves 'weights' in sessionActivities verbatim", () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-1b', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning',
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            sessionActivities: ['weights', 'warmup'],
            blocks: [
                {
                    kind: 'strength', label: 'Strength',
                    items: [{
                        itemId: 'd1-str-1',
                        cartridgeItem: { name: 'Back Squat', target: 'Quads', sets: 4, reps: '4', prescription: { rpe: 8 } },
                        performedInput: { sets: [{ kg: '100', reps: '4' }] },
                    }],
                },
            ],
        })
        expect(payload.sessionActivities).toEqual(['weights', 'warmup'])
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })

    it("selecting 'weights' has zero effect on completeness", () => {
        const baseInput = {
            sessionId: 'uuid-build-1c', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning',
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            blocks: [
                {
                    kind: 'strength', label: 'Strength',
                    items: [{
                        itemId: 'd1-str-1',
                        cartridgeItem: { name: 'Back Squat', target: 'Quads', sets: 4, reps: '4', prescription: { rpe: 8 } },
                        performedInput: { sets: [{ kg: '100', reps: '4' }] },
                    }],
                },
            ],
        }
        const without = buildCartridgeSessionPayload({ ...baseInput, sessionActivities: [] })
        const withWeights = buildCartridgeSessionPayload({ ...baseInput, sessionActivities: ['weights'] })
        expect(withWeights.completeness).toBe(without.completeness)
    })

    it('omits completeness when total units is zero (mobility-only training day)', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-build-2', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            sessionActivities: [],
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

// ─── Finding #3 — completeness is non-injectable ────────────────────────────

function buildInputWithOneFilledSetOfFour(overrides = {}) {
    return {
        sessionId: 'uuid-nc-1', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
        sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
        dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null, sessionActivities: [],
        blocks: [{
            kind: 'strength', label: 'Strength',
            items: [{ itemId: 'd1-str-1', cartridgeItem: { name: 'Back Squat', sets: 4, reps: '4' }, performedInput: { sets: [{ kg: 100, reps: 4 }] } }],
        }],
        ...overrides,
    }
}

describe('buildCartridgeSessionPayload — completeness is non-injectable (finding #3)', () => {
    it('has no computeCompleteness (or any other) input parameter that influences the value — always the real recompute', () => {
        const payload = buildCartridgeSessionPayload(buildInputWithOneFilledSetOfFour({
            computeCompleteness: () => 999, // a caller trying to inject a fake algorithm
        }))
        expect(payload.completeness).toBe(25) // 1 of 4 — the REAL algorithm, ignoring the injected function entirely
    })

    it('builder output always matches computeCartridgeCompleteness(blocks, dayType) exactly', () => {
        const payload = buildCartridgeSessionPayload(buildInputWithOneFilledSetOfFour())
        expect(payload.completeness).toBe(computeCartridgeCompleteness(payload.blocks, payload.dayType))
    })

    it('the validator independently recomputes and REJECTS a payload whose completeness was falsified after building (builder-plus-validator regression)', () => {
        const payload = buildCartridgeSessionPayload(buildInputWithOneFilledSetOfFour())
        expect(payload.completeness).toBe(25)
        payload.completeness = 99 // simulate a tampered/incorrect value reaching the validator directly
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('must exactly equal the recomputed value'))).toBe(true)
    })

    it('the validator REJECTS a built payload with completeness deleted (omission)', () => {
        const payload = buildCartridgeSessionPayload(buildInputWithOneFilledSetOfFour())
        delete payload.completeness
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('is required'))).toBe(true)
    })

    it('the validator REJECTS a completeness value injected onto a zero-measurable-units built payload (extra)', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-nc-2', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null, sessionActivities: [],
            blocks: [{ kind: 'mobility', label: 'Warm-up', items: [{ itemId: 'm1', cartridgeItem: { name: 'Hip 90/90', dose: '2x60s' }, performedInput: {} }] }],
        })
        expect(payload).not.toHaveProperty('completeness')
        payload.completeness = 50 // caller tries to force one in anyway
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('must be absent'))).toBe(true)
    })
})

// ─── Finding #4 — complete strict nested validation ─────────────────────────

describe('validateCartridgeSessionPayload — block-level strictness', () => {
    it('rejects an unknown key on a block object', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].bogus = 1
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('unknown key "bogus"'))).toBe(true)
    })
    it('requires a non-empty string label', () => {
        const payload = validTrainingPayload()
        delete payload.blocks[0].label
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('.label is required'))).toBe(true)
        payload.blocks[0].label = '   '
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('.label is required'))).toBe(true)
    })
})

describe('validateCartridgeSessionPayload — prescription (strict, frozen vocabulary)', () => {
    it('accepts the documented vocabulary combined freely (percent+rpe, rir+note, addedLoad+note)', () => {
        const p1 = validTrainingPayload()
        p1.blocks[0].items[0].prescribed.prescription = { percent: 0.8, rpe: 8 }
        expect(validateCartridgeSessionPayload(p1)).toEqual([])

        const p2 = validTrainingPayload()
        p2.blocks[0].items[0].prescribed.prescription = { rir: 4, note: 'moderate' }
        expect(validateCartridgeSessionPayload(p2)).toEqual([])

        const p3 = validTrainingPayload()
        p3.blocks[0].items[0].prescribed.prescription = { addedLoad: '20kg', note: 'Phase 1 load' }
        expect(validateCartridgeSessionPayload(p3)).toEqual([])
    })
    it('rejects an unknown/invented prescription field', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.prescription = { rpe: 8, tempo: '3-1-1' }
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescription: unknown key "tempo"'))).toBe(true)
    })
    it('rejects an empty prescription object', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.prescription = {}
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescription must not be an empty object'))).toBe(true)
    })
    it('rejects an out-of-range prescription.rpe and a fractional prescription.rir', () => {
        const badRpe = validTrainingPayload()
        badRpe.blocks[0].items[0].prescribed.prescription = { rpe: 11 }
        expect(validateCartridgeSessionPayload(badRpe).length).toBeGreaterThan(0)

        const badRir = validTrainingPayload()
        badRir.blocks[0].items[0].prescribed.prescription = { rir: 2.5 }
        expect(validateCartridgeSessionPayload(badRir).length).toBeGreaterThan(0)
    })
})

describe('validateCartridgeSessionPayload — prescribed.pair (PAP)', () => {
    it('accepts a well-formed pair', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.pair = { name: 'Box Jump', sets: 4, reps: '3', note: 'Land soft' }
        payload.completeness = 25 // adding 4 prescribed (0 performed) pair units: 2 of (4+4) now
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })
    it('rejects a pair missing name', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.pair = { sets: 3, reps: '3' }
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('pair.name is required'))).toBe(true)
    })
    it('rejects an unknown key inside pair', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.pair = { name: 'Box Jump', sets: 4, reps: '3', bogus: 1 }
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('pair: unknown key "bogus"'))).toBe(true)
    })
    it('rejects a non-positive-integer pair.sets', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.pair = { name: 'Box Jump', sets: 0, reps: '3' }
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('pair.sets must be'))).toBe(true)
    })
    it('null pair is explicitly allowed (no PAP for this item)', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.pair = null
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })
})

describe('validateCartridgeSessionPayload — prescribed.superset', () => {
    it('accepts a non-empty string label or null', () => {
        const withLabel = validTrainingPayload()
        withLabel.blocks[0].items[0].prescribed.superset = 'A'
        expect(validateCartridgeSessionPayload(withLabel)).toEqual([])

        const withNull = validTrainingPayload()
        withNull.blocks[0].items[0].prescribed.superset = null
        expect(validateCartridgeSessionPayload(withNull)).toEqual([])
    })
    it('rejects a blank-string superset label', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.superset = '   '
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('superset must be null or a non-empty string'))).toBe(true)
    })
})

describe('validateCartridgeSessionPayload — conditioning perRound', () => {
    it('accepts an array of strings', () => {
        const payload = validTrainingPayload()
        payload.blocks[1] = { kind: 'conditioning', label: 'Bag', items: [{ itemId: 'c1', prescribed: { name: 'Rounds', rounds: 6, perRound: ['R1', 'R2'] }, performed: {}, substituted: false }] }
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })
    it('rejects a non-array perRound and a non-string entry', () => {
        const notArray = validTrainingPayload()
        notArray.blocks[1] = { kind: 'conditioning', label: 'Bag', items: [{ itemId: 'c1', prescribed: { name: 'Rounds', rounds: 6, perRound: 'R1' }, performed: {}, substituted: false }] }
        expect(validateCartridgeSessionPayload(notArray).some(e => e.includes('perRound must be an array'))).toBe(true)

        const badEntry = validTrainingPayload()
        badEntry.blocks[1] = { kind: 'conditioning', label: 'Bag', items: [{ itemId: 'c1', prescribed: { name: 'Rounds', rounds: 6, perRound: [1, 2] }, performed: {}, substituted: false }] }
        expect(validateCartridgeSessionPayload(badEntry).some(e => e.includes('perRound[0] must be a string'))).toBe(true)
    })
    it('rejects conditioning missing a positive-integer rounds', () => {
        const payload = validTrainingPayload()
        payload.blocks[1] = { kind: 'conditioning', label: 'Bag', items: [{ itemId: 'c1', prescribed: { name: 'Rounds' }, performed: {}, substituted: false }] }
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescribed.rounds must be'))).toBe(true)
    })
})

describe('validateCartridgeSessionPayload — strength/core sets/reps/target strictness', () => {
    it('rejects a missing or non-positive-integer prescribed.sets', () => {
        const payload = validTrainingPayload()
        delete payload.blocks[0].items[0].prescribed.sets
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescribed.sets must be'))).toBe(true)
    })
    it('rejects a missing prescribed.reps', () => {
        const payload = validTrainingPayload()
        delete payload.blocks[0].items[0].prescribed.reps
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescribed.reps must be'))).toBe(true)
    })
    it('rejects a non-string target', () => {
        const payload = validTrainingPayload()
        payload.blocks[0].items[0].prescribed.target = 123
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescribed.target must be a string'))).toBe(true)
    })
})

describe('validateCartridgeSessionPayload — mobility/cooldown dose', () => {
    it('rejects a missing dose', () => {
        const payload = validTrainingPayload()
        delete payload.blocks[1].items[0].prescribed.dose
        expect(validateCartridgeSessionPayload(payload).some(e => e.includes('prescribed.dose is required'))).toBe(true)
    })
})

// ─── Finding #5 — builder-plus-validator regression: no silent repair/drop ──

describe('buildCartridgeSessionPayload + validateCartridgeSessionPayload — invalid input is never silently repaired (finding #5)', () => {
    it('a fractional reps value from raw UI input survives the builder and is rejected by the validator', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-f5-1', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null, sessionActivities: [],
            blocks: [{ kind: 'strength', label: 'Strength', items: [{ itemId: 'd1-str-1', cartridgeItem: { name: 'Back Squat', sets: 4, reps: '4' }, performedInput: { sets: [{ kg: 100, reps: 4.5 }] } }] }],
        })
        expect(payload.blocks[0].items[0].performed.sets).toEqual([{ kg: 100, reps: 4.5 }]) // NOT truncated to 4
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('.reps must be'))).toBe(true)
    })

    it('a fractional sessionDuration from raw UI input survives the builder and is rejected by the validator', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-f5-2', date: '2026-08-05', completedAt: '2026-08-05T19:00:00.000Z',
            sessionCategory: 'combat', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Fight', dayType: 'custom', phaseId: null,
            sessionActivities: [], sessionDuration: '75.5',
        })
        expect(payload.sessionDuration).toBe(75.5) // NOT truncated to 75
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('sessionDuration must be'))).toBe(true)
    })

    it('a non-numeric kg from raw UI input survives the builder as invalid data and is rejected by the validator, rather than being silently dropped', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-f5-3', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null, sessionActivities: [],
            blocks: [{ kind: 'strength', label: 'Strength', items: [{ itemId: 'd1-str-1', cartridgeItem: { name: 'Back Squat', sets: 4, reps: '4' }, performedInput: { sets: [{ kg: 'lots', reps: 4 }] } }] }],
        })
        expect(payload.blocks[0].items[0].performed.sets).toEqual([{ kg: 'lots', reps: 4 }]) // preserved, not dropped to just {reps:4}
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('.kg must be'))).toBe(true)
    })

    it('a duplicate sessionActivities entry from raw input survives the builder and is rejected by the validator, rather than being silently deduplicated', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-f5-4', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            sessionActivities: ['warmup', 'warmup'],
        })
        expect(payload.sessionActivities).toEqual(['warmup', 'warmup']) // NOT silently deduplicated to ['warmup']
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('duplicate id "warmup"'))).toBe(true)
    })

    it('an unknown sessionActivities entry from raw input survives the builder and is rejected by the validator, rather than being silently filtered', () => {
        const payload = buildCartridgeSessionPayload({
            sessionId: 'uuid-f5-5', date: '2026-08-02', completedAt: '2026-08-02T18:00:00.000Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'x', cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
            sessionActivities: ['warmup', 'bogus-activity'],
        })
        expect(payload.sessionActivities).toEqual(['warmup', 'bogus-activity']) // NOT silently filtered out
        const errors = validateCartridgeSessionPayload(payload)
        expect(errors.some(e => e.includes('unknown id "bogus-activity"'))).toBe(true)
    })
})
