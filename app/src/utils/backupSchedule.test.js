/**
 * backupSchedule.test.js — the pure "should we push now?" predicate (W29 PR E).
 *
 * This is the only unit-testable slice of the auto-push scheduler: the suite
 * runs `environment: 'node'` (no DOM, no React testing library — D14), so the
 * hook itself (window/focus/online wiring) is exercised only by hand. Every
 * decision branch that matters lives here instead.
 *
 * TZ pin (matches checklistDate.test.js): instants are built with the LOCAL
 * Date constructor and compared via localDateStr, so pinning a real, non-UTC
 * zone proves the "local calendar day" rule is genuinely local-timezone-aware
 * rather than accidentally correct only under UTC.
 */
process.env.TZ = 'Europe/London'

import { describe, it, expect } from 'vitest'
import { isPushDue } from './backupSchedule.js'
import { localDateStr } from './checklistDate.js'

const ENDPOINT = 'https://systems.example.test/webhook/abc123'

describe('isPushDue — gating', () => {
    it('is never due when auto-push is off, regardless of everything else', () => {
        expect(isPushDue({
            lastSuccessIso: null, today: '2026-07-31', endpoint: ENDPOINT, autoPush: false,
        })).toBe(false)
    })

    it('is never due when no endpoint is configured', () => {
        expect(isPushDue({
            lastSuccessIso: null, today: '2026-07-31', endpoint: '', autoPush: true,
        })).toBe(false)
        expect(isPushDue({
            lastSuccessIso: null, today: '2026-07-31', endpoint: null, autoPush: true,
        })).toBe(false)
    })

    it('is never due without a "today" to compare against', () => {
        expect(isPushDue({
            lastSuccessIso: null, today: '', endpoint: ENDPOINT, autoPush: true,
        })).toBe(false)
    })
})

describe('isPushDue — first push', () => {
    it('is due immediately when there is no recorded success yet', () => {
        expect(isPushDue({
            lastSuccessIso: null, today: '2026-07-31', endpoint: ENDPOINT, autoPush: true,
        })).toBe(true)
        expect(isPushDue({
            lastSuccessIso: undefined, today: '2026-07-31', endpoint: ENDPOINT, autoPush: true,
        })).toBe(true)
    })

    it('is due when the stored success timestamp is unparseable — fail open, not stuck', () => {
        expect(isPushDue({
            lastSuccessIso: 'not-a-date', today: '2026-07-31', endpoint: ENDPOINT, autoPush: true,
        })).toBe(true)
    })
})

describe('isPushDue — once per LOCAL calendar day', () => {
    it('is not due again the same local day as the last success', () => {
        const lastSuccess = new Date(2026, 6, 31, 6, 0) // 06:00 local, July 31
        const laterSameDay = new Date(2026, 6, 31, 22, 0) // 22:00 local, still July 31
        expect(isPushDue({
            lastSuccessIso: lastSuccess.toISOString(),
            today: localDateStr(laterSameDay),
            endpoint: ENDPOINT, autoPush: true,
        })).toBe(false)
    })

    it('is due again once the local calendar date has advanced, even if less than 24h elapsed', () => {
        // A push at 23:50 local the previous day, checked again at 00:05 the
        // next local day — barely 15 minutes elapsed, but a NEW local day.
        const lastSuccess = new Date(2026, 6, 30, 23, 50)
        const nextMorning = new Date(2026, 6, 31, 0, 5)
        expect(isPushDue({
            lastSuccessIso: lastSuccess.toISOString(),
            today: localDateStr(nextMorning),
            endpoint: ENDPOINT, autoPush: true,
        })).toBe(true)
    })

    it('is due when the last success predates today by many days', () => {
        const lastSuccess = new Date(2026, 6, 20, 12, 0)
        const today = new Date(2026, 6, 31, 12, 0)
        expect(isPushDue({
            lastSuccessIso: lastSuccess.toISOString(),
            today: localDateStr(today),
            endpoint: ENDPOINT, autoPush: true,
        })).toBe(true)
    })
})
