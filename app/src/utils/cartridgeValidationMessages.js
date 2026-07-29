/**
 * utils/cartridgeValidationMessages.js — A7b user-facing validation error
 * text (corrective plan §9 / finding J8).
 *
 * validateCartridgeSessionPayload's messages are developer-facing (schema
 * paths, field names) — this maps a KNOWN, common failure onto plain
 * language the UI can show directly, so a non-integer duration doesn't dead-
 * end the user in the generic "Could not log this session. Try again." loop
 * (which cannot succeed on retry, since nothing about the input changed).
 * Any other/unrecognized failure still falls back to the generic message —
 * this is deliberately narrow, not a general validator-message translator.
 */

const DURATION_MESSAGE = 'Duration must be a whole number of minutes (no decimals) — check the value and try again.'
const GENERIC_MESSAGE = 'Could not log this session. Try again.'

/**
 * describeCartridgeValidationError — a short, user-presentable string for a
 * validateCartridgeSessionPayload() error array.
 *
 * @param {string[]} errors
 * @returns {string}
 */
export function describeCartridgeValidationError(errors) {
    if (Array.isArray(errors) && errors.some((e) => typeof e === 'string' && e.toLowerCase().includes('sessionduration'))) {
        return DURATION_MESSAGE
    }
    return GENERIC_MESSAGE
}
