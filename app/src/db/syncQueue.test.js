/**
 * syncQueue.test.js
 *
 * Tests the Dexie-backed sync queue mechanics in app/src/db/index.jsx at
 * the granularity that's practical without restructuring production code
 * (that restructuring is a later item — see W8 in docs/planning/roadmap).
 *
 * db/index.jsx exports `db` (the Dexie instance) and `trySyncQueue`
 * directly, so the queue mechanics — envelope shape on enqueue, attempts
 * incrementing on a failed push, and the skip-after-MAX_ATTEMPTS guard —
 * are tested by driving those exports and the Dexie tables directly,
 * rather than through the DBProvider React context (logSession /
 * deleteLastSession are closures private to that provider and are not
 * exported; testing them would require rendering the provider, which is
 * out of scope for this minimal harness).
 *
 * global.fetch is always mocked — these tests never hit the real webhook.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db, trySyncQueue } from './index.jsx'

// trySyncQueue bails immediately unless navigator.onLine is true. Node only
// gained a `navigator` global in v21 (and it has no `onLine` even then), so
// stub the whole global via vitest — works on any Node version, and no
// production code is touched.
vi.stubGlobal('navigator', { onLine: true })

beforeEach(async () => {
    await db.sessions.clear()
    await db.syncQueue.clear()
    await db.settings.clear()
    // trySyncQueue reads webhookUrl from settings, falling back to the
    // DEFAULTS baked into db/index.jsx when unset — that default is a real
    // URL, so tests must never let a real fetch reach it. global.fetch is
    // mocked below regardless, but set the setting explicitly for clarity
    // and to avoid ever depending on the module's default value.
    await db.settings.put({ key: 'webhookUrl', value: 'https://example.invalid/mock-webhook' })
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

describe('trySyncQueue — attempts and MAX_ATTEMPTS behavior', () => {
    it('increments attempts when the mocked fetch rejects', async () => {
        const envelope = { action: 'log', sessionId: 'x', payload: { foo: 'bar' } }
        const itemId = await db.syncQueue.add({ sessionId: 1, attempts: 0, payload: envelope })

        global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

        await trySyncQueue()

        const item = await db.syncQueue.get(itemId)
        expect(item).toBeDefined()
        expect(item.attempts).toBe(1)
        expect(global.fetch).toHaveBeenCalledTimes(1)
        // Never hit the real webhook URL.
        expect(global.fetch.mock.calls[0][0]).toBe('https://example.invalid/mock-webhook')
    })

    it('removes the item from the queue once fetch succeeds (opaque no-cors response)', async () => {
        const envelope = { action: 'log', sessionId: 'y', payload: { foo: 'baz' } }
        const itemId = await db.syncQueue.add({ sessionId: 2, attempts: 0, payload: envelope })

        global.fetch = vi.fn().mockResolvedValue({ type: 'opaque', ok: false, status: 0 })

        await trySyncQueue()

        const item = await db.syncQueue.get(itemId)
        expect(item).toBeUndefined()
    })

    it('skips items with attempts >= MAX_ATTEMPTS (5) instead of retrying them', async () => {
        const envelope = { action: 'log', sessionId: 'z', payload: { foo: 'qux' } }
        const itemId = await db.syncQueue.add({ sessionId: 3, attempts: 5, payload: envelope })

        global.fetch = vi.fn().mockResolvedValue({ type: 'opaque', ok: false, status: 0 })

        await trySyncQueue()

        // Not touched: fetch never called for this item, attempts unchanged.
        expect(global.fetch).not.toHaveBeenCalled()
        const item = await db.syncQueue.get(itemId)
        expect(item.attempts).toBe(5)
    })

    it('processes a mix of queue items, skipping only the exhausted one', async () => {
        const okEnvelope = { action: 'log', sessionId: 'ok', payload: {} }
        const exhaustedEnvelope = { action: 'log', sessionId: 'exhausted', payload: {} }

        const okId = await db.syncQueue.add({ sessionId: 10, attempts: 0, payload: okEnvelope })
        const exhaustedId = await db.syncQueue.add({ sessionId: 11, attempts: 5, payload: exhaustedEnvelope })

        global.fetch = vi.fn().mockRejectedValue(new Error('down'))

        await trySyncQueue()

        expect(global.fetch).toHaveBeenCalledTimes(1) // only the non-exhausted item

        const okItem = await db.syncQueue.get(okId)
        const exhaustedItem = await db.syncQueue.get(exhaustedId)
        expect(okItem.attempts).toBe(1)
        expect(exhaustedItem.attempts).toBe(5)
    })
})
