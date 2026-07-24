/**
 * auth/AuthProvider.jsx — app-wide auth state built on Supabase magic-link.
 *
 * Exposes authenticated identity plus a tightly-scoped offline device mode.
 * `loading` is true only until the initial getSession() resolves, so the gate
 * can avoid flashing the sign-in screen for an already-logged-in device.
 *
 * If Supabase isn't configured (no env), we resolve to a signed-out,
 * not-loading state and short-circuit sign-in with a clear error — the local
 * app still works, it just has no cloud auth.
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../sync/supabaseClient.js'
import { clearCartridgeAccessCache, readCartridgeAccessCache } from '../db/cartridgeAccess.js'
import { canResumeFromCartridgeCache } from './offlineAccess.js'
import { CARTRIDGE_ACCESS_RESET_EVENT } from '../cartridges/accessModel.js'
import { workoutDraftController } from '../db/workoutDrafts.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [offlineUserId, setOfflineUserId] = useState(null)
    const [loading, setLoading] = useState(true)

    // A6.5 — the onAuthStateChange listener below is registered ONCE (empty
    // effect deps) so its closure over `session`/`offlineUserId` is stale by
    // the time SIGNED_OUT fires. Kept fresh every render so the event
    // handler can resolve "whose draft was this" even though the session
    // it needs to read is the one about to become null.
    const ownerUserIdRef = useRef(null)
    ownerUserIdRef.current = session?.user?.id ?? offlineUserId ?? null

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setLoading(false)
            return
        }

        let active = true

        // Initial read (also resolves the magic-link redirect via detectSessionInUrl).
        async function initialise() {
            let data = null
            let error = null

            try {
                const result = await supabase.auth.getSession()
                data = result.data
                error = result.error
            } catch (caught) {
                error = caught
            }
            if (!active) return

            if (data?.session) {
                setSession(data.session)
                setOfflineUserId(null)
                setLoading(false)
                return
            }

            let cached = null
            if (error) {
                try {
                    cached = await readCartridgeAccessCache()
                } catch {
                    cached = null
                }
            }
            if (!active) return

            setSession(null)
            setOfflineUserId(canResumeFromCartridgeCache(error, cached) ? cached.userId : null)
            setLoading(false)
        }

        initialise()

        // Keep in sync with sign-in / sign-out / token refresh across tabs.
        const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
            setSession(newSession)
            if (newSession) setOfflineUserId(null)
            if (event === 'SIGNED_OUT') {
                setOfflineUserId(null)
                window.dispatchEvent(new Event(CARTRIDGE_ACCESS_RESET_EVENT))
                clearCartridgeAccessCache().catch(console.error)
                // A6.5 — idempotent repeat of the explicit signOut() path
                // below, for cross-tab / revoked-session / indirect sign-out
                // (this event fires even when THIS tab didn't call signOut()
                // itself). discardDraft() can now reject on a real delete
                // failure (interactive callers must see that and preserve
                // context) — but sign-out is the one exemption: it must
                // remain best-effort, so the failure is swallowed here.
                const ownerUserId = ownerUserIdRef.current
                if (ownerUserId) {
                    workoutDraftController.discardDraft(ownerUserId).catch(err => {
                        console.error('workoutDrafts: sign-out delete failed (best-effort)', err)
                    })
                }
            }
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
        // A6.5 — invalidate the draft controller synchronously and attempt
        // to delete this owner's draft BEFORE anything else, so a save
        // already scheduled cannot land after sign-out and resurrect the
        // draft under the just-signed-out identity. discardDraft() can
        // reject on a real delete failure (interactive callers elsewhere
        // must see that and preserve context) — but a failed local delete
        // must never block sign-out itself, so it's caught here and
        // sign-out proceeds regardless; the composite owner key still
        // prevents a later identity from ever hydrating the row.
        const ownerUserId = ownerUserIdRef.current
        if (ownerUserId) {
            try {
                await workoutDraftController.discardDraft(ownerUserId)
            } catch (err) {
                console.error('workoutDrafts: sign-out delete failed (best-effort)', err)
            }
        }
        // Remove local device trust first. Even if the network request fails,
        // this device cannot use the A9c offline fallback after explicit sign-out.
        window.dispatchEvent(new Event(CARTRIDGE_ACCESS_RESET_EVENT))
        await clearCartridgeAccessCache()
        setOfflineUserId(null)
        const result = await supabase.auth.signOut()
        // Close the narrow race where an already-completed access request
        // could have written between the first clear and the auth event.
        await clearCartridgeAccessCache()
        return result
    }, [])

    const user = session?.user ?? (offlineUserId ? { id: offlineUserId } : null)
    const authMode = session ? 'online' : offlineUserId ? 'offline' : 'signed-out'

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                authMode,
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
