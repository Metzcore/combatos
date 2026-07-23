/**
 * navState.test.js
 *
 * Pins the W20 nav-shell state contract:
 * - hub keys / slot order match the signed-off W19 design
 * - every hub with top tabs starts on its first tab
 * - setHubTab updates one hub's selection without disturbing the others
 *   (this is the "Layer-2 selection survives hub switches" guarantee —
 *   the state object is shared across hubs, so cross-contamination between
 *   hubs would break it)
 * - invalid input is rejected by identity (same reference back), so bad
 *   calls can never corrupt nav state
 */
import { describe, it, expect } from 'vitest'
import { HUBS, DEFAULT_HUB, HUB_TOP_TABS, initialTopTabs, setHubTab } from './navState.js'

describe('hub definitions (W19 §6 rulings)', () => {
    it('has exactly 5 hubs in slot order', () => {
        expect(HUBS).toEqual(['train', 'timer', 'log', 'checklist', 'settings'])
    })

    it('defaults to the train hub', () => {
        expect(DEFAULT_HUB).toBe('train')
        expect(HUBS).toContain(DEFAULT_HUB)
    })

    it('defines top tabs only for train, timer, log, and checklist (W23)', () => {
        expect(Object.keys(HUB_TOP_TABS).sort()).toEqual(['checklist', 'log', 'timer', 'train'])
    })

    it('defines Today, Plan, and Library as Train\'s complete information architecture', () => {
        expect(HUB_TOP_TABS.train).toEqual([
            { key: 'today', label: 'Today' },
            { key: 'plan', label: 'Plan' },
            { key: 'library', label: 'Library' },
        ])
    })

    it('every hub with top tabs has at least two, each with key and label', () => {
        for (const tabs of Object.values(HUB_TOP_TABS)) {
            expect(tabs.length).toBeGreaterThanOrEqual(2)
            for (const t of tabs) {
                expect(typeof t.key).toBe('string')
                expect(t.key.length).toBeGreaterThan(0)
                expect(typeof t.label).toBe('string')
                expect(t.label.length).toBeGreaterThan(0)
            }
        }
    })
})

describe('initialTopTabs', () => {
    it('starts every tabbed hub on its first tab', () => {
        expect(initialTopTabs()).toEqual({
            train: 'today',
            timer: 'basic',
            log: 'log',
            checklist: 'checklist'
        })
    })

    it('returns a fresh object each call (safe as a useState initializer)', () => {
        expect(initialTopTabs()).not.toBe(initialTopTabs())
    })
})

describe('setHubTab', () => {
    it('accepts every Train information-architecture key', () => {
        for (const key of ['today', 'plan', 'library']) {
            const next = setHubTab(initialTopTabs(), 'train', key)
            expect(next.train).toBe(key)
        }
    })

    it('leaves every other hub selection untouched', () => {
        // Simulate: user is on Rounds in Timer, Stats in Log, and Notes in
        // Checklist, then flips Train
        let state = initialTopTabs()
        state = setHubTab(state, 'timer', 'rounds')
        state = setHubTab(state, 'log', 'stats')
        state = setHubTab(state, 'checklist', 'notes')
        state = setHubTab(state, 'train', 'plan')
        expect(state).toEqual({
            train: 'plan', timer: 'rounds', log: 'stats', checklist: 'notes'
        })
    })

    it('does not mutate the input state', () => {
        const before = initialTopTabs()
        const snapshot = { ...before }
        const after = setHubTab(before, 'train', 'plan')
        expect(before).toEqual(snapshot)
        expect(after).not.toBe(before)
    })

    it('returns the same reference when the tab is already active (no-op render guard)', () => {
        const state = initialTopTabs()
        expect(setHubTab(state, 'timer', 'basic')).toBe(state)
    })

    it('returns the same reference for an unknown hub', () => {
        // W23 note: `checklist` used to be the "unknown hub" example here;
        // it now HAS top tabs, so the case uses genuinely unknown keys.
        const state = initialTopTabs()
        expect(setHubTab(state, 'settings', 'anything')).toBe(state)
        expect(setHubTab(state, 'nope', 'today')).toBe(state)
    })

    it('returns the same reference for a tab the hub does not have', () => {
        const state = initialTopTabs()
        expect(setHubTab(state, 'train', 'rounds')).toBe(state)
        expect(setHubTab(state, 'log', 'today')).toBe(state)
        // Cross-hub tab-name confusion (W23): another hub's tab key is
        // rejected by identity too.
        expect(setHubTab(state, 'checklist', 'today')).toBe(state)
    })

    it('rejects Train\'s superseded tab keys', () => {
        const state = initialTopTabs()
        expect(setHubTab(state, 'train', 'workout')).toBe(state)
        expect(setHubTab(state, 'train', 'playbook')).toBe(state)
        expect(setHubTab(state, 'train', 'cartridges')).toBe(state)
    })

    it('round-trips: hub switch away and back preserves the selection', () => {
        // The state object is hub-agnostic — switching activeHub in AppShell
        // never touches it. Pin that flipping OTHER hubs' tabs any number of
        // times leaves train's selection intact.
        let state = setHubTab(initialTopTabs(), 'train', 'plan')
        state = setHubTab(state, 'timer', 'rounds')
        state = setHubTab(state, 'timer', 'basic')
        state = setHubTab(state, 'log', 'stats')
        expect(state.train).toBe('plan')
    })
})
