/**
 * Checklist.jsx — slot-4 hub placeholder (W20).
 *
 * Intentionally inert: no useDB(), no Dexie, no state. W21 (Checklist hub v1
 * — groups, daily-recurring tasks, streaks, pinned quick-add) replaces the
 * contents of this same file.
 */
export default function Checklist() {
    return (
        <div className="app">
            <header className="page-header">
                <h1>☑️ Checklist</h1>
                <div className="subtitle">Daily Standing Orders</div>
            </header>

            <main className="content">
                <div className="card" style={{ padding: 24, textAlign: 'center', marginTop: 24 }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>☑️</div>
                    <div style={{
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--accent)',
                        marginBottom: 8
                    }}>
                        Mission Control Coming Online
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--dim)', lineHeight: 1.6 }}>
                        Standing orders, daily tasks, and streak tracking are being forged.
                        This station deploys in the next phase. Stay on mission.
                    </div>
                </div>
            </main>
        </div>
    )
}
