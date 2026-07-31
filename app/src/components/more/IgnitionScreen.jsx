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
                <div className="more-body">
                    {bookmarkedIgnitions.length === 0 ? (
                        <p className="more-empty">
                            No ignitions bookmarked yet.
                        </p>
                    ) : (
                        <div className="more-list">
                            {bookmarkedIgnitions.map(id => {
                                const quote = allQuotes.find(q => q.id === id)
                                if (!quote) return null
                                return (
                                    <div key={id} className="quote-row">
                                        <p className="quote-row__text">"{quote.text}"</p>
                                        <button
                                            className="icon-btn icon-btn--alert"
                                            onClick={() => toggleIgnitionBookmark(id)}
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
                <div className="more-body">
                    <div className="more-actions">
                        <button className="btn-primary" onClick={() => setImportOpen(true)}>
                            Add quotes
                        </button>
                        <button
                            className="sheet__action destructive"
                            onClick={handleReset}
                            disabled={customIgnitions.length === 0}
                        >
                            Reset to defaults
                        </button>
                    </div>

                    {customIgnitions.length === 0 ? (
                        <p className="more-empty">
                            No custom quotes yet — paste your own to mix into Daily Ignition.
                        </p>
                    ) : (
                        <div className="more-list">
                            {customIgnitions.map(q => (
                                <div key={q.id} className="quote-row">
                                    <p className="quote-row__text">"{q.text}"</p>
                                    <button
                                        className="icon-btn icon-btn--alert"
                                        onClick={() => handleDelete(q.id)}
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
