/**
 * bodyWeightSync.test.js — W30 outbound weight drain.
 *
 * The headline case is THE 23505 TRAP: syncQueue treats a unique violation as
 * success because a logged session is immutable. Weight is mutable per day, so
 * the same shortcut would mean a corrected value never reaches the server —
 * the athlete sees the new number, the coach keeps reading the old one, and
 * nothing reports an error. That case is pinned explicitly below.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    syncBodyWeight,
    pushWeightRow,
    WEIGHT_SYNC_ERRORS,
    __resetInFlightForTests,
} from './bodyWeightSync.js'

const OWNER_A = '11111111-1111-4111-8111-111111111111'
const OWNER_B = '22222222-2222-4222-8222-222222222222'

const row = (over = {}) => ({
    ownerUserId: OWNER_A,
    date: '2026-07-30',
    kg: 81.6,
    clientId: 'c-1',
    updatedAt: 'T1',
    syncState: 'pending',
    ...over,
})

/** Supabase-alike. `upsertResult` controls what the table call returns. */
function fakeClient({ session = { user: { id: OWNER_A } }, upsertResult = { error: null } } = {}) {
    const upsert = vi.fn(async () => upsertResult)
    return {
        upsert,
        auth: { getSession: async () => ({ data: { session } }) },
        from: vi.fn(() => ({ upsert })),
    }
}

beforeEach(() => __resetInFlightForTests())

describe('THE 23505 TRAP — a same-day correction must still reach the server', () => {
    it('UPSERTS on conflict instead of treating a unique violation as success', async () => {
        const client = fakeClient()
        await pushWeightRow(row(), OWNER_A, client)

        expect(client.from).toHaveBeenCalledWith('body_metrics')
        const [payload, options] = client.upsert.mock.calls[0]
        expect(payload).toEqual({
            user_id: OWNER_A, measured_on: '2026-07-30', kg: 81.6, client_id: 'c-1',
        })
        // The conflict target IS the owner/day key — so a correction updates
        // the row rather than colliding with it.
        expect(options).toEqual({ onConflict: 'user_id,measured_on' })
    })

    it('does NOT swallow a 23505 as success', async () => {
        // syncQueue.js does exactly this and is right to, because a session is
        // immutable. Copying it here would silently drop every correction.
        const client = fakeClient({ upsertResult: { error: { code: '23505' } } })
        const out = await pushWeightRow(row(), OWNER_A, client)
        expect(out.ok).toBe(false)
        expect(out.error).toBe(WEIGHT_SYNC_ERRORS.REJECTED)
    })
})

describe('ownership', () => {
    it('refuses to send a row belonging to a different owner', async () => {
        // The drain must never stamp whoever is signed in onto someone else's
        // row. This is health data shared with a coach.
        const client = fakeClient()
        const out = await pushWeightRow(row({ ownerUserId: OWNER_B }), OWNER_A, client)
        expect(out).toEqual({ ok: false, error: WEIGHT_SYNC_ERRORS.REJECTED })
        expect(client.upsert).not.toHaveBeenCalled()
    })

    it('drains only the authenticated owner\'s pending rows', async () => {
        const client = fakeClient()
        const getPending = vi.fn(async () => [row()])
        await syncBodyWeight({
            client, configured: true, isOnline: () => true,
            getPending, onSynced: async () => true, onError: async () => true,
        })
        expect(getPending).toHaveBeenCalledWith(OWNER_A)
    })

    it('handles a null/garbage row without throwing', async () => {
        const client = fakeClient()
        expect((await pushWeightRow(null, OWNER_A, client)).ok).toBe(false)
        expect((await pushWeightRow(undefined, OWNER_A, client)).ok).toBe(false)
    })
})

