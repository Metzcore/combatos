/**
 * cartridgeLogging.test.js — A7b provider-owned cartridge logging boundary
 * (corrective plan finding B, Step 1). Exercises performCartridgeLog — the
 * EXACT function DBProvider's logCartridgeSession (db/index.jsx) wraps —
 * first against injected spies (no Dexie), then end-to-end against the REAL
 * commitLoggedSession/Dexie harness (extending the existing
 * db/workoutDrafts.test.js pattern) to prove the canonical sessionId lands
 * identically in the stored session row and the sync envelope.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from './index.jsx'
import { performCartridgeLog, CartridgeValidationError } from './cartridgeLogging.js'
import { commitLoggedSession, workoutDraftController } from './workoutDrafts.js'
import { buildDraftRow, buildLegacyIdentity, buildLegacyDefinitionSnapshot } from '../utils/workoutDraftState.js'

vi.stubGlobal('navigator', { onLine: true })

const OWNER_A = '11111111-1111-4111-8111-111111111111'

beforeEach(async () => {
    await db.workoutDrafts.clear()
    await db.sessions.clear()
    await db.syncQueue.clear()
})

const VALID_REST_RAW_INPUT = {
    date: '2026-07-29', completedAt: '2026-07-29T09:00:00.000Z',
    sessionCategory: 'rest',
    cartridgeId: 'combatos-operator-2026', cartridgeVersion: '1.0.1', cartridgeSchemaVersion: 3,
    dayTemplateKey: 'day:2', dayTemplateLabel: 'Day 2 — Rest', dayType: 'rest', phaseId: null,
    blocks: [],
}

const INVALID_RAW_INPUT = { dayType: 'training', blocks: [] } // missing nearly every required field

describe('performCartridgeLog — against injected spies (no Dexie)', () => {
    it('validation failure throws CartridgeValidationError carrying the messages, and never calls commit or invalidateDraft', async () => {
        const commit = vi.fn()
        const invalidateDraft = vi.fn()

        const err = await performCartridgeLog({
            rawInput: INVALID_RAW_INPUT, ownerUserId: OWNER_A, invalidateDraft, commit,
        }).catch((e) => e)

        expect(err).toBeInstanceOf(CartridgeValidationError)
        expect(err.errors.length).toBeGreaterThan(0)
        expect(commit).not.toHaveBeenCalled()
        expect(invalidateDraft).not.toHaveBeenCalled()
    })

    it('a successful log invalidates the draft controller BEFORE committing, using the exact generated sessionId in the payload', async () => {
        const order = []
        const commit = vi.fn(async () => { order.push('commit'); return 'fake-id' })
        const invalidateDraft = vi.fn(() => order.push('invalidate'))

        const result = await performCartridgeLog({
            rawInput: VALID_REST_RAW_INPUT, ownerUserId: OWNER_A, invalidateDraft, commit,
            generateSessionId: () => 'fixed-session-id',
        })

        expect(order).toEqual(['invalidate', 'commit'])
        expect(result.sessionId).toBe('fixed-session-id')
        expect(result.payload.sessionId).toBe('fixed-session-id')
        expect(result.id).toBe('fake-id')
        expect(commit).toHaveBeenCalledWith({
            sessionData: result.payload, sessionId: 'fixed-session-id', ownerUserId: OWNER_A,
        })
    })

    it('a commit (transaction) failure propagates, leaving invalidateDraft already called but resetActiveWorkout unreachable by the caller', async () => {
        const invalidateDraft = vi.fn()
        const commit = vi.fn().mockRejectedValue(new Error('transaction failed'))

        await expect(performCartridgeLog({
            rawInput: VALID_REST_RAW_INPUT, ownerUserId: OWNER_A, invalidateDraft, commit,
        })).rejects.toThrow('transaction failed')

        expect(invalidateDraft).toHaveBeenCalledTimes(1) // ran before the failed commit, per the documented ordering
    })
})

describe('performCartridgeLog — end-to-end against the REAL commitLoggedSession/Dexie', () => {
    it('the canonical sessionId lands identically in the stored session row AND the sync envelope, and clears the owner draft', async () => {
        const row = buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            definitionSnapshot: buildLegacyDefinitionSnapshot({}),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'about to be logged via logCartridgeSession' } },
        })
        await db.workoutDrafts.put(row)

        const { id, sessionId, payload } = await performCartridgeLog({
            rawInput: VALID_REST_RAW_INPUT, ownerUserId: OWNER_A,
            invalidateDraft: () => workoutDraftController.invalidate(),
            commit: commitLoggedSession,
        })

        const stored = await db.sessions.get(id)
        expect(stored.sessionId).toBe(sessionId)
        expect(stored).toEqual({ id, ...payload })

        const queue = await db.syncQueue.toArray()
        expect(queue).toHaveLength(1)
        expect(queue[0].payload).toEqual({ action: 'log', sessionId, payload: stored })

        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toBeUndefined()
    })

    it('validation failure never opens a transaction — no session/queue row, draft (if any) untouched', async () => {
        const row = buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            definitionSnapshot: buildLegacyDefinitionSnapshot({}),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'must survive an invalid log attempt' } },
        })
        await db.workoutDrafts.put(row)

        await expect(performCartridgeLog({
            rawInput: INVALID_RAW_INPUT, ownerUserId: OWNER_A,
            invalidateDraft: () => workoutDraftController.invalidate(),
            commit: commitLoggedSession,
        })).rejects.toBeInstanceOf(CartridgeValidationError)

        expect(await db.sessions.count()).toBe(0)
        expect(await db.syncQueue.count()).toBe(0)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toEqual(row) // untouched — validation never reached invalidate/commit
    })

    it('a transaction failure leaves the draft intact and writes no partial session/queue row', async () => {
        const row = buildDraftRow({
            ownerUserId: OWNER_A,
            workoutIdentity: buildLegacyIdentity({ day: 1, phase: 1, hipScore: 3 }),
            definitionSnapshot: buildLegacyDefinitionSnapshot({}),
            state: { kind: 'legacy-hud-v1', fields: { notes: 'must survive a failed transaction' } },
        })
        await db.workoutDrafts.put(row)
        // Force a real Dexie failure inside the transaction (duplicate explicit primary key).
        await db.sessions.add({ id: 777, date: '2026-01-01' })

        await expect(performCartridgeLog({
            rawInput: { ...VALID_REST_RAW_INPUT, sessionId: undefined },
            ownerUserId: OWNER_A,
            invalidateDraft: () => workoutDraftController.invalidate(),
            commit: async ({ sessionData, sessionId, ownerUserId: owner }) =>
                commitLoggedSession({ sessionData: { ...sessionData, id: 777 }, sessionId, ownerUserId: owner }),
        })).rejects.toThrow()

        expect(await db.sessions.count()).toBe(1) // only the pre-seeded row
        expect(await db.syncQueue.count()).toBe(0)
        expect(await db.workoutDrafts.get([OWNER_A, 'active'])).toEqual(row)
    })
})
