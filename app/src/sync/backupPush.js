/**
 * sync/backupPush.js — outbound full-backup push to a user-configured endpoint (W29).
 *
 * WHY THIS IS A SIBLING OF syncQueue.js AND NOT PART OF IT
 * A weight/session envelope and a whole-database snapshot look similar for
 * about five minutes. They are not:
 *
 *   - syncQueue rows are per-session and immutable; a backup should COALESCE
 *     to "latest state", not accumulate one large immutable job per change.
 *   - `pushEnvelope` hardcodes the Supabase `sessions` table, and any unknown
 *     action falls through to the session INSERT path — extending it would
 *     mean editing the protected workout drain to add an unrelated feature.
 *   - syncQueue rows are themselves included in a full backup. Putting backup
 *     jobs in that table would make transport state, and a duplicate copy of
 *     the payload, back themselves up.
 *   - syncQueue treats a 23505 unique violation as success, which is correct
 *     only because a logged session is immutable. Nothing here shares that.
 *
 * So this module reuses the syncQueue PATTERN — auth-adjacent gating, a single
 * in-flight guard, app-open/focus/online triggers — and none of its contract.
 *
 * TRANSPORT RULES (the expensive lesson, already paid for once)
 * syncQueue.js:8-14 records that the old Google Sheets webhook used
 * `mode: 'no-cors'`, which yields an opaque response: success was inferred and
 * failures were INVISIBLE. Repointing to Supabase for real ok/error responses
 * was a specific fix. Reintroducing fire-and-forget here would recreate the
 * exact defect in a feature whose entire job is "did my data actually land?".
 * Therefore:
 *
 *   - default `cors` mode, never `no-cors`;
 *   - `fetch` resolving means the TRANSPORT completed, not that the server
 *     accepted anything — 4xx/5xx do not reject, so `!response.ok` is failure;
 *   - a 2xx alone is not success either. A reverse proxy login page or an
 *     interstitial happily returns 200 with HTML. Success requires a parseable
 *     JSON acknowledgement whose `ok` is true.
 */

import { exportFullBackup } from '../db/backup.js'

/** Milliseconds before an in-flight push is aborted. */
export const PUSH_TIMEOUT_MS = 30_000

/** Settings keys owned by this module (timestamps/errors, NOT credentials). */
export const LAST_PUSH_OK_KEY = 'agentBackupLastSuccessAt'
export const LAST_PUSH_ERROR_KEY = 'agentBackupLastError'

/**
 * Failure classification. Kept coarse and stable because it is shown to a
 * non-technical user and stored; a raw exception string is neither.
 */
export const PUSH_ERRORS = Object.freeze({
    NOT_CONFIGURED: 'not-configured',
    INVALID_ENDPOINT: 'invalid-endpoint',
    OFFLINE: 'offline',
    NETWORK: 'network',          // DNS, TLS, CORS rejection, connection refused
    TIMEOUT: 'timeout',
    HTTP: 'http',                // reached the server; it refused
    BAD_ACK: 'bad-ack',          // 2xx, but not a backup endpoint's answer
})

/**
 * isValidEndpoint — https-only, parseable absolute URL.
 *
 * http:// is rejected rather than merely discouraged: this payload is the
 * user's entire local database, and shipping it in cleartext because someone
 * typo'd the scheme is not a tradeoff worth offering. localhost is not special-
 * cased — a real endpoint for this feature is remote by definition.
 */
export function isValidEndpoint(url) {
    if (typeof url !== 'string' || url.trim() === '') return false
    let parsed
    try {
        parsed = new URL(url.trim())
    } catch {
        return false
    }
    return parsed.protocol === 'https:'
}

/**
 * interpretResponse — decide success from a completed fetch. PURE.
 *
 * Separated from the network call so the rules above are directly testable
 * without mocking a server. `body` is the already-parsed JSON, or null when
 * parsing failed.
 */
export function interpretResponse({ ok, status, body }) {
    if (!ok) return { ok: false, error: PUSH_ERRORS.HTTP, status }
    if (!body || typeof body !== 'object') return { ok: false, error: PUSH_ERRORS.BAD_ACK, status }
    if (body.ok !== true) return { ok: false, error: PUSH_ERRORS.BAD_ACK, status }
    return { ok: true, backupId: typeof body.backupId === 'string' ? body.backupId : null, status }
}

/**
 * pushBackup — send one snapshot to the configured endpoint.
 *
 * Dependencies are injected (`fetchImpl`, `now`, `exporter`) so the whole
 * module is testable in the repo's `node` test environment without a DOM,
 * a server, or a real clock.
 *
 * The snapshot is generated HERE, at send time, rather than passed in — a
 * retry must carry current device state, not whatever was true when the
 * attempt was first queued.
 */
export async function pushBackup({
    endpoint,
    token,
    fetchImpl = globalThis.fetch,
    isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    exporter = exportFullBackup,
    timeoutMs = PUSH_TIMEOUT_MS,
} = {}) {
    if (!endpoint) return { ok: false, error: PUSH_ERRORS.NOT_CONFIGURED }
    if (!isValidEndpoint(endpoint)) return { ok: false, error: PUSH_ERRORS.INVALID_ENDPOINT }
    // Offline is an expected state for a gym app, not a failure worth
    // recording or retrying against — bail before burning an attempt.
    if (!isOnline()) return { ok: false, error: PUSH_ERRORS.OFFLINE }
    if (typeof fetchImpl !== 'function') return { ok: false, error: PUSH_ERRORS.NETWORK }

    const data = await exporter()

    const controller = typeof AbortController === 'function' ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    let response
    try {
        response = await fetchImpl(endpoint.trim(), {
            method: 'POST',
            // Explicit: the default IS 'cors', but stating it documents that
            // 'no-cors' was considered and rejected. See the header note.
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
            signal: controller ? controller.signal : undefined,
        })
    } catch (err) {
        // A CORS rejection surfaces here indistinguishably from a dead host —
        // the browser deliberately withholds the difference. Both are NETWORK.
        const aborted = err && (err.name === 'AbortError' || err.name === 'TimeoutError')
        return { ok: false, error: aborted ? PUSH_ERRORS.TIMEOUT : PUSH_ERRORS.NETWORK }
    } finally {
        if (timer) clearTimeout(timer)
    }

    let body = null
    try {
        body = await response.json()
    } catch {
        body = null   // 2xx HTML from a proxy lands here → BAD_ACK below
    }

    return interpretResponse({ ok: response.ok, status: response.status, body })
}
