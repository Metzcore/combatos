/**
 * validateCartridge.test.js
 *
 * Pins Part A (structural validation) of the authoring reviewer checklist
 * against the cartridge spec's rules. Uses inline fixtures for each rule, plus
 * a regression guard that the two real authored cartridges validate clean.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { validateCartridge } from './validateCartridge.js'

/** A minimal, structurally-valid training cartridge to mutate per test. */
function validCartridge() {
    return {
        cartridgeId: 'test-cartridge',
        type: 'training',
        label: 'Test',
        prescription: 'rpe',
        cycle: { dayCount: 3 },
        days: [
            {
                day: 1,
                label: 'Day 1',
                type: 'training',
                exercises: [
                    { id: 'd1-ex1', name: 'Squat', superset: null, sets: 3, reps: '5', prescription: { rpe: 8 }, cue: 'Brace.' }
                ]
            },
            { day: 2, label: 'Day 2', type: 'rest' },
            { day: 3, label: 'Day 3', type: 'custom', focus: 'Free-form' }
        ],
        features: { hipScoreRouting: false, bagWork: false }
    }
}

describe('validateCartridge — valid input', () => {
    it('accepts a minimal valid training cartridge', () => {
        expect(validateCartridge(validCartridge())).toEqual([])
    })
})

describe('validateCartridge — rule 1: required fields + model', () => {
    it.each(['cartridgeId', 'label', 'prescription'])('flags missing %s', (field) => {
        const c = validCartridge()
        delete c[field]
        expect(validateCartridge(c).join(' ')).toContain(field)
    })

    it('flags an unknown prescription model', () => {
        const c = validCartridge()
        c.prescription = 'made-up'
        expect(validateCartridge(c).some((e) => e.includes('not one of'))).toBe(true)
    })
})

describe('validateCartridge — rule 2: day coverage', () => {
    it('flags a gap in the day sequence', () => {
        const c = validCartridge()
        c.days = c.days.filter((d) => d.day !== 2)
        expect(validateCartridge(c).some((e) => e.includes('missing day 2'))).toBe(true)
    })

    it('flags a duplicate day number', () => {
        const c = validCartridge()
        c.days[1].day = 1
        expect(validateCartridge(c).some((e) => e.includes('duplicate day number 1'))).toBe(true)
    })

    it('flags a day number outside the cycle', () => {
        const c = validCartridge()
        c.days[2].day = 9
        expect(validateCartridge(c).some((e) => e.includes('outside 1..3'))).toBe(true)
    })

    it('flags a non-positive dayCount', () => {
        const c = validCartridge()
        c.cycle.dayCount = 0
        expect(validateCartridge(c).some((e) => e.includes('dayCount'))).toBe(true)
    })
})

describe('validateCartridge — rule 3: day-type / exercise coupling', () => {
    it('flags a training day with no exercises', () => {
        const c = validCartridge()
        c.days[0].exercises = []
        expect(validateCartridge(c).some((e) => e.includes('must have at least one exercise'))).toBe(true)
    })

    it('flags a rest day that carries exercises', () => {
        const c = validCartridge()
        c.days[1].exercises = [{ id: 'x', name: 'X', sets: 1, reps: '1', cue: 'c', prescription: { rpe: 8 } }]
        expect(validateCartridge(c).some((e) => e.includes('rest day must have no exercises'))).toBe(true)
    })

    it('flags an unknown day type', () => {
        const c = validCartridge()
        c.days[2].type = 'party'
        expect(validateCartridge(c).some((e) => e.includes('unknown day type'))).toBe(true)
    })
})

describe('validateCartridge — rule 4: unique exercise ids', () => {
    it('flags a duplicate exercise id', () => {
        const c = validCartridge()
        c.days[0].exercises.push({ id: 'd1-ex1', name: 'Row', sets: 3, reps: '5', cue: 'Pull.', prescription: { rpe: 8 } })
        expect(validateCartridge(c).some((e) => e.includes('duplicate exercise id'))).toBe(true)
    })
})

