import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { canResumeFromCartridgeCache } from './offlineAccess.js'

const cached = { userId: '11111111-1111-4111-8111-111111111111' }

describe('controlled offline-device auth fallback', () => {
    it('allows a prior server-confirmed device only for retryable connectivity failure', () => {
        const error = new AuthRetryableFetchError('Failed to fetch', 0)
        expect(canResumeFromCartridgeCache(error, cached)).toBe(true)
    })

    it('does not reinterpret a normal signed-out or revoked response as offline access', () => {
        expect(canResumeFromCartridgeCache(null, cached)).toBe(false)
        expect(canResumeFromCartridgeCache(new Error('Invalid refresh token'), cached)).toBe(false)
    })

    it('does not allow offline entry without a validated cached identity', () => {
        const error = new AuthRetryableFetchError('Failed to fetch', 0)
        expect(canResumeFromCartridgeCache(error, null)).toBe(false)
        expect(canResumeFromCartridgeCache(error, {})).toBe(false)
    })
})
