/**
 * backupPush.test.js — outbound push transport rules (W29).
 *
 * The point of this suite is the SUCCESS DEFINITION. The old Sheets webhook
 * used `mode: 'no-cors'`, inferred success, and made failures invisible
 * (sync/syncQueue.js:8-14). A backup feature that repeated that would be worse
 * than useless — it would report "backed up" while sending into a void. So
 * these tests pin, individually: a 4xx is not success, a 2xx with HTML is not
 * success, a 2xx with `{ ok: false }` is not success, and a timeout is
 * distinguishable from a dead host.
 */
import { describe, it, expect, vi } from 'vitest'
import {
    pushBackup,
    interpretResponse,
    isValidEndpoint,
    PUSH_ERRORS,
} from './backupPush.js'

const ENDPOINT = 'https://systems.example.test/webhook/abc123'
const stubExporter = async () => ({ format: 'combatos-full-backup', version: 2, tables: {} })

/** Minimal Response-alike; `json` rejects when `body` is the JSON_FAILS marker. */
const JSON_FAILS = Symbol('json-fails')
function res({ ok = true, status = 200, body = { ok: true } } = {}) {
    return {
        ok, status,
        json: async () => {
            if (body === JSON_FAILS) throw new SyntaxError('Unexpected token <')
            return body
        },
    }
}

describe('isValidEndpoint', () => {
    it('accepts an https URL', () => {
        expect(isValidEndpoint(ENDPOINT)).toBe(true)
        expect(isValidEndpoint('  ' + ENDPOINT + '  ')).toBe(true)
    })

    it('rejects http — the payload is the entire local database', () => {
        // Not a stylistic preference: a scheme typo would ship everything the
        // user has in cleartext.
        expect(isValidEndpoint('http://systems.example.test/hook')).toBe(false)
        expect(isValidEndpoint('http://localhost:5678/webhook/x')).toBe(false)
    })

    it('rejects non-URLs, other schemes, and empty input', () => {
        for (const v of ['', '   ', 'not a url', 'systems.example.test/hook',
            'ftp://x.test/a', 'javascript:alert(1)', null, undefined, 42, {}]) {
            expect(isValidEndpoint(v)).toBe(false)
        }
    })
})

describe('interpretResponse — what counts as success', () => {
    it('accepts a 2xx carrying an ok acknowledgement', () => {
        expect(interpretResponse({ ok: true, status: 200, body: { ok: true, backupId: 'b1' } }))
            .toEqual({ ok: true, backupId: 'b1', status: 200 })
    })

    it('tolerates a missing backupId', () => {
        expect(interpretResponse({ ok: true, status: 200, body: { ok: true } }))
            .toEqual({ ok: true, backupId: null, status: 200 })
    })

    it('rejects any non-2xx — fetch does NOT reject on 4xx/5xx', () => {
        for (const status of [400, 401, 403, 404, 413, 500, 502]) {
            expect(interpretResponse({ ok: false, status, body: { ok: true } }))
                .toEqual({ ok: false, error: PUSH_ERRORS.HTTP, status })
        }
    })

    it('rejects a 2xx that is not a JSON acknowledgement', () => {
        // The realistic case: a reverse proxy or SSO interstitial answering
        // 200 with an HTML login page.
        expect(interpretResponse({ ok: true, status: 200, body: null }).error).toBe(PUSH_ERRORS.BAD_ACK)
        expect(interpretResponse({ ok: true, status: 200, body: 'ok' }).error).toBe(PUSH_ERRORS.BAD_ACK)
    })

    it('rejects a JSON acknowledgement that explicitly says not-ok', () => {
        expect(interpretResponse({ ok: true, status: 200, body: { ok: false } }).error)
            .toBe(PUSH_ERRORS.BAD_ACK)
        expect(interpretResponse({ ok: true, status: 202, body: { ok: 'true' } }).error)
            .toBe(PUSH_ERRORS.BAD_ACK)   // string, not boolean
    })
})

