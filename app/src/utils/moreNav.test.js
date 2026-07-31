/**
 * moreNav.test.js
 *
 * Pins the W29 More-hub screen contract:
 * - the menu key is distinct from every screen key
 * - every row has a key, icon and label
 * - validation rejects unknown keys (so bad input can't blank the hub)
 */
import { describe, it, expect } from 'vitest'
import {
    MENU_SCREEN,
    MORE_SCREENS,
    MORE_SCREEN_KEYS,
    isMoreScreen,
    moreScreenMeta,
    shouldPushHistoryEntry
} from './moreNav.js'

describe('More hub screen definitions', () => {
    it('lists the six W29 rows in order', () => {
        expect(MORE_SCREENS.map(s => s.key)).toEqual([
            'profile', 'settings', 'ignition', 'backup', 'agent', 'about'
        ])
    })

    it('uses a menu key that is not also a screen key', () => {
        expect(MENU_SCREEN).toBe('menu')
        expect(MORE_SCREENS.map(s => s.key)).not.toContain(MENU_SCREEN)
    })

    it('gives every row a non-empty key, icon and label', () => {
        for (const s of MORE_SCREENS) {
            expect(typeof s.key).toBe('string')
            expect(s.key.length).toBeGreaterThan(0)
            expect(typeof s.icon).toBe('string')
            expect(s.icon.length).toBeGreaterThan(0)
            expect(typeof s.label).toBe('string')
            expect(s.label.length).toBeGreaterThan(0)
        }
    })

    it('has no duplicate keys', () => {
        const keys = MORE_SCREENS.map(s => s.key)
        expect(new Set(keys).size).toBe(keys.length)
    })

    it('exposes the menu plus every screen as valid keys', () => {
        expect(MORE_SCREEN_KEYS).toHaveLength(MORE_SCREENS.length + 1)
        expect(MORE_SCREEN_KEYS[0]).toBe(MENU_SCREEN)
    })
})

describe('isMoreScreen', () => {
    it('accepts the menu and every defined screen', () => {
        for (const key of MORE_SCREEN_KEYS) {
            expect(isMoreScreen(key)).toBe(true)
        }
    })

    it('rejects unknown keys, including other hubs\' tab keys', () => {
        // Cross-hub confusion guard, mirroring navState.test.js: another
        // hub's tab key must not be accepted as a More screen.
        for (const key of ['today', 'plan', 'basic', 'rounds', 'notes', 'stats', 'nope', '']) {
            expect(isMoreScreen(key)).toBe(false)
        }
    })

    it('rejects non-string input without throwing', () => {
        for (const key of [undefined, null, 0, {}, []]) {
            expect(isMoreScreen(key)).toBe(false)
        }
    })
})

describe('moreScreenMeta', () => {
    it('returns the row definition for a screen key', () => {
        expect(moreScreenMeta('backup')).toMatchObject({ key: 'backup', label: 'Backup & Data' })
    })

    it('returns undefined for the menu and for unknown keys', () => {
        expect(moreScreenMeta(MENU_SCREEN)).toBeUndefined()
        expect(moreScreenMeta('nope')).toBeUndefined()
    })
})

describe('shouldPushHistoryEntry (Android Back contract)', () => {
    it('pushes when a detail screen opens from the menu', () => {
        for (const s of MORE_SCREENS) {
            expect(shouldPushHistoryEntry(s.key, false)).toBe(true)
        }
    })

    it('never pushes for the menu itself — Back there should leave the app', () => {
        expect(shouldPushHistoryEntry(MENU_SCREEN, false)).toBe(false)
        expect(shouldPushHistoryEntry(MENU_SCREEN, true)).toBe(false)
    })

    it('pushes at most ONE entry — a second call while open is a no-op', () => {
        // The trapping failure mode: stacking entries would make the user
        // press Back several times to escape a single screen.
        expect(shouldPushHistoryEntry('profile', true)).toBe(false)
        expect(shouldPushHistoryEntry('agent', true)).toBe(false)
    })

    it('never pushes for an unknown screen key', () => {
        expect(shouldPushHistoryEntry('nope', false)).toBe(false)
        expect(shouldPushHistoryEntry(undefined, false)).toBe(false)
    })
})
