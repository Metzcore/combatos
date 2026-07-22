/**
 * validateCartridge.test.js
 *
 * Pins Part A (structural validation) for the v3 block-model schema
 * (docs/planning/rebuild/BLOCK-MODEL-DRAFT.md). Inline fixtures per rule, plus
 * a regression guard that the real authored cartridges validate clean.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { validateCartridge } from './validateCartridge.js'

/** A minimal, structurally-valid block-model training cartridge to mutate per test. */
function validCartridge() {
    return {
        cartridgeId: 'test-cartridge',
        type: 'training',
        label: 'Test',
        schemaVersion: 3,
        cartridgeVersion: '1.0.0',
        summary: 'Build useful full-body strength with a simple three-day structure.',
        outcomes: ['Build consistent strength', 'Practise the major movement patterns'],
        tags: ['beginner', 'full-body'],
        requirements: { equipment: ['Dumbbells'] },
        cycle: { dayCount: 3 },
        days: [
            {
                day: 1,
                label: 'Day 1',
                type: 'training',
                blocks: [
                    {
                        kind: 'strength',
                        label: 'Strength',
                        items: [
                            { id: 'd1-str-1', name: 'Squat', sets: 3, reps: '5', prescription: { rpe: 8 }, cue: 'Brace.' }
                        ]
                    },
                    {
                        kind: 'core',
                        label: 'Core',
                        items: [{ id: 'd1-core-1', name: 'Plank', sets: 3, reps: '30s', cue: 'Tight.' }]
                    }
                ]
            },
            { day: 2, label: 'Day 2', type: 'rest' },
            { day: 3, label: 'Day 3', type: 'custom', focus: 'Free-form' }
        ],
        features: { hipScoreRouting: false, bagWork: false }
    }
}

describe('validateCartridge — valid input', () => {
    it('accepts a minimal valid block-model cartridge', () => {
        expect(validateCartridge(validCartridge())).toEqual([])
    })

    it('accepts all five block kinds', () => {
        const c = validCartridge()
        c.days[0].blocks = [
            { kind: 'mobility', items: [{ id: 'm1', name: 'Hip 90/90', dose: '2x60s each side' }] },
            { kind: 'strength', items: [{ id: 's1', name: 'Squat', sets: 4, reps: '4', prescription: { percent: 0.8 }, pair: { name: 'Box Jump', sets: 4, reps: '3' } }] },
            { kind: 'conditioning', items: [{ id: 'b1', name: 'Bag Work', rounds: 6, roundLength: '3 min', perRound: ['R1', 'R2'] }] },
            { kind: 'core', items: [{ id: 'c1', name: 'Pallof', sets: 3, reps: '10' }] },
            { kind: 'cooldown', items: [{ id: 'cl1', name: 'Pigeon', dose: '2x90s each side' }] }
        ]
        expect(validateCartridge(c)).toEqual([])
    })
})

describe('validateCartridge — required cartridge fields', () => {
    it.each(['cartridgeId', 'label'])('flags missing %s', (field) => {
        const c = validCartridge()
        delete c[field]
        expect(validateCartridge(c).join(' ')).toContain(field)
    })

    it('flags a non-positive dayCount', () => {
        const c = validCartridge()
        c.cycle.dayCount = 0
        expect(validateCartridge(c).some((e) => e.includes('dayCount'))).toBe(true)
    })
})

describe('validateCartridge — v3 user-facing metadata', () => {
    it('requires schemaVersion 3', () => {
        const c = validCartridge()
        c.schemaVersion = 2
        expect(validateCartridge(c)).toContain('schemaVersion must be exactly 3')
    })

    it.each(['1', 'v1.0.0', '1.0'])('rejects invalid cartridgeVersion %s', (version) => {
        const c = validCartridge()
        c.cartridgeVersion = version
        expect(validateCartridge(c).some((e) => e.includes('cartridgeVersion'))).toBe(true)
    })

    it('requires a short single-line summary', () => {
        const c = validCartridge()
        c.summary = `${'x'.repeat(160)}\n`
        expect(validateCartridge(c).some((e) => e.includes('summary'))).toBe(true)
    })

    it('requires two to four unique short outcomes', () => {
        const c = validCartridge()
        c.outcomes = ['Same outcome', 'Same outcome']
        expect(validateCartridge(c)).toContain('outcomes must be unique')
        c.outcomes = ['Only one']
        expect(validateCartridge(c)).toContain('outcomes must contain between 2 and 4 items')
    })

    it('requires one to eight unique lowercase-kebab tags', () => {
        const c = validCartridge()
        c.tags = ['Full Body', 'Full Body']
        const errors = validateCartridge(c)
        expect(errors).toContain('tags must be unique')
        expect(errors).toContain('each tag must be a lowercase-kebab string')
    })

    it('accepts an empty equipment list', () => {
        const c = validCartridge()
        c.requirements.equipment = []
        expect(validateCartridge(c)).toEqual([])
    })

    it('requires unique, non-empty equipment display names', () => {
        const c = validCartridge()
        c.requirements.equipment = ['Dumbbells', 'dumbbells', '']
        const errors = validateCartridge(c)
        expect(errors).toContain('each requirements.equipment item must be a non-empty string')
        expect(errors).toContain('requirements.equipment items must be unique')
    })
})

describe('validateCartridge — day coverage', () => {
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
})

