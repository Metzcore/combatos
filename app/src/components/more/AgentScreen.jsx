/**
 * AgentScreen.jsx — More › Agent (W29 PR E).
 *
 * Config + status for the outbound backup-push feature. This screen is
 * READ-MOSTLY: the only writes are the endpoint URL, the token, and the
 * auto-push toggle, plus the one explicit "Send now" action — everything
 * else here (configured/not, last success, last error) is a read-only
 * reflection of settings written by sync/backupPush.js (via
 * hooks/useBackupPushScheduler.js's runAgentPush, shared with this screen's
 * Send-now button so there is exactly one "did this succeed?" code path).
 *
 * EMPTY STATE IS DELIBERATE: with no endpoint configured, the status card
 * shows ONE calm line and a short explanation — no error badge, no warning
 * colour, no nagging. Most users will never open this screen let alone
 * configure it, and it must not look broken to them. The config fields
 * themselves stay visible throughout so the feature is discoverable.
 *
 * The token is a credential: `type="password"`, it is NEVER seeded back into
 * the input from the saved value (the field always starts blank — only a
 * "Token: set/not set" boolean is shown), and it is never logged.
 */
import { useEffect, useState, useCallback } from 'react'
import { useDB, getSetting } from '../../db/index.jsx'
import { isValidEndpoint, PUSH_ERRORS, LAST_PUSH_OK_KEY, LAST_PUSH_ERROR_KEY } from '../../sync/backupPush.js'
import { runAgentPush } from '../../hooks/useBackupPushScheduler.js'
import { localDateStr } from '../../utils/checklistDate.js'
import { daysBetween } from '../../utils/dateMath.js'

// Plain-language mapping for PUSH_ERRORS — never a raw exception string.
const ERROR_MESSAGES = {
    [PUSH_ERRORS.NOT_CONFIGURED]: 'No endpoint is configured on this device.',
    [PUSH_ERRORS.INVALID_ENDPOINT]: 'The saved endpoint URL is not a valid https:// address.',
    [PUSH_ERRORS.OFFLINE]: 'This device was offline at the time.',
    [PUSH_ERRORS.NETWORK]: 'Could not reach the endpoint (network or CORS rejection).',
    [PUSH_ERRORS.TIMEOUT]: 'The endpoint took too long to respond.',
    [PUSH_ERRORS.HTTP]: 'The endpoint rejected the request.',
    [PUSH_ERRORS.BAD_ACK]: 'The endpoint responded, but not with a recognized acknowledgement.',
}

function errorMessage(code) {
    return ERROR_MESSAGES[code] || 'The last push failed for an unrecognized reason.'
}

/** "2 days ago" / "today" / "yesterday" from an ISO timestamp — calendar-day
 *  based via dateMath's daysBetween, never a raw elapsed-ms computation, so
 *  this can't drift by a day near local midnight. */