describe('ambient states bail before recording a failure', () => {
    const noWrites = () => {
        const onError = vi.fn(async () => true)
        return { onError }
    }

    it('offline', async () => {
        const { onError } = noWrites()
        const out = await syncBodyWeight({
            client: fakeClient(), configured: true, isOnline: () => false,
            getPending: async () => [row()], onSynced: async () => true, onError,
        })
        expect(out).toMatchObject({ ok: false, error: WEIGHT_SYNC_ERRORS.OFFLINE, synced: 0 })
        // Walking into a basement must not attach "sync failed" to a weight
        // entry — that would train the user to ignore a real signal.
        expect(onError).not.toHaveBeenCalled()
    })

    it('supabase not configured', async () => {
        const { onError } = noWrites()
        const out = await syncBodyWeight({
            client: fakeClient(), configured: false, isOnline: () => true,
            getPending: async () => [row()], onSynced: async () => true, onError,
        })
        expect(out.error).toBe(WEIGHT_SYNC_ERRORS.NOT_CONFIGURED)
        expect(onError).not.toHaveBeenCalled()
    })

    it('signed out', async () => {
        const { onError } = noWrites()
        const out = await syncBodyWeight({
            client: fakeClient({ session: null }), configured: true, isOnline: () => true,
            getPending: async () => [row()], onSynced: async () => true, onError,
        })
        expect(out.error).toBe(WEIGHT_SYNC_ERRORS.NOT_AUTHENTICATED)
        expect(onError).not.toHaveBeenCalled()
    })
})

describe('draining', () => {
    it('marks each successfully sent row synced', async () => {
        const onSynced = vi.fn(async () => true)
        const out = await syncBodyWeight({
            client: fakeClient(), configured: true, isOnline: () => true,
            getPending: async () => [row({ date: '2026-07-28' }), row({ date: '2026-07-30' })],
            onSynced, onError: async () => true,
        })
        expect(out).toMatchObject({ ok: true, synced: 2, failed: 0 })
        expect(onSynced).toHaveBeenCalledTimes(2)
    })

    it('passes updatedAt so a correction made mid-flight is NOT marked synced', async () => {
        const onSynced = vi.fn(async () => true)
        await syncBodyWeight({
            client: fakeClient(), configured: true, isOnline: () => true,
            getPending: async () => [row({ updatedAt: 'T7' })],
            onSynced, onError: async () => true,
        })
        expect(onSynced).toHaveBeenCalledWith(OWNER_A, '2026-07-30', { expectUpdatedAt: 'T7' })
    })

    it('does not count a row the store refused to mark', async () => {
        // markSynced returns false when the row changed mid-flight; that row
        // is still unsent, so it must not be reported as synced.
        const out = await syncBodyWeight({
            client: fakeClient(), configured: true, isOnline: () => true,
            getPending: async () => [row()],
            onSynced: async () => false, onError: async () => true,
        })
        expect(out.synced).toBe(0)
    })

    it('records a per-row error and keeps going', async () => {
        const onError = vi.fn(async () => true)
        const client = fakeClient({ upsertResult: { error: { code: '42501' } } })
        const out = await syncBodyWeight({
            client, configured: true, isOnline: () => true,
            getPending: async () => [row({ date: '2026-07-28' }), row({ date: '2026-07-30' })],
            onSynced: async () => true, onError,
        })
        expect(out).toMatchObject({ ok: false, synced: 0, failed: 2 })
        expect(onError).toHaveBeenCalledTimes(2)
        expect(onError.mock.calls[0][2]).toBe(WEIGHT_SYNC_ERRORS.REJECTED)
    })

    it('classifies a thrown client call as NETWORK', async () => {
        const client = fakeClient()
        client.from = () => ({ upsert: async () => { throw new TypeError('Failed to fetch') } })
        expect(await pushWeightRow(row(), OWNER_A, client))
            .toEqual({ ok: false, error: WEIGHT_SYNC_ERRORS.NETWORK })
    })

    it('is a no-op with nothing pending', async () => {
        const out = await syncBodyWeight({
            client: fakeClient(), configured: true, isOnline: () => true,
            getPending: async () => [], onSynced: async () => true, onError: async () => true,
        })
        expect(out).toMatchObject({ ok: true, synced: 0, failed: 0 })
    })

    it('releases the in-flight guard even when a row throws', async () => {
        const boom = { configured: true, isOnline: () => true, client: fakeClient(),
            getPending: async () => { throw new Error('db gone') },
            onSynced: async () => true, onError: async () => true }
        await expect(syncBodyWeight(boom)).rejects.toThrow('db gone')

        // A stuck guard would silently disable sync for the rest of the
        // session — the failure mode nobody notices until data is missing.
        const out = await syncBodyWeight({
            client: fakeClient(), configured: true, isOnline: () => true,
            getPending: async () => [], onSynced: async () => true, onError: async () => true,
        })
        expect(out.ok).toBe(true)
    })
})
