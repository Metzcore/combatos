/**
 * ProfileScreen.jsx — More › Profile (W29).
 *
 * NEW SURFACE. `signOut` has been on the auth context since A6.5
 * (auth/AuthProvider.jsx:148) but had no caller anywhere in the app — the same
 * class of gap W25 closed for `exportNotes()`. That is why "on-device sign-out
 * testing" kept carrying forward as a deferred item: there was no control to
 * test. This screen provides it.
 *
 * Sign-out is genuinely destructive on this device: AuthProvider discards the
 * active workout draft for the signed-out owner and clears the cartridge
 * access cache, so an offline device loses its programme access until it can
 * reach the network again. It is confirmed, not one-tap.
 *
 * Weight check-ins will live here too, in a later change.
 */
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import WeightCheckIn from './WeightCheckIn.jsx'

export default function ProfileScreen() {
    const { user, authMode, signOut } = useAuth()
    const [busy, setBusy] = useState(false)

    const handleSignOut = async () => {
        const confirmed = confirm(
            'Sign out on this device?\n\n' +
            'Any unfinished workout draft is discarded and your programme access ' +
            'is cleared until you sign in again with a connection.'
        )
        if (!confirmed) return

        setBusy(true)
        try {
            const result = await signOut()
            // signOut() resolves with Supabase's { error } shape when it ran;
            // a network failure still clears local trust, so report rather
            // than pretend it fully succeeded.
            if (result?.error) {
                alert(`Signed out on this device, but the server could not be reached: ${result.error.message}`)
            }
        } catch (err) {
            console.error('sign-out failed', err)
            alert('Sign-out failed. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    const modeLabel = authMode === 'online'
        ? 'Signed in'
        : authMode === 'offline'
            ? 'Signed in (offline — using this device\'s saved access)'
            : 'Signed out'

    return (
        <>
        <div className="card">
            <div className="section-header blue">👤 Account</div>
            <div style={{ padding: 14 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4 }}>
                    {modeLabel}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: 16, wordBreak: 'break-all' }}>
                    {user?.email || '—'}
                </div>

                <button
                    className="btn-secondary"
                    onClick={handleSignOut}
                    disabled={busy || authMode === 'signed-out'}
                    style={{ color: 'var(--alert)', borderColor: 'rgba(255,50,50,0.3)', background: 'rgba(255,0,0,0.05)', width: '100%' }}
                >
                    {busy ? 'Signing out…' : 'Sign Out'}
                </button>
            </div>
        </div>

        <WeightCheckIn />
        </>
    )
}