function relativeFromNow(iso) {
    if (typeof iso !== 'string' || !iso) return null
    const then = new Date(iso)
    if (Number.isNaN(then.getTime())) return null
    const days = daysBetween(localDateStr(then), localDateStr())
    if (days == null) return null
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days} days ago`
}

const fieldStyle = {
    background: 'var(--input)',
    color: 'var(--text)',
    border: '1px solid var(--divider)',
    borderRadius: 6,
    fontSize: '0.9rem',
    padding: '8px 10px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
}

export default function AgentScreen() {
    const {
        agentEndpointUrl, setAgentEndpointUrl,
        agentEndpointToken, setAgentEndpointToken,
        agentAutoPush, setAgentAutoPush,
    } = useDB()

    const [urlDraft, setUrlDraft] = useState(agentEndpointUrl)
    const [urlError, setUrlError] = useState('')
    const [tokenDraft, setTokenDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [sendMessage, setSendMessage] = useState(null)
    const [lastOk, setLastOk] = useState(null)
    const [lastError, setLastError] = useState(null)

    // DBProvider only renders children once its own settings load has
    // resolved (see db/index.jsx's `ready` gate), so this never races a
    // still-loading agentEndpointUrl — it only ever reflects real changes.
    useEffect(() => {
        setUrlDraft(agentEndpointUrl)
    }, [agentEndpointUrl])

    const refreshStatus = useCallback(async () => {
        setLastOk(await getSetting(LAST_PUSH_OK_KEY))
        setLastError(await getSetting(LAST_PUSH_ERROR_KEY))
    }, [])

    useEffect(() => {
        refreshStatus()
    }, [refreshStatus])

    const configured = !!agentEndpointUrl

    const handleSaveUrl = async () => {
        const trimmed = urlDraft.trim()
        if (!isValidEndpoint(trimmed)) {
            setUrlError('Enter a valid https:// URL.')
            return
        }
        setUrlError('')
        await setAgentEndpointUrl(trimmed)
    }

    const handleClearUrl = async () => {
        if (!confirm('Remove the configured endpoint? Auto-push will stop until reconfigured.')) return
        await setAgentEndpointUrl('')
        setUrlDraft('')
        setUrlError('')
    }

    const handleSaveToken = async () => {
        await setAgentEndpointToken(tokenDraft.trim())
        // Never keep the credential sitting in local state/the DOM once saved.
        setTokenDraft('')
    }

    const handleSendNow = async () => {
        if (!configured) return
        setSending(true)
        setSendMessage(null)
        try {
            const result = await runAgentPush({ endpoint: agentEndpointUrl, token: agentEndpointToken })
            await refreshStatus()
            setSendMessage(result.ok ? 'Sent successfully.' : errorMessage(result.error))
        } finally {
            setSending(false)
        }
    }

    return (
        <>
            <div className="card">
                <div className="section-header blue">🔌 Agent</div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--dim)', margin: 0, lineHeight: 1.4 }}>
                        Point the app at your own backup destination so a copy of your data is sent
                        there automatically. Nothing is sent anywhere until you configure an endpoint.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label htmlFor="agent-endpoint-url" style={{ fontSize: '0.8rem', color: 'var(--label)' }}>
                            Endpoint URL
                        </label>
                        <input
                            id="agent-endpoint-url"
                            type="text"
                            inputMode="url"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="https://your-endpoint.example.com/webhook"
                            value={urlDraft}
                            onChange={e => { setUrlDraft(e.target.value); setUrlError('') }}
                            style={{ ...fieldStyle, borderColor: urlError ? 'var(--alert)' : 'var(--divider)' }}
                        />
                        {urlError && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--alert)', margin: 0 }}>{urlError}</p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSaveUrl}>
                                Save endpoint
                            </button>
                            {configured && (
                                <button
                                    className="sheet__action destructive"
                                    style={{ width: 'auto' }}
                                    onClick={handleClearUrl}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label htmlFor="agent-endpoint-token" style={{ fontSize: '0.8rem', color: 'var(--label)' }}>
                            Token (optional — sent as a bearer token)
                        </label>
                        <input
                            id="agent-endpoint-token"
                            type="password"
                            autoComplete="off"
                            placeholder={agentEndpointToken ? 'Token is set — enter a new one to replace it' : 'No token set'}
                            value={tokenDraft}
                            onChange={e => setTokenDraft(e.target.value)}
                            style={fieldStyle}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSaveToken}>
                                Save token
                            </button>
                            <span style={{ fontSize: '0.78rem', color: 'var(--dim)' }}>
                                {agentEndpointToken ? 'Token: set' : 'Token: not set'}
                            </span>
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                        <input
                            type="checkbox"
                            checked={agentAutoPush}
                            onChange={e => setAgentAutoPush(e.target.checked)}
                        />
                        Auto-push on app open / focus / reconnect (at most once per day)
                    </label>

                    <div>
                        <button
                            className="btn-primary"
                            style={{ width: 'auto' }}
                            onClick={handleSendNow}
                            disabled={!configured || sending}
                        >
                            {sending ? 'Sending…' : 'Send now'}
                        </button>
                        {sendMessage && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--dim)', marginTop: 8 }}>{sendMessage}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="section-header blue">Status</div>
                <div style={{ padding: 14 }}>
                    {!configured ? (
                        <>
                            <p style={{ fontSize: '0.85rem', color: 'var(--dim)', margin: 0, lineHeight: 1.4 }}>
                                Not configured on this device.
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--dim)', marginTop: 8, marginBottom: 0, lineHeight: 1.4 }}>
                                This is where you can point the app at your own backup destination. Nothing
                                is sent anywhere until you set it up above.
                            </p>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                            <div style={{ color: 'var(--primary)' }}>Configured</div>
                            <div style={{ color: 'var(--dim)' }}>
                                Last successful push: {relativeFromNow(lastOk) || 'never'}
                            </div>
                            {lastError && (
                                <div style={{ color: 'var(--warn)' }}>
                                    Last error: {errorMessage(lastError)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
