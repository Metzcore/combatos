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
        // shouldCreateUser:false makes this INVITE-ONLY at the app layer: the
        // sign-in screen never mints an account, so a non-provisioned email
        // gets no link. Accounts are added out-of-band (dashboard / connector),
        // backed up by "Allow new users to sign up" being off at the project.
        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: window.location.origin,
                shouldCreateUser: false,
            },
        })
        return { error }
    }, [])

    // Password sign-in. Only wired up behind an import.meta.env.DEV guard in
    // SignIn (see the dev-bypass block there) so it never reaches production —
    // it exists so localhost + agent browser testing can skip the magic-link
    // email round-trip using a dedicated password user. Harmless in prod: no
    // shipped code path calls it.
    const signInWithPassword = useCallback(async (email, password) => {
        if (!isSupabaseConfigured) {
            return { error: new Error('Supabase is not configured for this build.') }
        }
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
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
                signInWithPassword,
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
