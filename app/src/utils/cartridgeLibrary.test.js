import { describe, expect, it } from 'vitest'
import {
    formatCartridgeTag,
    getCartridgeLibraryState,
    orderLibraryCartridges,
} from './cartridgeLibrary.js'

const one = { cartridgeId: 'one' }
const two = { cartridgeId: 'two' }
const three = { cartridgeId: 'three' }

describe('orderLibraryCartridges', () => {
    it('puts the real active program first and preserves the remaining order', () => {
        expect(orderLibraryCartridges([one, two, three], 'two'))
            .toEqual([two, one, three])
    })

    it('does not invent an active program when the ID is null or unknown', () => {
        expect(orderLibraryCartridges([one, two], null)).toEqual([one, two])
        expect(orderLibraryCartridges([one, two], 'not-bundled')).toEqual([one, two])
    })

    it('returns a new array without mutating provider data', () => {
        const source = [one, two]
        const ordered = orderLibraryCartridges(source, 'two')
        expect(source).toEqual([one, two])
        expect(ordered).not.toBe(source)
    })
})

describe('getCartridgeLibraryState', () => {
    const base = {
        loading: false,
        snapshot: null,
        offline: false,
        error: null,
        knownCount: 0,
        unknownCount: 0,
    }

    it('distinguishes initial load, offline-without-cache, and server error', () => {
        expect(getCartridgeLibraryState({ ...base, loading: true })).toBe('loading')
        expect(getCartridgeLibraryState({ ...base, offline: true })).toBe('offline-empty')
        expect(getCartridgeLibraryState({ ...base, error: new Error('nope') })).toBe('error')
    })

    it('distinguishes ready, genuinely empty, and app-update-required snapshots', () => {
        const snapshot = { availableIds: [] }
        expect(getCartridgeLibraryState({ ...base, snapshot, knownCount: 1 })).toBe('ready')
        expect(getCartridgeLibraryState({ ...base, snapshot })).toBe('empty')
        expect(getCartridgeLibraryState({ ...base, snapshot, unknownCount: 1 }))
            .toBe('update-required')
    })

    it('keeps known programs usable when another assigned ID needs an app update', () => {
        expect(getCartridgeLibraryState({
            ...base,
            snapshot: { availableIds: ['one', 'future'] },
            knownCount: 1,
            unknownCount: 1,
        })).toBe('ready')
    })
})

describe('formatCartridgeTag', () => {
    it('turns stored kebab tags into compact display labels', () => {
        expect(formatCartridgeTag('joint-resilience')).toBe('joint resilience')
    })
})
