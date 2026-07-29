/**
 * saveStatusLabel.test.js — A7b save-state honesty (corrective plan §9,
 * finding J3).
 */
import { describe, it, expect } from 'vitest'
import { mapSaveStatusToLabel, SAVE_STATUS_TEXT } from './saveStatusLabel.js'

describe('mapSaveStatusToLabel', () => {
    it('never claims "Saved on device" from a bare idle status with no proof of a persisted row', () => {
        expect(mapSaveStatusToLabel({ status: 'idle', hasKnownPersistedRow: false })).toBeNull()
    })

    it('idle WITH proof of a persisted row renders "Saved on device ✓"', () => {
        expect(mapSaveStatusToLabel({ status: 'idle', hasKnownPersistedRow: true }))
            .toBe(SAVE_STATUS_TEXT.saved)
    })

    it('saving renders "Saving…" regardless of prior proof', () => {
        expect(mapSaveStatusToLabel({ status: 'saving', hasKnownPersistedRow: false })).toBe(SAVE_STATUS_TEXT.saving)
        expect(mapSaveStatusToLabel({ status: 'saving', hasKnownPersistedRow: true })).toBe(SAVE_STATUS_TEXT.saving)
    })

    it('error renders "Not saved — Retry" regardless of prior proof', () => {
        expect(mapSaveStatusToLabel({ status: 'error', hasKnownPersistedRow: false })).toBe(SAVE_STATUS_TEXT.error)
        expect(mapSaveStatusToLabel({ status: 'error', hasKnownPersistedRow: true })).toBe(SAVE_STATUS_TEXT.error)
    })

    it('an unrecognized status is neutral (null), never an alarming default', () => {
        expect(mapSaveStatusToLabel({ status: 'bogus', hasKnownPersistedRow: true })).toBeNull()
    })
})
