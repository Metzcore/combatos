/**
 * CoreBlock.jsx
 * Renders the ⚙️ CORE & ACCESSORIES section.
 *
 * W10: collapsible. `open`/`onToggle` are UI-only props owned by DBProvider
 * (survive tab/hub switches). Logged-value props/callbacks unchanged.
 */
export default function CoreBlock({ sets, onSetChange, open, onToggle }) {
    // 3 flexible rows
    const loggedCount = [1, 2, 3].filter(rowNum => {
        const e = sets[rowNum]
        return e && ((e.ex && e.ex !== '') || (e.sets && e.sets !== '') || (e.reps && e.reps !== ''))
    }).length

    return (
        <div className={`card card--collapsible${open ? ' open' : ''}`}>
            <button
                type="button"
                className="section-header amber card__toggle"
                onClick={onToggle}
                aria-expanded={!!open}
            >
                <span>⚙️ Core &amp; Accessories (Optional)</span>
                {!open && loggedCount > 0 && (
                    <span className="card__summary">{loggedCount} exercise{loggedCount === 1 ? '' : 's'} logged</span>
                )}
                <span className="card__chevron" aria-hidden="true">▾</span>
            </button>

            <div className="card__body">
                <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--dim)', fontStyle: 'italic' }}>
                    If you have time, log your core or accessory work here. Does not affect Completeness %.
                </div>

                <div className="str-set-header" style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 2fr) 60px 60px', gap: 8, padding: '16px 14px 8px 14px' }}>
                    <span>Exercise</span>
                    <span>Sets</span>
                    <span>Reps</span>
                </div>

                <div style={{ padding: '0 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(rowNum => {
                        const entry = sets[rowNum] || {}
                        return (
                            <div key={rowNum} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 2fr) 60px 60px', gap: 8 }}>
                                <input
                                    type="text"
                                    placeholder="e.g. Hanging Leg Raises"
                                    value={entry.ex || ''}
                                    onChange={e => onSetChange(rowNum, 'ex', e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="3"
                                    min="0"
                                    value={entry.sets || ''}
                                    onChange={e => onSetChange(rowNum, 'sets', e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="15"
                                    min="0"
                                    value={entry.reps || ''}
                                    onChange={e => onSetChange(rowNum, 'reps', e.target.value)}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
