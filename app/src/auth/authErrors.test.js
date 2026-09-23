import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
    PASSWORD_UPDATE_MESSAGES,
    SIGN_IN_MESSAGES,
    describePasswordUpdateError,
    describeSignInError,
} from './authErrors.js'

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

describe('password update copy', () => {
    it('tells the user what to change, unlike sign-in which deliberately does not', () => {
        // No enumeration concern here: the caller is already authenticated, so
        // a specific message is helpful rather than leaky.
        expect(describePasswordUpdateError(new AuthWeakPasswordError('too weak', 400, ['length'])).reason)
            .toBe('weak-password')
        expect(describePasswordUpdateError(new AuthApiError('same password', 422, 'same_password')).reason)
            .toBe('same-password')
    })

    it('sends an exhausted recovery link back for a new one rather than blaming the password', () => {
        // A used or expired link is not a bad password. Telling the user to
        // pick a different password would loop them forever.
        for (const error of [
            new AuthApiError('Session expired', 401, 'session_expired'),
            new AuthApiError('Token has expired', 403, 'otp_expired'),
            new AuthApiError('Session not found', 404, 'session_not_found'),
        ]) {
            const { reason, message } = describePasswordUpdateError(error)
            expect(reason).toBe('expired')
            expect(message).toMatch(/new one|request/i)
        }
    })

    it('separates an unreachable server and rate limiting from a rejected password', () => {
        expect(describePasswordUpdateError(new AuthRetryableFetchError('Failed to fetch', 0)).reason)
            .toBe('offline')
        expect(describePasswordUpdateError(new AuthApiError('slow down', 429, 'over_request_rate_limit')).reason)
            .toBe('rate-limited')
    })

    it('treats no error as no message, so the success path renders nothing', () => {
        expect(describePasswordUpdateError(null)).toEqual({ reason: 'none', message: '' })
    })

    it('falls back rather than asserting a cause it does not know', () => {
        expect(describePasswordUpdateError(new Error('unmapped')).reason).toBe('unknown')
    })

    it('always returns a string message, for every reason it can produce', () => {
        for (const [reason, message] of Object.entries(PASSWORD_UPDATE_MESSAGES)) {
            expect(typeof message, reason).toBe('string')
        }
    })
})
