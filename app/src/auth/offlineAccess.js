import { isAuthRetryableFetchError } from '@supabase/supabase-js'

/**
 * Offline app entry is allowed only when Supabase failed for a retryable
 * network reason and this device already has a validated server snapshot.
 * A normal signed-out response, revoked session, or corrupt cache must fail
 * closed to the sign-in screen.
 */
export function canResumeFromCartridgeCache(error, snapshot) {
    return Boolean(snapshot?.userId && isAuthRetryableFetchError(error))
}
