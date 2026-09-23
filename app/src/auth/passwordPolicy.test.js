import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from './passwordPolicy.js'

const ok = 'correct-horse'

describe('new password policy', () => {
    it('accepts any password at or above the minimum length when both boxes agree', () => {
        expect(validateNewPassword(ok, ok)).toEqual({ valid: true, reason: 'ok', message: '' })

        const exactlyMinimum = 'a'.repeat(MIN_PASSWORD_LENGTH)
        expect(validateNewPassword(exactlyMinimum, exactlyMinimum).valid).toBe(true)
    })

    it('imposes no character-class rules, so a long passphrase is enough on its own', () => {
        // NIST SP 800-63B advises against composition rules: requiring an
        // uppercase, a digit and a symbol produces `Password1!`, not entropy.
        const passphrase = 'three purple bicycles waiting'
        expect(validateNewPassword(passphrase, passphrase).valid).toBe(true)
        expect(validateNewPassword('alllowercase', 'alllowercase').valid).toBe(true)
        expect(validateNewPassword('12345678', '12345678').valid).toBe(true)
    })

    it('rejects anything below the minimum length', () => {
        const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
        const { valid, reason, message } = validateNewPassword(short, short)
        expect(valid).toBe(false)
        expect(reason).toBe('too-short')
        expect(message).toContain(String(MIN_PASSWORD_LENGTH))
    })

    it('reports an empty password as empty rather than as too short', () => {
        // Two different remedies: one is "type something", the other is
        // "type more". Collapsing them makes the first confusing.
        expect(validateNewPassword('', '').reason).toBe('empty')
    })

    it('catches a mistyped confirmation', () => {
        expect(validateNewPassword(ok, ok + 'x').reason).toBe('mismatch')
        expect(validateNewPassword(ok, '').reason).toBe('mismatch')
    })

    it('reports an unusable password as unusable even when both boxes agree', () => {
        // Length is checked before the match, so "abc"/"abc" is too-short
        // rather than silently passing the confirmation check.
        expect(validateNewPassword('abc', 'abc').reason).toBe('too-short')
    })

    it('never trims, because spaces are legitimate password characters', () => {
        // Stripping would store something other than what the user typed, and
        // they would then fail to sign in with the password they chose.
        const padded = '  spaced out  '
        expect(padded.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH)
        expect(validateNewPassword(padded, padded).valid).toBe(true)
        expect(validateNewPassword(padded, padded.trim()).reason).toBe('mismatch')
    })

    it('treats a missing or non-string argument as empty rather than throwing', () => {
        expect(validateNewPassword(undefined, undefined).reason).toBe('empty')
        expect(validateNewPassword(null, null).reason).toBe('empty')
        expect(validateNewPassword(12345678, 12345678).reason).toBe('empty')
    })

    it('keeps the minimum in step with the Supabase project setting', () => {
        // If this fails, the dashboard setting and this constant have drifted:
        // the user would pass client validation and then be rejected by the
        // server with a message they cannot act on.
        expect(MIN_PASSWORD_LENGTH).toBe(8)
    })
})
