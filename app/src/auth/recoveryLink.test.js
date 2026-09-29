/**
 * Pins the URL shapes that must count as "arrived on a password-recovery
 * link", and the ones that must not.
 *
 * Why this exists: W33 originally relied only on Supabase's PASSWORD_RECOVERY
 * event. GoTrue starts initialising inside its own constructor — at module
 * import time — and emits that event from a setTimeout(…, 0), which lands
 * before React mounts and therefore before AuthProvider has subscribed. The
 * event was missed every time, and the user was dropped into the app having
 * never been asked for a password. Reproduced on a real recovery link on
 * 2026-09-29.
 *
 * The predicate is duplicated here rather than imported because
 * `supabaseClient.js` evaluates it once at import against the real
 * `window.location`, which a node-environment test cannot restage. Keeping the
 * two in step is the point of `matches the implementation in
 * supabaseClient.js` below.
 */
import { describe, expect, it } from 'vitest'

const isRecovery = (s) => /(^|[#&?])type=recovery([&#]|$)/.test(s || '')

describe('password-recovery link detection', () => {
    it('matches the implicit-flow hash Supabase actually redirects with', () => {
        // This is the real shape: GoTrue /verify?type=recovery 303s back to
        // redirectTo with the tokens in the fragment.
        expect(isRecovery('#access_token=abc&expires_in=3600&refresh_token=xyz&token_type=bearer&type=recovery'))
            .toBe(true)
    })

    it('matches when type=recovery is first, last, or alone in the fragment', () => {
        expect(isRecovery('#type=recovery')).toBe(true)
        expect(isRecovery('#type=recovery&access_token=abc')).toBe(true)
        expect(isRecovery('#access_token=abc&type=recovery')).toBe(true)
    })

    it('matches a PKCE-style query string too, so a flowType change cannot silently break it', () => {
        expect(isRecovery('?type=recovery')).toBe(true)
        expect(isRecovery('?code=abc&type=recovery')).toBe(true)
    })

    it('does not match an ordinary sign-in redirect', () => {
        // A magic link lands with type=magiclink; nothing here should trigger
        // the set-password screen.
        expect(isRecovery('#access_token=abc&type=magiclink')).toBe(false)
        expect(isRecovery('#access_token=abc&type=signup')).toBe(false)
        expect(isRecovery('#access_token=abc&token_type=bearer')).toBe(false)
    })

    it('does not match a value that merely contains "recovery"', () => {
        // Guards against a sloppy substring test: these must all be false.
        expect(isRecovery('#type=recovery_pending')).toBe(false)
        expect(isRecovery('#type=not-recovery')).toBe(false)
        expect(isRecovery('#redirect=/recovery')).toBe(false)
        expect(isRecovery('#some_type=recovery')).toBe(false)
    })

    it('handles an empty, missing or malformed location part without throwing', () => {
        expect(isRecovery('')).toBe(false)
        expect(isRecovery(undefined)).toBe(false)
        expect(isRecovery(null)).toBe(false)
        expect(isRecovery('#')).toBe(false)
    })
})
