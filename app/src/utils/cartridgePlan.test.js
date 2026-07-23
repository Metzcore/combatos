import { describe, expect, it } from 'vitest'
import { getCartridgePlanState } from './cartridgePlan.js'

const cartridge = { cartridgeId: 'active-program' }
const snapshot = {
    activeId: cartridge.cartridgeId,
    availableIds: [cartridge.cartridgeId],
}

describe('getCartridgePlanState', () => {
    const base = {
        loading: false,
        snapshot: null,
        offline: false,
        error: null,
        activeCartridge: null,
    }

    it('distinguishes initial load, offline-without-cache, and server failure', () => {
        expect(getCartridgePlanState({ ...base, loading: true })).toBe('loading')
        expect(getCartridgePlanState({ ...base, offline: true })).toBe('offline-empty')
        expect(getCartridgePlanState({ ...base, error: new Error('nope') })).toBe('error')
    })

    it('renders a validated active cartridge from a server or cached snapshot', () => {
        expect(getCartridgePlanState({
            ...base,
            snapshot,
            activeCartridge: cartridge,
        })).toBe('ready')

        expect(getCartridgePlanState({
            ...base,
            snapshot,
            activeCartridge: cartridge,
            offline: true,
            error: new Error('refresh failed'),
        })).toBe('ready')
    })

    it('never substitutes another cartridge for an unknown active ID', () => {
        expect(getCartridgePlanState({
            ...base,
            snapshot: {
                activeId: 'future-program',
                availableIds: ['future-program', cartridge.cartridgeId],
            },
            activeCartridge: null,
        })).toBe('update-required')
    })

    it('keeps a missing active pointer explicit', () => {
        expect(getCartridgePlanState({
            ...base,
            snapshot: { activeId: null, availableIds: [cartridge.cartridgeId] },
            activeCartridge: null,
        })).toBe('no-active')
    })
})
