/**
 * auth/authErrors.js — Supabase sign-in failures to user-facing copy (W31).
 *
 * Pure on purpose. D14 (component-test infrastructure) is unruled, so this
 * repo's pattern is to extract the decision into a predicate, test that, and
 * device-verify the wiring — the same shape as `offlineAccess.js`.
 *
 * The property that matters: a rejected credential returns ONE message whether
 * the email is unknown, the password is wrong, or the account was never
 * confirmed. Distinguishing them turns the sign-in form into a user-enumeration
 * oracle, and there is nothing a user could usefully do with the more specific
 * answer — accounts are invite-only and provisioned out of band, so every one
 * of those cases has the same remedy: ask the coach. `reason` keeps the
 * distinction for tests and logging; only `message` is ever rendered.
 *
 * Matched on structured fields (`name`, `code`, `status`) ahead of message
 * text, because Supabase's human-readable strings change between releases
 * while the codes are a published contract (`@supabase/auth-js`
 * lib/error-codes).
 */

export const SIGN_IN_MESSAGES = {
    'none': '',
    'rejected': 'Email or password is incorrect.',
    'offline': 'Cannot reach the server. Check your connection and try again.',
    'rate-limited': 'Too many attempts. Wait a few minutes, then try again.',
    'weak-password': 'Your password no longer meets the current requirements. Ask your coach to reset it.',
    'unconfigured': 'This build has no cloud connection, so sign-in is unavailable.',
    'unknown': 'Could not sign you in. Try again.',
}

/**
 * Classify a Supabase sign-in error.
 * @param error the `{ error }` value returned by AuthProvider's signInWithPassword
 * @returns {{ reason: string, message: string }} reason is for logs; message is for humans
 */
export function describeSignInError(error) {
    const reason = classify(error)
    return { reason, message: SIGN_IN_MESSAGES[reason] }
}

function classify(error) {
    if (!error) return 'none'

    const name = typeof error.name === 'string' ? error.name : ''
    const code = typeof error.code === 'string' ? error.code : ''
    const status = typeof error.status === 'number' ? error.status : null
    const message = typeof error.message === 'string' ? error.message : ''

    // Offline is checked first: a fetch that never reached Supabase carries no
    // code, and reading it as a bad credential would tell the user to doubt a
    // password that is perfectly fine.
    if (name === 'AuthRetryableFetchError' || status === 0) return 'offline'

    if (code === 'over_request_rate_limit' || status === 429) return 'rate-limited'

    // auth-js raises this whenever a response body carries a `weak_password`
    // object (lib/fetch.js), so /token can too when a stored password predates
    // a tightened strength policy. The password is not wrong, it is no longer
    // acceptable — and only the operator can resolve that.
    if (name === 'AuthWeakPasswordError' || code === 'weak_password') return 'weak-password'

    // AuthProvider's own short-circuit when VITE_SUPABASE_* is absent from the
    // build. Message-matched because it is our Error, not Supabase's.
    if (/not configured/i.test(message)) return 'unconfigured'

    // Everything the server rejected on credential grounds collapses to one
    // answer. `status === 400` is the deliberate catch-all: the form already
    // validates the email shape, so a 400 here is a credential rejection in
    // all but pathological cases, and guessing wrong in the safe direction
    // costs only precision in a message the user cannot act on anyway.
    if (
        code === 'invalid_credentials' ||
        code === 'email_not_confirmed' ||
        code === 'user_not_found' ||
        code === 'email_address_not_authorized' ||
        code === 'user_banned' ||
        status === 400
    ) {
        return 'rejected'
    }

    return 'unknown'
}
