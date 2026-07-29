/**
 * cartridgeLogInput.test.js — A7b raw-input assembly for
 * DBProvider.logCartridgeSession (corrective plan finding B/J10, Step 1).
 * CartridgeToday.jsx calls these SAME exported functions in production —
 * this proves the exact shape handed to the provider for training, custom,
 * and rest/recovery days.
 */
import { describe, it, expect } from 'vitest'
import { buildBlockInputs, buildTrainingOrCustomLogInput, buildRestOrRecoveryLogInput } from './cartridgeLogInput.js'
import { buildCartridgeSessionPayload, validateCartridgeSessionPayload } from './cartridgeSessionPayload.js'

const FIXED_NOW = () => new Date('2026-08-02T18:21:40.115Z')

const TRAINING_DAY = {
    label: 'Day 1 — S&C', blocks: [
        {
            kind: 'strength', label: 'Strength & Power',
            items: [{ id: 'd1-str-1', name: 'Barbell Back Squat', sets: 4, reps: '4' }],
        },
    ],
}

describe('buildBlockInputs', () => {
    it('assembles one block entry per item with the performed sets/pair carried through', () => {
        const itemStateById = { 'd1-str-1': { sets: [{ kg: 100, reps: 4 }] } }
        const blocks = buildBlockInputs(TRAINING_DAY.blocks, itemStateById, {}, {})
        expect(blocks).toEqual([{
            kind: 'strength', label: 'Strength & Power',
            items: [{
                itemId: 'd1-str-1',
                cartridgeItem: TRAINING_DAY.blocks[0].items[0],
                performedInput: { sets: [{ kg: 100, reps: 4 }], pair: undefined },
                note: undefined,
            }],
        }])
    })

    it('carries a substituted name and a per-item note through', () => {
        const blocks = buildBlockInputs(
            TRAINING_DAY.blocks,
            { 'd1-str-1': { sets: [] } },
            { 'd1-str-1': 'Front Squat' },
            { 'd1-str-1': 'felt heavy' },
        )
        expect(blocks[0].items[0].performedInput.name).toBe('Front Squat')
        expect(blocks[0].items[0].note).toBe('felt heavy')
    })

    it('tolerates missing/empty inputs without throwing', () => {
        expect(buildBlockInputs(undefined, {}, {}, {})).toEqual([])
        expect(buildBlockInputs([], undefined, undefined, undefined)).toEqual([])
    })
})

describe('buildTrainingOrCustomLogInput', () => {
    const base = {
        startedAt: '2026-08-02T17:04:11.902Z',
        cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
        cartridgeDay: 1, day: TRAINING_DAY, cartridgePhaseId: null,
        itemStateById: { 'd1-str-1': { sets: [{ kg: 100, reps: 4 }] } },
        substitutions: {}, itemNotes: {}, cartridgeNotes: 'Solid session.',
        sessionActivities: ['warmup'], otherActivity: '', sessionDuration: '', customSessionContent: '',
        now: FIXED_NOW,
    }

    it('builds a raw training-day input the provider can build+validate as-is', () => {
        const rawInput = buildTrainingOrCustomLogInput({ ...base, dayType: 'training', category: 'strength-conditioning' })
        expect(rawInput).toMatchObject({
            date: '2026-08-02', startedAt: '2026-08-02T17:04:11.902Z', completedAt: '2026-08-02T18:21:40.115Z',
            sessionCategory: 'strength-conditioning', cartridgeId: 'combatos-operator-2026',
            dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1 — S&C', dayType: 'training', phaseId: null,
            notes: 'Solid session.', sessionActivities: ['warmup'],
        })
        expect(rawInput.blocks).toHaveLength(1)
        expect(rawInput.sessionDuration).toBeUndefined()
        expect(rawInput.customContent).toBeUndefined()

        const payload = buildCartridgeSessionPayload({ ...rawInput, sessionId: 'uuid-1' })
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })

    it('builds a raw custom-day input with blocks:[] and sessionDuration/customContent present', () => {
        const rawInput = buildTrainingOrCustomLogInput({
            ...base, dayType: 'custom', category: 'combat',
            sessionDuration: 75, customSessionContent: '6 rounds sparring',
            day: { label: 'Day 2 — Fight' },
        })
        expect(rawInput.blocks).toEqual([])
        expect(rawInput.sessionDuration).toBe(75)
        expect(rawInput.customContent).toBe('6 rounds sparring')

        const payload = buildCartridgeSessionPayload({ ...rawInput, sessionId: 'uuid-2' })
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })

    it('omits otherActivity unless "other" is selected', () => {
        const withOther = buildTrainingOrCustomLogInput({
            ...base, dayType: 'training', category: 'strength-conditioning',
            sessionActivities: ['other'], otherActivity: 'sled pushes',
        })
        expect(withOther.otherActivity).toBe('sled pushes')

        const withoutOther = buildTrainingOrCustomLogInput({ ...base, dayType: 'training', category: 'strength-conditioning' })
        expect(withoutOther.otherActivity).toBeUndefined()
    })
})

describe('buildRestOrRecoveryLogInput', () => {
    it('builds a raw rest-day input with blocks:[] and no sessionActivities/completeness', () => {
        const rawInput = buildRestOrRecoveryLogInput({
            activeCartridge: { cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', schemaVersion: 3 },
            effectiveSelectedDay: 2,
            selectedDayDef: { label: 'Day 2 — Rest', type: 'rest' },
            phaseBlock: null,
            category: 'rest',
            now: FIXED_NOW,
        })
        expect(rawInput).toEqual({
            date: '2026-08-02', completedAt: '2026-08-02T18:21:40.115Z',
            sessionCategory: 'rest',
            cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
            dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Rest', dayType: 'rest', phaseId: null,
            blocks: [],
        })

        const payload = buildCartridgeSessionPayload({ ...rawInput, sessionId: 'uuid-3' })
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
        expect(payload).not.toHaveProperty('sessionActivities')
        expect(payload).not.toHaveProperty('completeness')
    })

    it('builds a raw recovery-day input carrying the phase id when present', () => {
        const rawInput = buildRestOrRecoveryLogInput({
            activeCartridge: { cartridgeId: 'apex-protocol-phase1', cartridgeVersion: '1.0.0', schemaVersion: 2 },
            effectiveSelectedDay: 5,
            selectedDayDef: { label: 'Day 5 — Recovery', type: 'recovery' },
            phaseBlock: { id: 'phase1', label: 'Phase 1' },
            category: 'recovery',
            now: FIXED_NOW,
        })
        expect(rawInput.phaseId).toBe('phase1')
        const payload = buildCartridgeSessionPayload({ ...rawInput, sessionId: 'uuid-4' })
        expect(validateCartridgeSessionPayload(payload)).toEqual([])
    })
})
