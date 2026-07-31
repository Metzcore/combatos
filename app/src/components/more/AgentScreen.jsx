/**
 * AgentScreen.jsx — More › Agent (W29).
 *
 * Placeholder. The Agent surface configures this app as an OUTBOUND sensor and
 * trigger for an automation stack the user already runs (n8n, Hermes) — it is
 * not an in-app assistant. Endpoint configuration, the push engine and the
 * status readout land in later, separately reviewed changes.
 *
 * Until an endpoint is configured this screen stays inert by design: no
 * network request, no scheduled job, no error badge, and no degraded app
 * behaviour. A user who never sets this up simply has a feature that does
 * nothing, which is the intended experience for anyone onboarded to the app
 * who does not run their own automation.
 */
export default function AgentScreen() {
    return (
        <div className="card">
            <div className="section-header blue">🔌 Agent</div>
            <div style={{ padding: 14 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--dim)', marginBottom: 12, lineHeight: 1.4 }}>
                    Not configured on this device.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--dim)', lineHeight: 1.4 }}>
                    This is where you can point the app at your own backup destination, so a copy
                    of your data is sent there automatically. Nothing is sent anywhere until you
                    set it up.
                </p>
            </div>
        </div>
    )
}
