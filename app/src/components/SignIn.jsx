/**
 * components/SignIn.jsx — the only screen a signed-out user sees (plan §5).
 *
 * Minimal magic-link flow: email field → "Send link" → confirmation. No
 * passwords, no signup (public signup is disabled in Supabase Auth; accounts
 * are invite-only). Styled with the app's tactical-amber CSS vars.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignIn() {
    const { signInWithMagicLink, signInWithPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('idle') // idle | sending | sent | error
    const [error, setError] = useState('')
    const [devError, setDevError] = useState('')

    const canSubmit = EMAIL_RE.test(email.trim()) && status !== 'sending'

    // ── Dev-only password bypass (localhost + agent browser testing) ──
    // Skips the magic-link email entirely by signing in a dedicated password
    // user whose creds live in gitignored app/.env.local (VITE_DEV_EMAIL /
    // VITE_DEV_PASSWORD). The whole block is guarded by import.meta.env.DEV, so
    // `vite build` (DEV=false) strips it from the production bundle — and the
    // VITE_DEV_* vars aren't set in the Cloudflare build env either. Prod is
    // untouched: real users still get magic-link only.
    async function handleDevLogin() {
        const devEmail = import.meta.env.VITE_DEV_EMAIL
        const devPassword = import.meta.env.VITE_DEV_PASSWORD
        if (!devEmail || !devPassword) {
            setDevError('Set VITE_DEV_EMAIL / VITE_DEV_PASSWORD in app/.env.local')
            return
        }
        setDevError('')
        const { error: err } = await signInWithPassword(devEmail, devPassword)
        if (err) setDevError(err.message || 'Dev sign-in failed')
    }

    // Optional zero-click auto-login for agents: set VITE_DEV_AUTOLOGIN=true.
    useEffect(() => {
        if (!import.meta.env.DEV) return
        if (import.meta.env.VITE_DEV_AUTOLOGIN !== 'true') return
        handleDevLogin()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        if (!canSubmit) return
        setStatus('sending')
        setError('')
        const { error: err } = await signInWithMagicLink(email)
        if (err) {
            setError(err.message || 'Could not send the link. Try again.')
            setStatus('error')
        } else {
            setStatus('sent')
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                paddingTop: 'calc(2rem + var(--safe-top))',
                paddingBottom: 'calc(2rem + var(--safe-bottom))',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
            }}
        >
            <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚔️</div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>
                    Fighter&apos;s OS
                </h1>
                <p style={{ color: 'var(--dim)', margin: '0 0 2rem', fontSize: '0.9rem' }}>
                    Sign in with a magic link
                </p>

                {status === 'sent' ? (
                    <div
                        role="status"
                        style={{
                            background: 'var(--panel)',
                            border: '1px solid var(--divider)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1.25rem',
                            lineHeight: 1.5,
                        }}
                    >
                        <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>📧</div>
                        <div style={{ fontWeight: 600 }}>Check your email</div>
                        <div style={{ color: 'var(--dim)', fontSize: '0.85rem', marginTop: 6 }}>
                            A sign-in link is on its way to{' '}
                            <span style={{ color: 'var(--text)' }}>{email.trim()}</span>. Open it on
                            this device to finish.
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatus('idle')}
                            style={{
                                marginTop: '1rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                            }}
                        >
                            Use a different email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="you@email.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                if (status === 'error') setStatus('idle')
                            }}
                            aria-label="Email address"
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '0.85rem 1rem',
                                fontSize: '1rem',
                                color: 'var(--text)',
                                background: 'var(--input)',
                                border: '1px solid var(--divider)',
                                borderRadius: 'var(--radius-md)',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            style={{
                                width: '100%',
                                marginTop: '0.75rem',
                                padding: '0.85rem 1rem',
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: 'var(--bg)',
                                background: canSubmit ? 'var(--primary)' : 'var(--divider)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                                transition: 'background 0.15s',
                            }}
                        >
                            {status === 'sending' ? 'Sending…' : 'Send link'}
                        </button>
                        {status === 'error' && (
                            <p style={{ color: 'var(--alert)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                                {error}
                            </p>
                        )}
                    </form>
                )}

                {import.meta.env.DEV && (
                    <div
                        style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px dashed var(--divider)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '0.65rem',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: 'var(--dim)',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Dev — localhost only
                        </div>
                        <button
                            type="button"
                            onClick={handleDevLogin}
                            style={{
                                width: '100%',
                                padding: '0.7rem 1rem',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: 'var(--accent)',
                                background: 'rgba(232, 160, 32, 0.1)',
                                border: '1px solid var(--accent)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                            }}
                        >
                            ⚡ Dev sign-in (skip magic link)
                        </button>
                        {devError && (
                            <p style={{ color: 'var(--alert)', fontSize: '0.8rem', marginTop: '0.6rem' }}>
                                {devError}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
