/**
 * updateBanner.test.js — the pure decisions behind the W40 update banner:
 * when a workout is "active", which banner shows, and when to ask for an update.
 */
import { describe, it, expect } from 'vitest'
import {
    isWorkoutActive, resolveBanner, shouldCheckForUpdate,
    CHECK_MIN_INTERVAL_MS,
} from './updateBanner.js'

const legacyRow = (fields) => ({ state: { kind: 'legacy-hud-v1', fields } })
const cartridgeRow = (fields) => ({ state: { kind: 'cartridge-workout-v1', fields } })

describe('isWorkoutActive', () => {
    it('is false for a fresh app with nothing going on', () => {
        expect(isWorkoutActive()).toBe(false)
        expect(isWorkoutActive({
            liveRow: legacyRow({ strSets: {}, coreSets: {}, mobChecked: {}, clrChecked: {}, notes: '' }),
            draftPhase: 'ready',
        })).toBe(false)
    })

    it('is true while a legacy draft holds real input', () => {
        const liveRow = legacyRow({ strSets: { a: { kg: '60', reps: '5' } } })
        expect(isWorkoutActive({ liveRow, draftPhase: 'ready' })).toBe(true)
    })

    it('does not count selection or scroll alone as a workout', () => {
        expect(isWorkoutActive({ liveRow: legacyRow({ hudScrollY: 400, strBlockOpen: true }) })).toBe(false)
    })

    it('is true once a cartridge workout has been started (startedAt)', () => {
        expect(isWorkoutActive({ liveRow: cartridgeRow({ startedAt: '2026-10-02T09:00:00.000Z' }) })).toBe(true)
        expect(isWorkoutActive({ liveRow: cartridgeRow({ startedAt: null, itemStateById: {} }) })).toBe(false)
    })

    it('blocks while the stored draft is still being read, but not while idle or ready', () => {
        expect(isWorkoutActive({ draftPhase: 'hydrating' })).toBe(true)
        expect(isWorkoutActive({ draftPhase: 'idle' })).toBe(false)
        expect(isWorkoutActive({ draftPhase: 'ready' })).toBe(false)
    })

    it('blocks while the stopwatch or countdown is running or holds elapsed time', () => {
        expect(isWorkoutActive({ swRunning: true })).toBe(true)
        expect(isWorkoutActive({ swTime: 1200 })).toBe(true)
        expect(isWorkoutActive({ cdRunning: true })).toBe(true)
        expect(isWorkoutActive({ cdTime: 30000 })).toBe(true)
    })

    it('blocks while the rounds timer is anything but idle', () => {
        expect(isWorkoutActive({ roundsStatus: 'running' })).toBe(true)
        expect(isWorkoutActive({ roundsStatus: 'paused' })).toBe(true)
        expect(isWorkoutActive({ roundsStatus: 'done' })).toBe(true)
        expect(isWorkoutActive({ roundsStatus: 'idle' })).toBe(false)
    })

    it('tolerates a malformed live row', () => {
        expect(isWorkoutActive({ liveRow: {} })).toBe(false)
        expect(isWorkoutActive({ liveRow: { state: null } })).toBe(false)
    })
})

describe('resolveBanner', () => {
    it('shows nothing when there is no update and no install guidance', () => {
        expect(resolveBanner()).toBeNull()
    })

    it('shows the install banner when only that has something to say', () => {
        expect(resolveBanner({ installBannerMayShow: true })).toBe('install')
    })

    it.each(['ready', 'external', 'failed'])('shows the update banner for status %s', (status) => {
        expect(resolveBanner({ status })).toBe('update')
    })

    it('the update banner wins over the install banner (one at a time)', () => {
        expect(resolveBanner({ status: 'ready', installBannerMayShow: true })).toBe('update')
    })

    it('hides the update banner during a workout and lets install show instead', () => {
        expect(resolveBanner({ status: 'ready', workoutActive: true })).toBeNull()
        expect(resolveBanner({ status: 'ready', workoutActive: true, installBannerMayShow: true })).toBe('install')
    })

    it('"Later" hides it for the session', () => {
        expect(resolveBanner({ status: 'ready', dismissed: true })).toBeNull()
    })

    it('never hides "Restarting…" once the user tapped Restart', () => {
        expect(resolveBanner({ status: 'restarting', workoutActive: true, dismissed: true })).toBe('update')
    })

    it('is back as soon as the workout is finished', () => {
        expect(resolveBanner({ status: 'ready', workoutActive: false })).toBe('update')
    })
})

describe('shouldCheckForUpdate', () => {
    const t0 = 1_000_000_000_000
    it('never checks while offline', () => {
        expect(shouldCheckForUpdate({ lastCheckAt: null, now: t0, online: false })).toBe(false)
    })

    it('checks when it never has', () => {
        expect(shouldCheckForUpdate({ lastCheckAt: null, now: t0, online: true })).toBe(true)
    })

    it('respects the 15-minute floor', () => {
        expect(shouldCheckForUpdate({ lastCheckAt: t0, now: t0 + CHECK_MIN_INTERVAL_MS - 1, online: true })).toBe(false)
        expect(shouldCheckForUpdate({ lastCheckAt: t0, now: t0 + CHECK_MIN_INTERVAL_MS, online: true })).toBe(true)
    })

    it('allows a check if the clock moved backwards', () => {
        expect(shouldCheckForUpdate({ lastCheckAt: t0, now: t0 - 5000, online: true })).toBe(true)
    })

    it('does not check without a usable "now"', () => {
        expect(shouldCheckForUpdate({ lastCheckAt: t0, now: NaN, online: true })).toBe(false)
    })
})
