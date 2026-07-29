/**
 * cartridgeValidationMessages.test.js — A7b user-facing validation error
 * text (corrective plan §9, finding J8).
 */
import { describe, it, expect } from 'vitest'
import { describeCartridgeValidationError } from './cartridgeValidationMessages.js'

describe('describeCartridgeValidationError', () => {
    it('surfaces a specific duration message when a sessionDuration error is present', () => {
        const errors = ['sessionDuration must be a finite non-negative integer (minutes)']
        expect(describeCartridgeValidationError(errors)).toMatch(/whole number of minutes/i)
    })

    it('falls back to the generic message for unrelated validation errors', () => {
        const errors = ['cartridgeId is required']
        expect(describeCartridgeValidationError(errors)).toBe('Could not log this session. Try again.')
    })

    it('falls back to the generic message for an empty or non-array input', () => {
        expect(describeCartridgeValidationError([])).toBe('Could not log this session. Try again.')
        expect(describeCartridgeValidationError(undefined)).toBe('Could not log this session. Try again.')
    })
})
