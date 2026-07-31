/**
 * IgnitionScreen.jsx — More › Ignition (W29).
 *
 * The former Settings.jsx "Saved Ignitions" card, moved verbatim. Custom
 * user-authored quotes (paste-import, delete, reset to defaults) are a
 * separate, later change; this screen is the existing bookmark list only.
 */
import { useDB } from '../../db/index.jsx'
import { IGNITION_QUOTES } from '../../data/ignition.js'

export default function IgnitionScreen() {
    const { bookmarkedIgnitions, toggleIgnitionBookmark } = useDB()

    return (
        <div className="card">
            <div className="section-header green">🔖 Saved Ignitions</div>
            <div style={{ padding: 14 }}>
                {bookmarkedIgnitions.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--dim)', fontStyle: 'italic' }}>
                        No ignitions bookmarked yet.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {bookmarkedIgnitions.map(id => {
                            const quote = IGNITION_QUOTES.find(q => q.id === id)
                            if (!quote) return null
                            return (
                                <div key={id} style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, fontStyle: 'italic' }}>"{quote.text}"</p>
                                    <button
                                        onClick={() => toggleIgnitionBookmark(id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--alert)', fontSize: '1.2rem', cursor: 'pointer' }}
                                        title="Remove bookmark"
                                    >
                                        ★
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