describe('pushBackup — preconditions', () => {
    it('reports not-configured before touching the network', async () => {
        const fetchImpl = vi.fn()
        expect(await pushBackup({ endpoint: '', fetchImpl, exporter: stubExporter }))
            .toEqual({ ok: false, error: PUSH_ERRORS.NOT_CONFIGURED })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('rejects an invalid endpoint before touching the network', async () => {
        const fetchImpl = vi.fn()
        expect(await pushBackup({ endpoint: 'http://x.test/h', fetchImpl, exporter: stubExporter }))
            .toEqual({ ok: false, error: PUSH_ERRORS.INVALID_ENDPOINT })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('treats offline as an expected state, not a failure to retry against', async () => {
        const fetchImpl = vi.fn()
        const out = await pushBackup({
            endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => false,
        })
        expect(out).toEqual({ ok: false, error: PUSH_ERRORS.OFFLINE })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('does not export the database when a precondition fails', async () => {
        // Exporting is a full read of every table; doing it for a push that
        // cannot happen is pure waste on a phone.
        const exporter = vi.fn(stubExporter)
        await pushBackup({ endpoint: '', fetchImpl: vi.fn(), exporter })
        expect(exporter).not.toHaveBeenCalled()
    })
})

describe('pushBackup — request shape', () => {
    it('POSTs JSON in cors mode, never no-cors', async () => {
        const fetchImpl = vi.fn(async () => res())
        await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true })

        const [url, init] = fetchImpl.mock.calls[0]
        expect(url).toBe(ENDPOINT)
        expect(init.method).toBe('POST')
        expect(init.mode).toBe('cors')
        expect(init.mode).not.toBe('no-cors')   // the invisible-failure defect
        expect(init.headers['Content-Type']).toBe('application/json')
        expect(JSON.parse(init.body).format).toBe('combatos-full-backup')
    })

    it('sends a bearer token when configured, and no auth header when not', async () => {
        const fetchImpl = vi.fn(async () => res())
        await pushBackup({ endpoint: ENDPOINT, token: 'tok', fetchImpl, exporter: stubExporter, isOnline: () => true })
        expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')

        const bare = vi.fn(async () => res())
        await pushBackup({ endpoint: ENDPOINT, fetchImpl: bare, exporter: stubExporter, isOnline: () => true })
        expect(bare.mock.calls[0][1].headers.Authorization).toBeUndefined()
    })

    it('generates the snapshot at send time so a retry carries current state', async () => {
        const exporter = vi.fn(stubExporter)
        const fetchImpl = vi.fn(async () => res())
        await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter, isOnline: () => true })
        await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter, isOnline: () => true })
        expect(exporter).toHaveBeenCalledTimes(2)
    })
})

describe('pushBackup — outcomes', () => {
    it('succeeds only on a validated acknowledgement', async () => {
        const fetchImpl = async () => res({ body: { ok: true, backupId: 'b7' } })
        expect(await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true }))
            .toEqual({ ok: true, backupId: 'b7', status: 200 })
    })

    it('fails on a 2xx whose body is not JSON', async () => {
        const fetchImpl = async () => res({ body: JSON_FAILS })
        const out = await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true })
        expect(out.ok).toBe(false)
        expect(out.error).toBe(PUSH_ERRORS.BAD_ACK)
    })

    it('fails on an HTTP error status', async () => {
        const fetchImpl = async () => res({ ok: false, status: 401, body: { ok: false } })
        const out = await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true })
        expect(out).toMatchObject({ ok: false, error: PUSH_ERRORS.HTTP, status: 401 })
    })

    it('classifies a thrown fetch as NETWORK — CORS and a dead host are indistinguishable', async () => {
        const fetchImpl = async () => { throw new TypeError('Failed to fetch') }
        const out = await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true })
        expect(out).toEqual({ ok: false, error: PUSH_ERRORS.NETWORK })
    })

    it('distinguishes an abort/timeout from a network failure', async () => {
        const fetchImpl = async () => {
            const err = new Error('aborted'); err.name = 'AbortError'; throw err
        }
        const out = await pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true })
        expect(out).toEqual({ ok: false, error: PUSH_ERRORS.TIMEOUT })
    })

    it('never throws — a failed backup must not take the caller down with it', async () => {
        const fetchImpl = async () => { throw new Error('boom') }
        await expect(
            pushBackup({ endpoint: ENDPOINT, fetchImpl, exporter: stubExporter, isOnline: () => true })
        ).resolves.toMatchObject({ ok: false })
    })
})
