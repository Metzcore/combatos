/**
 * todayRoute.test.js — A7b Today account-level routing decision.
 */
import { describe, it, expect } from 'vitest'
import { resolveTodayRoute, resolveTodaySurface } from './todayRoute.js'

const base = {
    loading: false,
    snapshot: null,
    offline: false,
    error: null,
    activeCartridge: null,
    availableCartridges: [],
}

describe('resolveTodayRoute', () => {
    it('loading with no snapshot yet', () => {
        expect(resolveTodayRoute({ ...base, loading: true })).toBe('loading')
    })

    it('offline with no snapshot at all', () => {
        expect(resolveTodayRoute({ ...base, offline: true })).toBe('offline-empty')
    })

    it('errored with no snapshot at all', () => {
        expect(resolveTodayRoute({ ...base, error: new Error('boom') })).toBe('error')
    })

    it('no snapshot, not loading/offline/error — an explicit indeterminate state, never a guessed legacy', () => {
        expect(resolveTodayRoute({ ...base })).toBe('indeterminate')
    })

    it('active id set but this build does not recognize the cartridge — update-required', () => {
        expect(resolveTodayRoute({
            ...base,
            snapshot: { activeId: 'unknown-cartridge', availableIds: ['unknown-cartridge'] },
            activeCartridge: null,
        })).toBe('update-required')
    })

    it('active id set and recognized — cartridge', () => {
        expect(resolveTodayRoute({
            ...base,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: { cartridgeId: 'combatos-operator-2026' },
        })).toBe('cartridge')
    })

    it('no active id, but programs are available — choose-program (never silently legacy)', () => {
        expect(resolveTodayRoute({
            ...base,
            snapshot: { activeId: null, availableIds: ['combatos-operator-2026'] },
            availableCartridges: [{ cartridgeId: 'combatos-operator-2026' }],
        })).toBe('choose-program')
    })

    it('no active id, zero available cartridges ever — a legacy-only account', () => {
        expect(resolveTodayRoute({
            ...base,
            snapshot: { activeId: null, availableIds: [] },
            availableCartridges: [],
        })).toBe('legacy')
    })
})

// ─── resolveTodaySurface — the full mounting decision (Step 5, finding E/J7) ─

const surfaceBase = {
    ...base,
    activeDraftKind: 'legacy',
    cartridgeId: null,
    cartridgeFrozenDay: null,
    isLegacyDraftMeaningful: false,
}

describe('resolveTodaySurface', () => {
    // ── no draft in flight — falls through to the plain account route ──
    it('no draft × loading', () => {
        expect(resolveTodaySurface({ ...surfaceBase, loading: true })).toBe('loading')
    })
    it('no draft × offline', () => {
        expect(resolveTodaySurface({ ...surfaceBase, offline: true })).toBe('offline-empty')
    })
    it('no draft × error', () => {
        expect(resolveTodaySurface({ ...surfaceBase, error: new Error('boom') })).toBe('error')
    })
    it('no draft × indeterminate (no snapshot, no loading/offline/error signal)', () => {
        expect(resolveTodaySurface({ ...surfaceBase })).toBe('indeterminate')
    })
    it('no draft × update-required (account-level only, no in-flight workout to protect)', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: null,
        })).toBe('update-required')
    })
    it('no draft × choose-program', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            snapshot: { activeId: null, availableIds: ['combatos-operator-2026'] },
            availableCartridges: [{ cartridgeId: 'combatos-operator-2026' }],
        })).toBe('choose-program')
    })
    it('no draft × legacy-only account', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            snapshot: { activeId: null, availableIds: [] },
        })).toBe('legacy')
    })
    it('no draft × cartridge (healthy account-level route, nothing extra to protect)', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: { cartridgeId: 'combatos-operator-2026' },
        })).toBe('cartridge')
    })

    // ── meaningful legacy draft always wins, regardless of account route ──
    it('a meaningful legacy draft wins over an otherwise-cartridge route', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'legacy',
            isLegacyDraftMeaningful: true,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: { cartridgeId: 'combatos-operator-2026' },
        })).toBe('legacy-draft')
    })
    it('activeDraftKind legacy with NO meaningful content does not force legacy-draft (falls through to route)', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'legacy',
            isLegacyDraftMeaningful: false,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: { cartridgeId: 'combatos-operator-2026' },
        })).toBe('cartridge')
    })

    // ── meaningful cartridge draft in progress — the J2/J7 recovery cases ──
    it('a meaningful cartridge draft with an INTACT active cartridge still resolves to frozen-cartridge-recovery', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'cartridge',
            cartridgeId: 'combatos-operator-2026',
            cartridgeFrozenDay: { day: 1, label: 'Day 1', blocks: [] },
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: { cartridgeId: 'combatos-operator-2026' },
        })).toBe('frozen-cartridge-recovery')
    })
    it('THE KEY REGRESSION TEST (J7): the active cartridge disappearing after Start (update-required) must NOT strand the in-flight workout', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'cartridge',
            cartridgeId: 'combatos-operator-2026',
            cartridgeFrozenDay: { day: 1, label: 'Day 1', blocks: [] },
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: null, // bundled cartridge became unresolvable mid-workout
        })).toBe('frozen-cartridge-recovery')
    })
    it('frozen-cartridge-recovery even when the account route would otherwise be indeterminate/offline/error', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'cartridge',
            cartridgeId: 'combatos-operator-2026',
            cartridgeFrozenDay: { day: 1, label: 'Day 1', blocks: [] },
            offline: true,
        })).toBe('frozen-cartridge-recovery')
    })
    it('activeDraftKind "cartridge" ALONE (no cartridgeId/frozenDay) never triggers recovery — never trust the discriminator alone', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'cartridge',
            cartridgeId: null,
            cartridgeFrozenDay: null,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: null,
        })).toBe('update-required')
    })
    it('cartridgeId set but cartridgeFrozenDay still null (identity known, day not yet frozen) does not trigger recovery', () => {
        expect(resolveTodaySurface({
            ...surfaceBase,
            activeDraftKind: 'cartridge',
            cartridgeId: 'combatos-operator-2026',
            cartridgeFrozenDay: null,
            snapshot: { activeId: 'combatos-operator-2026', availableIds: ['combatos-operator-2026'] },
            activeCartridge: null,
        })).toBe('update-required')
    })
})
