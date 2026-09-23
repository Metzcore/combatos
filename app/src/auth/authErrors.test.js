import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { SIGN_IN_MESSAGES, describeSignInError } from './authErrors.js'

describe('sign-in error copy', () => {
    it('gives one identical answer for every credential rejection, so the form is not an enumeration oracle', () => {
        // Unknown email, wrong password, unconfirmed account and a banned user
        // must be indistinguishable to the person typing.
        const rejections = [
            new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
            new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'),
            new AuthApiError('User not found', 400, 'user_not_found'),
            new AuthApiError('User is banned', 403, 'user_banned'),
        ]

        for (const error of rejections) {
            const { reason, message } = describeSignInError(error)
            expect(reason).toBe('rejected')
            expect(message).toBe(SIGN_IN_MESSAGES.rejected)
        }

        // One distinct message across the whole set — not just per case.
        const messages = new Set(rejections.map((e) => describeSignInError(e).message))
        expect(messages.size).toBe(1)
    })

    it('never names the email address or the field that failed', () => {
        const { message } = describeSignInError(
            new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
        )
        expect(message).not.toMatch(/email address|no such|not found|unregistered|wrong password/i)
    })

    it('separates an unreachable server from a bad credential', () => {
        // Telling someone their password is wrong when the request never left
        // the device sends them to reset a password that is fine.
        const { reason, message } = describeSignInError(new AuthRetryableFetchError('Failed to fetch', 0))
        expect(reason).toBe('offline')
        expect(message).toBe(SIGN_IN_MESSAGES.offline)
    })

    it('reports rate limiting as a wait, not a failure', () => {
        expect(describeSignInError(new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit')).reason)
            .toBe('rate-limited')
    })

    it('routes a password that no longer meets policy to the operator, not to a retry', () => {
        // auth-js raises this from any endpoint whose response body carries a
        // weak_password object, so /token can too once strength settings tighten.
        const { reason, message } = describeSignInError(
            new AuthWeakPasswordError('Password is too weak', 400, ['length']),
        )
        expect(reason).toBe('weak-password')
        expect(message).toMatch(/coach/i)
    })

    it('distinguishes a build with no Supabase config from a rejected credential', () => {
        expect(describeSignInError(new Error('Supabase is not configured for this build.')).reason)
            .toBe('unconfigured')
    })

    it('falls back to a retryable message rather than asserting a cause it does not know', () => {
        expect(describeSignInError(new Error('something unmapped')).reason).toBe('unknown')
        expect(describeSignInError({}).reason).toBe('unknown')
    })

    it('treats no error as no message, so a success path renders nothing', () => {
        expect(describeSignInError(null)).toEqual({ reason: 'none', message: '' })
        expect(describeSignInError(undefined).message).toBe('')
    })

    it('always returns a string message, for every reason it can produce', () => {
        for (const [reason, message] of Object.entries(SIGN_IN_MESSAGES)) {
            expect(typeof message, reason).toBe('string')
        }
    })
})
