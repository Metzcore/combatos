/**
 * IgnitionScreen.jsx — More › Ignition (W29 PR A, extended in PR D).
 *
 * Two cards: the original "Saved Ignitions" bookmark list (moved verbatim
 * from the former Settings.jsx), now resolving bookmarked ids against the
 * MERGED bundled+custom list so a bookmarked custom quote still resolves;
 * and a new "Custom Ignitions" card — paste-import (IgnitionImportSheet,
 * mirroring the checklist's ImportSheet), per-quote delete, and a
 * confirm-gated reset back to bundled-only.
 *
 * Deleting a bookmarked custom quote degrades gracefully: the bookmark id
 * simply stops resolving to a quote, and the existing `if (!quote) return
 * null` guard below already skips it — no extra bookmark-cleanup step is
 * needed for this to be safe.
 */
import { useState } from 'react'
import { useDB } from '../../db/index.jsx'
import { IGNITION_QUOTES } from '../../data/ignition.js'
import { mergeIgnitions } from '../../utils/customIgnitions.js'
import IgnitionImportSheet from './IgnitionImportSheet.jsx'

export default function IgnitionScreen() {
    const {
        bookmarkedIgnitions, toggleIgnitionBookmark,
        customIgnitions, addCustomIgnitions, deleteCustomIgnition, resetCustomIgnitions,
    } = useDB()
    const [importOpen, setImportOpen] = useState(false)

    const allQuotes = mergeIgnitions(IGNITION_QUOTES, customIgnitions)

    const handleImport = async lines => {
        await addCustomIgnitions(lines)
    }

    const handleDelete = id => {
        if (confirm('Delete this custom quote?')) {
            deleteCustomIgnition(id)
        }
    }

    const handleReset = () => {
        if (customIgnitions.length === 0) return
        if (confirm(`Delete all ${customIgnitions.length} custom quote${customIgnitions.length === 1 ? '' : 's'}? Bundled quotes are never affected.`)) {
            resetCustomIgnitions()
        }
    }

    return (
        <>
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
                                const quote = allQuotes.find(q => q.id === id)
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

            <div className="card">
                <div className="section-header green">✎ Custom Ignitions</div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary" onClick={() => setImportOpen(true)}>
                            Add quotes
                        </button>
                        <button
                            className="sheet__action destructive"
                            style={{ width: 'auto' }}
                            onClick={handleReset}
                            disabled={customIgnitions.length === 0}
                        >
                            Reset to defaults
                        </button>
                    </div>

                    {customIgnitions.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--dim)', fontStyle: 'italic', margin: 0 }}>
                            No custom quotes yet — paste your own to mix into Daily Ignition.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {customIgnitions.map(q => (
                                <div key={q.id} style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, fontStyle: 'italic' }}>"{q.text}"</p>
                                    <button
                                        onClick={() => handleDelete(q.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--alert)', fontSize: '1.2rem', cursor: 'pointer' }}
                                        title="Delete quote"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <IgnitionImportSheet
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onImport={handleImport}
            />
        </>
    )
}
