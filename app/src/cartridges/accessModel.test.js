import { describe, expect, it } from 'vitest'
import {
    createCartridgeAccessSnapshot,
    mapCartridgeAccess,
    parseCartridgeAccessSnapshot,
} from './accessModel.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const SYNCED_AT = '2026-07-22T16:00:00.000Z'

function valid(overrides = {}) {
    return {
        userId: USER_ID,
        availableIds: ['program-one', 'program-two'],
        activeId: 'program-one',
        syncedAt: SYNCED_AT,
        ...overrides,
    }
}

describe('cartridge access snapshot validation', () => {
    it('returns a defensive copy of a complete server snapshot', () => {
        const input = valid()
        const parsed = parseCartridgeAccessSnapshot(input)

        expect(parsed).toEqual(input)
        expect(parsed).not.toBe(input)
        expect(parsed.availableIds).not.toBe(input.availableIds)
    })

    it('allows an empty availability list only when there is no active program', () => {
        expect(parseCartridgeAccessSnapshot(valid({ availableIds: [], activeId: null }))).toBeTruthy()
        expect(parseCartridgeAccessSnapshot(valid({ availableIds: [], activeId: 'program-one' }))).toBeNull()
    })

    it.each([
        ['wrong-shaped user ID', { userId: 'not-a-user' }],
        ['duplicate IDs', { availableIds: ['program-one', 'program-one'] }],
        ['malformed cartridge ID', { availableIds: ['Program One'], activeId: null }],
        ['active ID outside availability', { activeId: 'program-three' }],
        ['invalid timestamp', { syncedAt: 'yesterday-ish' }],
    ])('rejects %s', (_label, overrides) => {
        expect(parseCartridgeAccessSnapshot(valid(overrides))).toBeNull()
    })

    it('throws rather than manufacturing a default when server facts are invalid', () => {
        expect(() => createCartridgeAccessSnapshot(valid({ activeId: 'not-assigned' })))
            .toThrow('Invalid cartridge access snapshot')
    })
})

describe('bundled cartridge mapping', () => {
    const first = { cartridgeId: 'program-one', label: 'One' }
    const registry = new Map([['program-one', first]])

    it('maps known IDs and reports unknown IDs without substituting a program', () => {
        const mapped = mapCartridgeAccess(valid(), registry)

        expect(mapped.availableCartridges).toEqual([first])
        expect(mapped.activeCartridge).toBe(first)
        expect(mapped.unknownIds).toEqual(['program-two'])
        expect(mapped.updateRequired).toBe(true)
    })

    it('reports an unknown active program as missing instead of choosing the first known one', () => {
        const mapped = mapCartridgeAccess(valid({ activeId: 'program-two' }), registry)

        expect(mapped.activeCartridge).toBeNull()
        expect(mapped.availableCartridges).toEqual([first])
        expect(mapped.updateRequired).toBe(true)
    })
})