describe('validateCartridge — day/block coupling', () => {
    it('flags a training day with no blocks', () => {
        const c = validCartridge()
        c.days[0].blocks = []
        expect(validateCartridge(c).some((e) => e.includes('training day must have at least one block'))).toBe(true)
    })

    it('flags a rest day that carries blocks', () => {
        const c = validCartridge()
        c.days[1].blocks = [{ kind: 'strength', items: [{ id: 'x', name: 'X', sets: 1, reps: '1' }] }]
        expect(validateCartridge(c).some((e) => e.includes('rest day must have no blocks'))).toBe(true)
    })

    it('flags an unknown day type', () => {
        const c = validCartridge()
        c.days[2].type = 'party'
        expect(validateCartridge(c).some((e) => e.includes('unknown day type'))).toBe(true)
    })

    it('accepts a custom day with no blocks (e.g. a fight day)', () => {
        expect(validateCartridge(validCartridge())).toEqual([])
    })
})

describe('validateCartridge — block rules', () => {
    it('flags an unknown block kind', () => {
        const c = validCartridge()
        c.days[0].blocks[0].kind = 'cardio-blast'
        expect(validateCartridge(c).some((e) => e.includes('unknown block kind'))).toBe(true)
    })

    it('flags a block with no items', () => {
        const c = validCartridge()
        c.days[0].blocks[0].items = []
        expect(validateCartridge(c).some((e) => e.includes('block must have at least one item'))).toBe(true)
    })

    it('flags a missing block kind', () => {
        const c = validCartridge()
        delete c.days[0].blocks[0].kind
        expect(validateCartridge(c).some((e) => e.includes('block kind is required'))).toBe(true)
    })
})

describe('validateCartridge — item ids', () => {
    it('flags a duplicate item id across blocks', () => {
        const c = validCartridge()
        c.days[0].blocks[1].items[0].id = 'd1-str-1'
        expect(validateCartridge(c).some((e) => e.includes('duplicate item id'))).toBe(true)
    })

    it('flags a missing item id', () => {
        const c = validCartridge()
        delete c.days[0].blocks[0].items[0].id
        expect(validateCartridge(c).some((e) => e.includes('id is required'))).toBe(true)
    })
})

describe('validateCartridge — kind-specific item shape', () => {
    it('requires dose on mobility/cooldown items', () => {
        const c = validCartridge()
        c.days[0].blocks = [{ kind: 'mobility', items: [{ id: 'm1', name: 'Hip 90/90' }] }]
        expect(validateCartridge(c).some((e) => e.includes('mobility item requires a "dose"'))).toBe(true)
    })

    it.each(['sets', 'reps'])('requires %s on strength items', (field) => {
        const c = validCartridge()
        delete c.days[0].blocks[0].items[0][field]
        expect(validateCartridge(c).some((e) => e.includes(`requires "${field}"`))).toBe(true)
    })

    it('requires numeric rounds on conditioning items', () => {
        const c = validCartridge()
        c.days[0].blocks = [{ kind: 'conditioning', items: [{ id: 'b1', name: 'Bag' }] }]
        expect(validateCartridge(c).some((e) => e.includes('conditioning item requires a numeric "rounds"'))).toBe(true)
    })

    it('flags a non-object prescription', () => {
        const c = validCartridge()
        c.days[0].blocks[0].items[0].prescription = 8
        expect(validateCartridge(c).some((e) => e.includes('prescription must be an object'))).toBe(true)
    })

    it('accepts a free-note prescription (mixed multi-modal styles)', () => {
        const c = validCartridge()
        c.days[0].blocks[0].items[0].prescription = { note: 'Moderate — feel the hamstring' }
        expect(validateCartridge(c)).toEqual([])
    })

    it('flags a PAP pair missing a name', () => {
        const c = validCartridge()
        c.days[0].blocks[0].items[0].pair = { sets: 4, reps: '3' }
        expect(validateCartridge(c).some((e) => e.includes('pair requires a "name"'))).toBe(true)
    })

    it('flags a non-array perRound', () => {
        const c = validCartridge()
        c.days[0].blocks = [{ kind: 'conditioning', items: [{ id: 'b1', name: 'Bag', rounds: 6, perRound: 'R1' }] }]
        expect(validateCartridge(c).some((e) => e.includes('perRound must be an array'))).toBe(true)
    })
})

describe('validateCartridge — supersets group >= 2', () => {
    it('flags a lone superset label', () => {
        const c = validCartridge()
        c.days[0].blocks[0].items[0].superset = 'A'
        expect(validateCartridge(c).some((e) => e.includes('superset "A" groups only 1'))).toBe(true)
    })
})

describe('validateCartridge — known feature flags', () => {
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

    it('flags an empty content cartridge', () => {
        const c = { cartridgeId: 'x', type: 'content', sections: [] }
        expect(validateCartridge(c).some((e) => e.includes('non-empty sections'))).toBe(true)
    })
})

describe('validateCartridge — real authored cartridges (regression guard)', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const load = (name) => JSON.parse(readFileSync(resolve(here, '../../../cartridges/', name), 'utf8'))
    const loadBundled = (name) => JSON.parse(readFileSync(resolve(here, '../data/cartridges/', name), 'utf8'))
    const cartridgeNames = ['combatos-foundation-2026.json', 'combatos-operator-2026.json', 'apex-protocol-phase1.json']

    it.each(cartridgeNames)('%s validates clean', (name) => {
        expect(validateCartridge(load(name))).toEqual([])
    })

    it.each(cartridgeNames)('%s matches its app-bundled mirror', (name) => {
        expect(loadBundled(name)).toEqual(load(name))
    })
})
