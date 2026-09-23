/**
 * components/SignIn.jsx — the only screen a signed-out user sees (plan §5).
 *
 * Email + password (W31). Magic link was the original and only path, but
 * Supabase's built-in email sender is rate-limited and sends from a shared,
 * spam-prone domain — it blocked a real client twice. `signInWithMagicLink`
 * is still on the auth context and is deliberately unused here: showing a
 * known-unreliable option reproduces the exact failure this screen exists to
 * fix (D16). It returns once W33's custom SMTP makes email trustworthy.
 *
 * No signup: public signup is off at the Supabase project, and
 * `signInWithPassword` has no create path at all, so this screen cannot mint
 * an account even by accident. Accounts stay invite-only with passwords
 * issued out of band (docs/OPERATIONS.md).
 *
 * Styled with the app's tactical-amber CSS vars. Note this file uses inline
 * styles throughout rather than the `.btn-*` classes every other screen uses;
 * that predates W31 and is left alone rather than half-migrated.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { describeSignInError } from '../auth/authErrors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Both auth fields share this. Two properties here are load-bearing rather
// than cosmetic:
//
// `fontFamily` — index.css styles `input[type="text"]` globally (Courier, a
// tighter radius) but NOT `input[type="password"]`. Without an explicit
// inherit, tapping "Show" re-fonts the field and shifts its height by ~1px.
//
// `fontSize` in px, not the app's usual 1rem — the root size is 14px, and
// iOS Safari auto-zooms the viewport whenever a focused input computes under
// 16px. On the one screen that gates the whole app, that zoom is worse than
// being 2px off the app's type scale.
const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.85rem 1rem',
    fontSize: '16px',
    fontFamily: 'inherit',
    color: 'var(--text)',
    background: 'var(--input)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
}

export default function SignIn() {
    const { signInWithPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState('idle') // idle | signing | error
    const [error, setError] = useState('')
    const [revealed, setRevealed] = useState(false)
    const [devError, setDevError] = useState('')

    const canSubmit = EMAIL_RE.test(email.trim()) && password.length > 0 && status !== 'signing'

    // ── Dev-only password bypass (localhost + agent browser testing) ──
    // Kept deliberately at W31: it is how a coding agent drives the app in a
    // browser without a human typing credentials. The creds live in gitignored
    // app/.env.local (VITE_DEV_EMAIL / VITE_DEV_PASSWORD). The whole block is
    // guarded by import.meta.env.DEV, so `vite build` (DEV=false) strips it
    // from the production bundle — and the VITE_DEV_* vars aren't set in the
    // Cloudflare build env either.
    async function handleDevLogin() {
        const devEmail = import.meta.env.VITE_DEV_EMAIL
        const devPassword = import.meta.env.VITE_DEV_PASSWORD
        if (!devEmail || !devPassword) {
            setDevError('Set VITE_DEV_EMAIL / VITE_DEV_PASSWORD in app/.env.local')
            return
        }
        setDevError('')
        const { error: err } = await signInWithPassword(devEmail, devPassword)
        if (err) setDevError(describeSignInError(err).message)
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
        setStatus('signing')
        setError('')
        const { error: err } = await signInWithPassword(email, password)
        if (err) {
            setError(describeSignInError(err).message)
            setStatus('error')
            return
        }
        // On success AuthProvider's onAuthStateChange fires and AuthGate swaps
        // this screen out. Returning to idle rather than holding 'signing', so
        // a session that somehow never propagates leaves a usable button
        // instead of a permanent spinner.
        setStatus('idle')
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
                overflowY: 'auto',
            }}
        >
            <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚔️</div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>
                    Fighter&apos;s OS
                </h1>
                <p style={{ color: 'var(--dim)', margin: '0 0 2rem', fontSize: '0.9rem' }}>
                    Sign in to your account
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        id="email"
                        name="email"
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
                        style={fieldStyle}
                    />

                    <div style={{ position: 'relative', marginTop: '0.75rem' }}>
                        <input
                            type={revealed ? 'text' : 'password'}
                            id="password"
                            name="password"
                            autoComplete="current-password"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="go"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                if (status === 'error') setStatus('idle')
                            }}
                            aria-label="Password"
                            // Room for the reveal control, which sits inside the field.
                            style={{ ...fieldStyle, paddingRight: '4.25rem' }}
                        />
                        <button
                            type="button"
                            onClick={() => setRevealed((v) => !v)}
                            aria-label={revealed ? 'Hide password' : 'Show password'}
                            aria-pressed={revealed}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                height: '100%',
                                // Generous tap area: a 20px target gets missed by
                                // a sweaty thumb (mobile-interaction-ux).
                                minWidth: '4rem',
                                padding: '0 0.75rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--dim)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                            }}
                        >
                            {revealed ? 'Hide' : 'Show'}
                        </button>
                    </div>

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
                        {status === 'signing' ? 'Signing in…' : 'Sign in'}
                    </button>

                    {status === 'error' && (
                        <p
                            role="alert"
                            style={{ color: 'var(--alert)', fontSize: '0.85rem', marginTop: '0.75rem' }}
                        >
                            {error}
                        </p>
                    )}
                </form>

                <p style={{ color: 'var(--dim)', fontSize: '0.8rem', marginTop: '1.5rem', lineHeight: 1.5 }}>
                    Forgotten your password? Contact your coach to have it reset.
                </p>

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
                            ⚡ Dev sign-in (use .env.local creds)
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
