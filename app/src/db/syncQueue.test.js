/**
 * syncQueue.test.js
 *
 * Tests the Dexie-backed sync queue mechanics in app/src/sync/syncQueue.js
 * (re-exported through db/index.jsx). The queue drains to Supabase (M2), so
 * the Supabase client module is mocked — these tests never hit the network.
 *
 * Covered: enqueue envelope shape, the log-insert success/failure/idempotent
 * paths, the delete path, the attempts / MAX_ATTEMPTS guard, and the
 * signed-out short-circuit. db/index.jsx exports `db` and `trySyncQueue`
 * directly; logSession / deleteLastSession are closures private to the
 * provider and out of scope for this minimal harness.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// trySyncQueue bails immediately unless navigator.onLine is true. Node only
// gained a `navigator` global in v21 (and it has no `onLine` even then), so
// stub the whole global via vitest — works on any Node version, and no
// production code is touched.
vi.stubGlobal('navigator', { onLine: true })

// Mock the Supabase client the drain talks to. Both this test file and
// sync/syncQueue.js resolve to the same sync/supabaseClient.js module, so the
// mock applies to the code under test.
const mockInsert = vi.fn()
const mockDeleteEq = vi.fn()
const mockGetSession = vi.fn()
vi.mock('../sync/supabaseClient.js', () => ({
    isSupabaseConfigured: true,
    supabase: {
        auth: { getSession: (...a) => mockGetSession(...a) },
        from: () => ({
            insert: (...a) => mockInsert(...a),
            delete: () => ({ eq: (...a) => mockDeleteEq(...a) }),
        }),
    },
}))

import { db, trySyncQueue } from './index.jsx'

beforeEach(async () => {
    await db.sessions.clear()
    await db.syncQueue.clear()
    await db.settings.clear()
    mockInsert.mockReset()
    mockDeleteEq.mockReset()
    mockGetSession.mockReset()
    // Default: signed in. Individual tests override for the signed-out case.
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
})

describe('sync queue — enqueue envelope shapes', () => {
    it('enqueues a log envelope shaped { action, sessionId, payload }', async () => {
        const sessionId = 'session-abc-123'
        const payload = { sessionId, day: 1, phase: 1 }
        const envelope = { action: 'log', sessionId, payload }

        const localId = await db.sessions.add(payload)
        await db.syncQueue.add({ sessionId: localId, attempts: 0, payload: envelope })

        const queued = await db.syncQueue.toArray()
        expect(queued).toHaveLength(1)
        expect(queued[0].payload).toEqual(envelope)
        expect(queued[0].attempts).toBe(0)
    })

    it('enqueues a delete envelope shaped { action, sessionId }', async () => {
        const sessionId = 'session-to-delete-456'
        const localId = await db.sessions.add({ sessionId, day: 3, phase: 1 })
        await db.sessions.delete(localId)

        const envelope = { action: 'delete', sessionId }
        await db.syncQueue.add({ sessionId: localId, attempts: 0, payload: envelope })

        const queued = await db.syncQueue.toArray()
        expect(queued).toHaveLength(1)
        expect(queued[0].payload).toEqual({ action: 'delete', sessionId })
    })
})

describe('trySyncQueue — Supabase drain', () => {
    it('inserts a log row (stamped with user_id + client_session_id) and drops it from the queue on success', async () => {
        const envelope = { action: 'log', sessionId: 'y', payload: { foo: 'baz' } }
        const itemId = await db.syncQueue.add({ sessionId: 2, attempts: 0, payload: envelope })
        mockInsert.mockResolvedValue({ error: null })

        await trySyncQueue()

        expect(mockInsert).toHaveBeenCalledTimes(1)
        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-1',
            client_session_id: 'y',
            cartridge_id: null,
            payload: { foo: 'baz' },
        })
        const item = await db.syncQueue.get(itemId)
        expect(item).toBeUndefined()
    })

    it('increments attempts when the insert returns an error', async () => {
        const envelope = { action: 'log', sessionId: 'x', payload: { foo: 'bar' } }
        const itemId = await db.syncQueue.add({ sessionId: 1, attempts: 0, payload: envelope })
        mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })

        await trySyncQueue()

        const item = await db.syncQueue.get(itemId)
        expect(item).toBeDefined()
        expect(item.attempts).toBe(1)
    })

    it('treats a unique-violation (23505) as success — idempotent retry', async () => {
        const envelope = { action: 'log', sessionId: 'dup', payload: {} }
        const itemId = await db.syncQueue.add({ sessionId: 4, attempts: 0, payload: envelope })
        mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

        await trySyncQueue()

        const item = await db.syncQueue.get(itemId)
        expect(item).toBeUndefined()
    })

    it('routes a delete envelope to supabase.delete().eq(client_session_id) and drops it on success', async () => {
        const envelope = { action: 'delete', sessionId: 'gone' }
        const itemId = await db.syncQueue.add({ sessionId: 5, attempts: 0, payload: envelope })
        mockDeleteEq.mockResolvedValue({ error: null })

        await trySyncQueue()

        expect(mockInsert).not.toHaveBeenCalled()
        expect(mockDeleteEq).toHaveBeenCalledWith('client_session_id', 'gone')
        const item = await db.syncQueue.get(itemId)
        expect(item).toBeUndefined()
    })

    it('skips items with attempts >= MAX_ATTEMPTS (5) instead of retrying them', async () => {
        const envelope = { action: 'log', sessionId: 'z', payload: { foo: 'qux' } }
        const itemId = await db.syncQueue.add({ sessionId: 3, attempts: 5, payload: envelope })
        mockInsert.mockResolvedValue({ error: { message: 'should not be called' } })

        await trySyncQueue()

        expect(mockInsert).not.toHaveBeenCalled()
        const item = await db.syncQueue.get(itemId)
        expect(item.attempts).toBe(5)
    })

    it('processes a mix of queue items, skipping only the exhausted one', async () => {
        const okEnvelope = { action: 'log', sessionId: 'ok', payload: {} }
        const exhaustedEnvelope = { action: 'log', sessionId: 'exhausted', payload: {} }
        const okId = await db.syncQueue.add({ sessionId: 10, attempts: 0, payload: okEnvelope })
        const exhaustedId = await db.syncQueue.add({ sessionId: 11, attempts: 5, payload: exhaustedEnvelope })
        mockInsert.mockResolvedValue({ error: { message: 'down' } })

        await trySyncQueue()

        expect(mockInsert).toHaveBeenCalledTimes(1) // only the non-exhausted item
        const okItem = await db.syncQueue.get(okId)
        const exhaustedItem = await db.syncQueue.get(exhaustedId)
        expect(okItem.attempts).toBe(1)
        expect(exhaustedItem.attempts).toBe(5)
    })

    it('does not drain at all when there is no auth session', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } })
        const envelope = { action: 'log', sessionId: 'nope', payload: {} }
        const itemId = await db.syncQueue.add({ sessionId: 6, attempts: 0, payload: envelope })

        await trySyncQueue()

        expect(mockInsert).not.toHaveBeenCalled()
        const item = await db.syncQueue.get(itemId)
        expect(item).toBeDefined()
        expect(item.attempts).toBe(0) // untouched — not a failed attempt
    })
})
