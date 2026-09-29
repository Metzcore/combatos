/**
 * auth/passwordPolicy.js — what counts as an acceptable new password (W33).
 *
 * Pure, like `authErrors.js` and `offlineAccess.js`: D14 is unruled, so the
 * decision is extracted into a predicate and tested, and the wiring is
 * device-verified.
 *
 * ⚠️ MIN_PASSWORD_LENGTH mirrors the Supabase project setting
 * (Auth → Sign In / Providers → Email → Minimum password length). If one moves
 * without the other, the user passes client validation and then gets a server
 * rejection they cannot act on. Change both together.
 *
 * Eight, and no required character classes, is deliberate rather than lax.
 * NIST SP 800-63B puts the floor for user-chosen secrets at 8 and explicitly
 * advises AGAINST composition rules, because "must contain an uppercase, a
 * digit and a symbol" reliably produces `Password1!` rather than entropy. The
 * one NIST control we are knowingly skipping is screening against breached
 * password lists — Supabase gates that behind the Pro plan, and upgrading is
 * ruled out (decision log, 2026-09-23 #5).
 */

export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_MESSAGES = {
    'ok': '',
    'empty': 'Choose a password.',
    'too-short': 'Use at least ' + MIN_PASSWORD_LENGTH + ' characters.',
    'mismatch': 'The two passwords do not match.',
}

/**
 * Validate a new password and its confirmation.
 *
 * Length is measured on the raw string, deliberately un-trimmed: leading and
 * trailing spaces are legitimate password characters, and silently stripping
 * them would mean the stored password is not what the user typed.
 *
 * @returns {{ valid: boolean, reason: string, message: string }}
 */
export function validateNewPassword(password, confirmation) {
    const next = typeof password === 'string' ? password : ''
    const repeat = typeof confirmation === 'string' ? confirmation : ''

    const reason = classify(next, repeat)
    return { valid: reason === 'ok', reason, message: PASSWORD_MESSAGES[reason] }
}

function classify(next, repeat) {
    if (next.length === 0) return 'empty'
    if (next.length < MIN_PASSWORD_LENGTH) return 'too-short'
    // Checked last so an obviously unusable password is reported as such even
    // when both boxes happen to agree.
    if (next !== repeat) return 'mismatch'
    return 'ok'
}
