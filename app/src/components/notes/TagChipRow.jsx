/**
 * TagChipRow.jsx — derived tag-chip filter row (W23)
 *
 * Union of tags in use across live notes + counts, computed by the view
 * model (deriveTagCounts — no separate tags table). Single-select filter:
 * tapping a chip activates it, tapping the active chip clears it. Hidden
 * entirely when no tags exist.
 */
export default function TagChipRow({ tagCounts, activeTag, onSelect }) {
    if (tagCounts.length === 0) return null
    return (
        <div className="tag-chip-row" role="listbox" aria-label="Filter notes by tag">
            {tagCounts.map(({ tag, count }) => (
                <button
                    key={tag}
                    role="option"
                    aria-selected={activeTag === tag}
                    className={`tag-chip${activeTag === tag ? ' active' : ''}`}
                    onClick={() => onSelect(activeTag === tag ? '' : tag)}
                >
                    #{tag} <span className="tag-chip__count">{count}</span>
                </button>
            ))}
        </div>
    )
}