describe('validateCartridge — rule 5: supersets group >= 2', () => {
    it('flags a lone superset label', () => {
        const c = validCartridge()
        c.days[0].exercises[0].superset = 'A'
        expect(validateCartridge(c).some((e) => e.includes('superset "A" groups only 1'))).toBe(true)
    })

    it('accepts a superset label shared by two exercises', () => {
        const c = validCartridge()
        c.days[0].exercises[0].superset = 'A'
        c.days[0].exercises.push({ id: 'd1-ex2', name: 'Row', superset: 'A', sets: 3, reps: '5', cue: 'Pull.', prescription: { rpe: 8 } })
        expect(validateCartridge(c)).toEqual([])
    })
})

describe('validateCartridge — rule 6: prescription matches model', () => {
    it('accepts rpe or rir under the rpe model', () => {
        const c = validCartridge()
        c.days[0].exercises[0].prescription = { rir: 3 }
        expect(validateCartridge(c)).toEqual([])
    })

    it('flags an rpe-model exercise with neither rpe nor rir', () => {
        const c = validCartridge()
        c.days[0].exercises[0].prescription = {}
        expect(validateCartridge(c).some((e) => e.includes('requires a numeric "rpe" or "rir"'))).toBe(true)
    })

    it('requires a numeric percent under percent-1rm', () => {
        const c = validCartridge()
        c.prescription = 'percent-1rm'
        c.days[0].exercises[0].prescription = {}
        expect(validateCartridge(c).some((e) => e.includes('percent-1rm requires'))).toBe(true)
    })

    it('rejects stray keys under straight-sets', () => {
        const c = validCartridge()
        c.prescription = 'straight-sets'
        c.days[0].exercises[0].prescription = { rpe: 8 }
        expect(validateCartridge(c).some((e) => e.includes('straight-sets prescription allows only'))).toBe(true)
    })
})

describe('validateCartridge — Part A extras: required exercise fields', () => {
    it.each(['name', 'sets', 'reps', 'cue'])('flags an exercise missing %s', (field) => {
        const c = validCartridge()
        delete c.days[0].exercises[0][field]
        expect(validateCartridge(c).join(' ')).toContain(field)
    })
})

describe('validateCartridge — rule 7: known feature flags', () => {
    it('flags an unknown feature flag', () => {
        const c = validCartridge()
        c.features.warpDrive = true
        expect(validateCartridge(c).some((e) => e.includes('unknown feature flag'))).toBe(true)
    })
})

describe('validateCartridge — non-object input', () => {
    it.each([null, undefined, 42, 'x', []])('rejects %s', (input) => {
        expect(validateCartridge(input)).toEqual(['cartridge must be an object'])
    })
})

describe('validateCartridge — content cartridge', () => {
    it('accepts a minimal valid content cartridge', () => {
        const c = {
            cartridgeId: 'theory-v1',
            type: 'content',
            label: 'Theory',
            sections: [{ id: 's1', title: 'Principles', items: [{ id: 'i1', title: 'Overload', body: '...' }] }]
        }
        expect(validateCartridge(c)).toEqual([])
    })

    it('flags an empty content cartridge and a stray prescription', () => {
        const c = { cartridgeId: 'x', type: 'content', sections: [], prescription: 'rpe' }
        const errors = validateCartridge(c)
        expect(errors.some((e) => e.includes('non-empty sections'))).toBe(true)
        expect(errors.some((e) => e.includes('must not declare a prescription'))).toBe(true)
    })
})

describe('validateCartridge — real authored cartridges (regression guard)', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const load = (name) => JSON.parse(readFileSync(resolve(here, '../../../cartridges/', name), 'utf8'))

    it.each(['combatos-foundation-2026.json', 'combatos-operator-2026.json'])('%s validates clean', (name) => {
        expect(validateCartridge(load(name))).toEqual([])
    })
})
