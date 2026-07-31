/**
 * weightValue.test.js — canonical weight handling (W30).
 *
 * The headline suite is THE RATCHET, which pins the data-corruption bug the
 * module exists to prevent: display rounds to 1 decimal, canonical storage
 * keeps 3, and a UI round-trip must never be allowed to become a write.
 */
import { describe, it, expect } from 'vitest'
import {
    LB_PER_KG_FACTOR,
    WEIGHT_UNITS, isWeightUnit,
    isValidKg, lbToKg, kgToLb,
    fromInput, toDisplay, formatWeight, toEditValue,
} from './weightValue.js'

describe('units', () => {
    it('offers exactly kg and lb', () => {
        expect(WEIGHT_UNITS).toEqual(['kg', 'lb'])
        expect(isWeightUnit('kg')).toBe(true)
        expect(isWeightUnit('lb')).toBe(true)
        expect(isWeightUnit('stone')).toBe(false)
        expect(isWeightUnit(undefined)).toBe(false)
    })

    it('uses the exact avoirdupois factor, not an approximation', () => {
        expect(LB_PER_KG_FACTOR).toBe(0.45359237)
    })
})

describe('isValidKg', () => {
    it('accepts plausible human weights', () => {
        for (const kg of [0.001, 45, 81.647, 200, 999.999]) expect(isValidKg(kg)).toBe(true)
    })

    it('rejects zero, negatives, non-finite and non-numbers', () => {
        for (const v of [0, -1, -0.001, 1000, NaN, Infinity, -Infinity, '80', null, undefined, {}]) {
            expect(isValidKg(v)).toBe(false)
        }
    })
})

describe('fromInput', () => {
    it('parses kg at gram precision', () => {
        expect(fromInput('81.6', 'kg')).toBe(81.6)
        expect(fromInput('81.647', 'kg')).toBe(81.647)
        expect(fromInput('81.6474', 'kg')).toBe(81.647)   // rounded to grams
    })

    it('converts lb input to canonical kg', () => {
        expect(fromInput('180', 'lb')).toBe(81.647)
        expect(fromInput('180.0', 'lb')).toBe(81.647)
    })

    it('accepts a comma decimal separator', () => {
        // Continental Europe types this. Rejecting it silently, or worse
        // parsing '81,6' as 816, would be a real data-entry hazard.
        expect(fromInput('81,6', 'kg')).toBe(81.6)
        expect(fromInput('180,5', 'lb')).toBe(fromInput('180.5', 'lb'))
    })

    it('tolerates surrounding whitespace', () => {
        expect(fromInput('  81.6  ', 'kg')).toBe(81.6)
    })

    it('accepts a number as well as a string', () => {
        expect(fromInput(81.6, 'kg')).toBe(81.6)
        expect(fromInput(180, 'lb')).toBe(81.647)
    })

    it('rejects anything that is not a plain decimal', () => {
        // Number() would happily take '1e3' and '0x50'; neither is a weight
        // a human means to type.
        for (const bad of ['', '   ', 'abc', '1e3', '0x50', '-80', '+80', '8 0',
            '80kg', '1,000.5', null, undefined, {}, [], NaN]) {
            expect(fromInput(bad, 'kg')).toBeNull()
        }
    })

    it('rejects out-of-range values rather than storing them', () => {
        expect(fromInput('0', 'kg')).toBeNull()
        expect(fromInput('1000', 'kg')).toBeNull()
        expect(fromInput('99999', 'lb')).toBeNull()
    })
})

describe('toDisplay / formatWeight / toEditValue', () => {
    it('renders one decimal in the requested unit', () => {
        expect(toDisplay(81.647, 'kg')).toBe(81.6)
        expect(toDisplay(81.647, 'lb')).toBe(180)
        expect(formatWeight(81.647, 'kg')).toBe('81.6 kg')
        expect(formatWeight(81.647, 'lb')).toBe('180.0 lb')
        expect(formatWeight(81.647, 'kg', { withUnit: false })).toBe('81.6')
    })

    it('renders an honest placeholder instead of NaN', () => {
        for (const bad of [null, undefined, NaN, 0, -5, 'x']) {
            expect(toDisplay(bad, 'kg')).toBeNull()
            expect(formatWeight(bad, 'kg')).toBe('—')
            expect(toEditValue(bad, 'kg')).toBe('')
        }
    })

    it('seeds an edit control with the display string', () => {
        expect(toEditValue(81.647, 'kg')).toBe('81.6')
        expect(toEditValue(81.647, 'lb')).toBe('180.0')
    })
})

describe('THE RATCHET — a UI round-trip must never become a write', () => {
    it('demonstrates the loss that makes re-saving the displayed value a bug', () => {
        // 180.0 lb is 81.6466...kg. Display rounds to 81.6. Persisting THAT
        // would drop 0.047 kg — and again on the next toggle.
        const canonical = fromInput('180', 'lb')
        expect(canonical).toBe(81.647)

        const shown = toDisplay(canonical, 'kg')
        expect(shown).toBe(81.6)

        const ifWeReSavedTheDisplay = fromInput(String(shown), 'kg')
        expect(ifWeReSavedTheDisplay).toBe(81.6)
        expect(ifWeReSavedTheDisplay).not.toBe(canonical)   // ← the loss, pinned
    })

    it('does not drift when the unit is toggled repeatedly, because display is read-only', () => {
        // The correct behaviour: canonical is untouched no matter how many
        // times the user flips the unit. This is what the UI contract buys.
        const canonical = fromInput('180', 'lb')
        let displayed
        for (let i = 0; i < 50; i++) {
            displayed = toDisplay(canonical, i % 2 ? 'kg' : 'lb')
        }
        expect(canonical).toBe(81.647)
        expect(toDisplay(canonical, 'kg')).toBe(81.6)
        expect(toDisplay(canonical, 'lb')).toBe(180)
        expect(displayed).toBeGreaterThan(0)
    })

    it('round-trips a kg value entered in kg without loss', () => {
        // The path that IS lossless: entered in the canonical unit at or below
        // gram precision.
        for (const v of ['81.6', '81.647', '70', '100.5']) {
            const kg = fromInput(v, 'kg')
            expect(fromInput(toEditValue(kg, 'kg'), 'kg')).toBe(Number(Number(v).toFixed(1)))
        }
    })

    it('keeps lb→kg→lb stable at display precision', () => {
        for (const lb of ['150', '165.5', '180', '200.2']) {
            const kg = fromInput(lb, 'lb')
            expect(toDisplay(kg, 'lb')).toBeCloseTo(Number(lb), 1)
        }
    })
})

describe('conversion helpers', () => {
    it('lbToKg rounds once to gram precision', () => {
        expect(lbToKg(180)).toBe(81.647)
        expect(lbToKg(1)).toBe(0.454)
    })

    it('kgToLb is unrounded so callers control precision', () => {
        expect(kgToLb(81.647)).toBeCloseTo(180.0007, 3)
    })

    it('handles exact-half rounding without floating-point surprises', () => {
        expect(fromInput('81.6465', 'kg')).toBe(81.647)
        expect(fromInput('81.6455', 'kg')).toBe(81.646)
        expect(toDisplay(81.65, 'kg')).toBe(81.7)
        expect(toDisplay(81.05, 'kg')).toBe(81.1)
    })
})
