/**
 * auth/AuthProvider.jsx — app-wide auth state built on Supabase Auth.
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
import { supabase, isSupabaseConfigured, landedOnRecoveryLink } from '../sync/supabaseClient.js'
import { clearCartridgeAccessCache, readCartridgeAccessCache } from '../db/cartridgeAccess.js'
import { canResumeFromCartridgeCache } from './offlineAccess.js'
import { CARTRIDGE_ACCESS_RESET_EVENT } from '../cartridges/accessModel.js'
import { workoutDraftController } from '../db/workoutDrafts.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [offlineUserId, setOfflineUserId] = useState(null)
    const [loading, setLoading] = useState(true)
    // W33 — true from the moment a recovery link is consumed until the new
    // password is saved or the user backs out. Supabase's recovery link
    // produces a REAL session, so without this the user would land on the HUD
    // having never set a password, and the link they clicked would behave as a
    // plain magic link. AuthGate uses it to show the set-password screen
    // instead of the app.
    //
    // Seeded from the URL rather than from the PASSWORD_RECOVERY event alone.
    // GoTrue initialises inside its own constructor at import time and emits
    // that event from a setTimeout(…, 0) — all before React mounts, so the
    // subscriber registered below does not exist yet and never sees it. Only
    // the URL flag survives that race; the event handler stays as well,
    // because it is the right trigger whenever a subscriber does exist.
    const [recoveryMode, setRecoveryMode] = useState(landedOnRecoveryLink)

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
            // W33 fix — never fall back to the offline cartridge cache on a
            // recovery-link load. If the link failed (expired, already used,
            // tokens rejected), the offline path would hand this device a
            // `user` from cache, AuthGate would render the app, and the person
            // who just clicked "reset my password" would be dropped into a
            // working-looking app having never set one — the failure silently
            // disguised as success. Suppressing it here means a failed link
            // falls through to SignIn, which is the honest outcome.
            if (error && !landedOnRecoveryLink) {
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
            // Fired when detectSessionInUrl consumes a `type=recovery` link.
            // Must be handled before anything renders the app, or the user is
            // silently signed in without ever choosing a password.
            if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
            if (event === 'SIGNED_OUT') {
                setRecoveryMode(false)
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

    // Password sign-in — the production path since W31. It replaced magic link
    // in the UI because Supabase's built-in email sender is rate-limited and
    // sends from a shared, spam-prone domain, which locked a real client out
    // twice.
    //
    // This is also invite-only, and more strictly than the OTP path above:
    // signInWithPassword has no create-user parameter because the endpoint
    // cannot create one. Only /auth/v1/signup mints an account, and nothing in
    // this app calls it — backed up by "Allow new users to sign up" being off
    // at the project. Passwords are issued out of band (docs/OPERATIONS.md).
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

    // W33 — self-service password recovery. Supabase deliberately returns
    // success whether or not the address has an account, so this call cannot
    // be used to discover who exists; the UI must keep that property by never
    // confirming the address either way.
    //
    // It also cannot create an account: /auth/v1/recover only ever sends to an
    // existing user, so invite-only is unaffected.
    const requestPasswordReset = useCallback(async (email) => {
        if (!isSupabaseConfigured) {
            return { error: new Error('Supabase is not configured for this build.') }
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            // Same live-origin reasoning as the magic-link redirect: each
            // origin must be registered in Supabase Auth → URL Configuration
            // → Redirect URLs. Add entries additively; never touch Site URL,
            // which is shared with the onboarding site.
            redirectTo: window.location.origin,
        })
        return { error }
    }, [])

    // Completes the recovery started above. No `current_password` here by
    // design — the emailed link is the proof of identity, which is the whole
    // point of a reset, and the user does not know the old password.
    const completePasswordReset = useCallback(async (password) => {
        if (!isSupabaseConfigured) {
            return { error: new Error('Supabase is not configured for this build.') }
        }
        const { error } = await supabase.auth.updateUser({ password })
        if (!error) setRecoveryMode(false)
        return { error }
    }, [])

    // Leaves recovery without setting a password. The session stays valid
    // (Supabase's recovery link really does sign the user in), so this drops
    // them into the app rather than pretending to log them out.
    const dismissPasswordRecovery = useCallback(() => setRecoveryMode(false), [])

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
        // scope:'local' is deliberate and must not be dropped. Supabase's
        // default is 'global', which terminates the user's sessions on EVERY
        // device — so signing out on a laptop also killed the phone, where
        // SIGNED_OUT then discards the active workout draft and clears the
        // cartridge access cache. ProfileScreen asks "Sign out on this
        // device?" and warns only about this device's consequences; 'local' is
        // what makes that copy true.
        //
        // Note this is not the whole story for multi-device: a password change
        // DOES revoke every other session, server-side and unconditionally
        // (measured 2026-09-29 — a reset took one account from 8 live sessions
        // to 1). That is Supabase's behaviour on password update, not this
        // call, and it is the correct security outcome for a credential change.
        const result = await supabase.auth.signOut({ scope: 'local' })
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
                recoveryMode,
                signInWithMagicLink,
                signInWithPassword,
                requestPasswordReset,
                completePasswordReset,
                dismissPasswordRecovery,
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
