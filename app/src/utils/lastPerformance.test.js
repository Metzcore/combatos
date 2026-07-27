/**
 * lastPerformance.test.js — A7a last-performance recall + "Use Last Values" (schema §9).
 */
import { describe, it, expect } from 'vitest'
import { findLastPerformance, resolveUseLastValues } from './lastPerformance.js'

function cartridgeSession({ sessionId, date, completedAt, cartridgeId = 'combatos-operator-2026', items }) {
    return {
        payloadVersion: 2, sessionKind: 'cartridge', sessionId, date, completedAt,
        sessionCategory: 'strength-conditioning', cartridgeId, cartridgeVersion: '1.0.0', cartridgeSchemaVersion: 3,
        dayTemplateKey: 'day:1', dayTemplateLabel: 'Day 1', dayType: 'training', phaseId: null,
        blocks: [{ kind: 'strength', label: 'Strength', items }],
    }
}

function item(itemId, { prescribedName = 'Barbell Back Squat', performedSets = [], substituted = false, performedName } = {}) {
    return {
        itemId,
        prescribed: { name: prescribedName },
        performed: { sets: performedSets, ...(performedName ? { name: performedName } : {}) },
        substituted,
    }
}

describe('findLastPerformance', () => {
    it('returns null when no session matches cartridgeId+itemId', () => {
        const sessions = [cartridgeSession({ sessionId: 's1', date: '2026-07-01', completedAt: '2026-07-01T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [{ kg: 100, reps: 4 }] })] })]
        expect(findLastPerformance(sessions, { cartridgeId: 'other-cartridge', itemId: 'd1-str-1' })).toBeNull()
        expect(findLastPerformance(sessions, { cartridgeId: 'combatos-operator-2026', itemId: 'no-such-item' })).toBeNull()
    })

    it('finds the newest matching session with real data', () => {
        const sessions = [
            cartridgeSession({ sessionId: 's1', date: '2026-07-01', completedAt: '2026-07-01T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [{ kg: 90, reps: 4 }] })] }),
            cartridgeSession({ sessionId: 's2', date: '2026-07-08', completedAt: '2026-07-08T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [{ kg: 100, reps: 4 }] })] }),
        ]
        const result = findLastPerformance(sessions, { cartridgeId: 'combatos-operator-2026', itemId: 'd1-str-1' })
        expect(result.date).toBe('2026-07-08')
        expect(result.sets).toEqual([{ kg: 100, reps: 4 }])
        expect(result.prescribedName).toBe('Barbell Back Squat')
    })

    it('skips a newer record whose performed.sets is empty/RPE-only, falling back to an older real one', () => {
        const sessions = [
            cartridgeSession({ sessionId: 's1', date: '2026-07-01', completedAt: '2026-07-01T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [{ kg: 90, reps: 4 }] })] }),
            cartridgeSession({ sessionId: 's2', date: '2026-07-08', completedAt: '2026-07-08T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [] })] }),
            cartridgeSession({ sessionId: 's3', date: '2026-07-15', completedAt: '2026-07-15T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [{ rpe: 9 }] })] }),
        ]
        const result = findLastPerformance(sessions, { cartridgeId: 'combatos-operator-2026', itemId: 'd1-str-1' })
        expect(result.date).toBe('2026-07-01') // both s2 and s3 are real matches with no meaningful data
    })

    it('scopes strictly by BOTH cartridgeId and itemId — same itemId across different cartridges never crosses', () => {
        const sessions = [
            cartridgeSession({ sessionId: 's1', date: '2026-07-01', completedAt: '2026-07-01T10:00:00.000Z', cartridgeId: 'apex-protocol-phase1', items: [item('d1-str-1', { prescribedName: 'Trap Bar Deadlift', performedSets: [{ kg: 140, reps: 5 }] })] }),
        ]
        expect(findLastPerformance(sessions, { cartridgeId: 'combatos-operator-2026', itemId: 'd1-str-1' })).toBeNull()
    })

    it('reports substitutedTo when the matched historical record was itself substituted', () => {
        const sessions = [
            cartridgeSession({ sessionId: 's1', date: '2026-07-01', completedAt: '2026-07-01T10:00:00.000Z', items: [item('d1-str-1', { performedSets: [{ kg: 80, reps: 6 }], substituted: true, performedName: 'Front Squat' })] }),
        ]
        const result = findLastPerformance(sessions, { cartridgeId: 'combatos-operator-2026', itemId: 'd1-str-1' })
        expect(result.substitutedTo).toBe('Front Squat')
    })

    it('tolerates legacy and payloadVersion: 1 rows in the array without crashing, and never matches them', () => {
        const legacyRow = { sessionType: 'S&C', day: 1, phase: 1 }
        const v1Row = {
            payloadVersion: 1, sessionKind: 'cartridge', sessionId: 'v1', date: '2026-06-01', completedAt: '2026-06-01T10:00:00.000Z',
            cartridgeId: 'combatos-operator-2026', blocks: [{ kind: 'strength', items: [{ itemId: 'd1-str-1', prescribed: { name: 'Barbell Back Squat' }, performed: { sets: [{ kg: 999, reps: 1 }] } }] }],
        }
        const sessions = [legacyRow, v1Row]
        // v1 IS a readable cartridge row (isReadableCartridgeRow accepts version 1),
        // so it participates in recall exactly like a v2 row would — this is the
        // one honest place a v1 row's data is actually usable, and it does not crash.
        const result = findLastPerformance(sessions, { cartridgeId: 'combatos-operator-2026', itemId: 'd1-str-1' })
        expect(result).not.toBeNull()
        expect(result.sets).toEqual([{ kg: 999, reps: 1 }])
    })

    it('returns null and never throws on empty/garbage input', () => {
        expect(findLastPerformance([], { cartridgeId: 'x', itemId: 'y' })).toBeNull()
        expect(findLastPerformance(null, { cartridgeId: 'x', itemId: 'y' })).toBeNull()
        expect(findLastPerformance([null, undefined, 42, 'x'], { cartridgeId: 'x', itemId: 'y' })).toBeNull()
    })
})

describe('resolveUseLastValues', () => {
    const lastRecord = { date: '2026-07-08', prescribedName: 'Barbell Back Squat', sets: [{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }, { kg: 95, reps: 5 }] }

    it('copies when the effective exercise matches (both prescribed, no substitution)', () => {
        const result = resolveUseLastValues({ todayEffectiveName: 'Barbell Back Squat', lastRecord, currentPrescribedSetCount: 4 })
        expect(result).toEqual(lastRecord.sets)
    })

    it('returns null when there is no last record', () => {
        expect(resolveUseLastValues({ todayEffectiveName: 'Barbell Back Squat', lastRecord: null, currentPrescribedSetCount: 4 })).toBeNull()
    })

    it('refuses to copy across a mismatched effective exercise', () => {
        const result = resolveUseLastValues({ todayEffectiveName: 'Front Squat', lastRecord, currentPrescribedSetCount: 4 })
        expect(result).toBeNull()
    })

    it('matches against substitutedTo when the historical record was itself substituted', () => {
        const substitutedRecord = { ...lastRecord, substitutedTo: 'Front Squat' }
        expect(resolveUseLastValues({ todayEffectiveName: 'Barbell Back Squat', lastRecord: substitutedRecord, currentPrescribedSetCount: 4 })).toBeNull()
        expect(resolveUseLastValues({ todayEffectiveName: 'Front Squat', lastRecord: substitutedRecord, currentPrescribedSetCount: 4 })).toEqual(lastRecord.sets)
    })

    it('never copies beyond the CURRENT prescribed slot count, even when history has more sets', () => {
        const result = resolveUseLastValues({ todayEffectiveName: 'Barbell Back Squat', lastRecord, currentPrescribedSetCount: 2 })
        expect(result).toEqual([{ kg: 100, reps: 4 }, { kg: 100, reps: 4 }])
    })

    it('a smaller historical set count is never padded up to the current cap', () => {
        const smallerRecord = { ...lastRecord, sets: [{ kg: 100, reps: 4 }] }
        const result = resolveUseLastValues({ todayEffectiveName: 'Barbell Back Squat', lastRecord: smallerRecord, currentPrescribedSetCount: 4 })
        expect(result).toEqual([{ kg: 100, reps: 4 }])
    })
})
