/**
 * auth/AuthProvider.jsx — app-wide auth state built on Supabase magic-link.
 *
 * Exposes { session, user, loading, signInWithMagicLink, signOut } via context.
 * `loading` is true only until the initial getSession() resolves, so the gate
 * can avoid flashing the sign-in screen for an already-logged-in device.
 *
 * If Supabase isn't configured (no env), we resolve to a signed-out,
 * not-loading state and short-circuit sign-in with a clear error — the local
 * app still works, it just has no cloud auth.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../sync/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setLoading(false)
            return
        }

        let active = true

        // Initial read (also resolves the magic-link redirect via detectSessionInUrl).
        supabase.auth.getSession().then(({ data }) => {
            if (!active) return
            setSession(data.session)
            setLoading(false)
        })

        // Keep in sync with sign-in / sign-out / token refresh across tabs.
        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession)
        })

        return () => {
            active = false
            sub.subscription.unsubscribe()
        }
    }, [])

    const signInWithMagicLink = useCallback(async (email) => {
        if (!isSupabaseConfigured) {
            return { error: new Error('Supabase is not configured for this build.') }
        }
        // emailRedirectTo uses the live origin so the same code works on the
        // preview URL and locally — each origin must be registered as an
        // allowed redirect in Supabase Auth settings.
        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: window.location.origin },
        })
        return { error }
    }, [])

    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured) return
        await supabase.auth.signOut()
    }, [])

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                loading,
                signInWithMagicLink,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
