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
            // so magic-link login is a one-time action per device (plan §5).
            persistSession: true,
            autoRefreshToken: true,
            // Pick up the tokens Supabase appends to the URL after the magic-link
            // redirect lands back on the app, then clean them out of the URL.
            detectSessionInUrl: true,
        },
    })
    : null
