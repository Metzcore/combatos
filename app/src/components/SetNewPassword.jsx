/**
 * components/SetNewPassword.jsx — the screen a recovery link lands on (W33).
 *
 * Supabase's recovery link produces a real session, so by the time this
 * renders the user is already authenticated. That is why AuthGate shows this
 * instead of the app: without it, clicking "reset my password" would silently
 * sign someone in and never ask for a password, and the link would behave as
 * a plain magic link.
 *
 * No current-password field. The emailed link is the proof of identity — the
 * user is here precisely because they do not know the old one.
 *
 * Mirrors SignIn.jsx's inline-style idiom deliberately: these two are the
 * app's signed-out surfaces and should look like siblings.
 */

import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { describePasswordUpdateError } from '../auth/authErrors.js'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../auth/passwordPolicy.js'

// Same two load-bearing properties as SignIn's fields: `fontFamily` because
// index.css styles input[type="text"] but not [type="password"], and a 16px
// size because the 14px root triggers iOS Safari zoom-on-focus.
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

export default function SetNewPassword() {
    const { user, completePasswordReset, dismissPasswordRecovery } = useAuth()
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [revealed, setRevealed] = useState(false)
    const [status, setStatus] = useState('idle') // idle | saving | error
    const [error, setError] = useState('')

    const check = validateNewPassword(password, confirmation)
    const canSubmit = check.valid && status !== 'saving'
    // Only nag once there is something to nag about — an empty form should not
    // open with a red error.
    const hint = password.length > 0 && !check.valid ? check.message : ''

    async function handleSubmit(e) {
        e.preventDefault()
        if (!canSubmit) return
        setStatus('saving')
        setError('')
        const { error: err } = await completePasswordReset(password)
        if (err) {
            setError(describePasswordUpdateError(err).message)
            setStatus('error')
            return
        }
        // On success AuthProvider clears recoveryMode and AuthGate swaps this
        // screen for the app. Nothing else to do here.
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
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔑</div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>
                    Choose a new password
                </h1>
                <p style={{ color: 'var(--dim)', margin: '0 0 2rem', fontSize: '0.9rem' }}>
                    {user?.email
                        ? 'Setting a new password for ' + user.email + '.'
                        : 'Set a new password for your account.'}
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={revealed ? 'text' : 'password'}
                            id="new-password"
                            name="new-password"
                            autoComplete="new-password"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder={'New password (' + MIN_PASSWORD_LENGTH + '+ characters)'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                if (status === 'error') setStatus('idle')
                            }}
                            aria-label="New password"
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

                    <input
                        type={revealed ? 'text' : 'password'}
                        id="confirm-password"
                        name="confirm-password"
                        autoComplete="new-password"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Repeat it"
                        value={confirmation}
                        onChange={(e) => {
                            setConfirmation(e.target.value)
                            if (status === 'error') setStatus('idle')
                        }}
                        aria-label="Repeat new password"
                        style={{ ...fieldStyle, marginTop: '0.75rem' }}
                    />

                    {hint && (
                        <p style={{ color: 'var(--dim)', fontSize: '0.8rem', marginTop: '0.6rem' }}>
                            {hint}
                        </p>
                    )}

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
                        {status === 'saving' ? 'Saving…' : 'Save password'}
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

                <button
                    type="button"
                    onClick={dismissPasswordRecovery}
                    style={{
                        marginTop: '1.5rem',
                        padding: '0.6rem 1rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--dim)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                    }}
                >
                    Skip for now
                </button>
                <p style={{ color: 'var(--dim)', fontSize: '0.75rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    Skipping keeps your old password. The link you used has already signed you in.
                </p>
            </div>
        </div>
    )
}
