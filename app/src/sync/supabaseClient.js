/**
 * sync/supabaseClient.js — the single Supabase client for the app.
 *
 * Reads config from Vite env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * The anon/publishable key is PUBLIC-SAFE by design — it's the client key and
 * RLS is what actually protects data (see SUPABASE-MIGRATION-PLAN §8). The
 * service-role key never lives here.
 *
 * If env is missing we export `supabase = null` and log once, rather than
 * throwing at module-eval time — that keeps the local-only app (no env) and
 * the test runner from crashing on import. Callers must null-check.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

/**
 * Did this page load land on a password-recovery link?
 *
 * Read HERE, at module scope, and deliberately BEFORE `createClient` below.
 * The GoTrue client begins initialising inside its own constructor: it parses
 * the URL, saves the session, strips the hash via history.replaceState, and
 * emits `PASSWORD_RECOVERY` from a `setTimeout(…, 0)`. All of that happens at
 * import time — before React has mounted, so `AuthProvider`'s
 * onAuthStateChange subscriber does not exist yet and never receives the
 * event. It only ever sees INITIAL_SESSION, and the user is dropped into the
 * app having never been asked for a password.
 *
 * So the event cannot be the only signal. This flag is the durable one: the
 * raw URL, captured before anything can consume it. AuthProvider seeds
 * `recoveryMode` from it and still listens for the event as well, since the
 * event is the correct trigger whenever the subscriber does happen to exist
 * (a second tab, or a future non-initial recovery).
 *
 * Both the hash (implicit flow, the default) and the query string (PKCE) are
 * checked, so this keeps working if `flowType` is ever changed.
 */
export const landedOnRecoveryLink = (() => {
    if (typeof window === 'undefined') return false
    try {
        const isRecovery = (s) => /(^|[#&?])type=recovery([&#]|$)/.test(s || '')
        return isRecovery(window.location.hash) || isRecovery(window.location.search)
    } catch {
        return false
    }
})()

if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn(
        '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — ' +
        'auth and cloud sync are disabled for this build.'
    )
}

export const supabase = isSupabaseConfigured
    ? createClient(url, key, {
        auth: {
            // Persist the session in localStorage and silently refresh the token,
            // so signing in is a one-time action per device (plan §5).
            persistSession: true,
            autoRefreshToken: true,
            // Pick up the tokens Supabase appends to the URL after the magic-link
            // redirect lands back on the app, then clean them out of the URL.
            detectSessionInUrl: true,
        },
    })
    : null
