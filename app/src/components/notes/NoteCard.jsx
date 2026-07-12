/**
 * NoteCard.jsx — one note row inside a group card (W23)
 *
 * Title (or a body excerpt for untitled notes) · tag chips (display-only,
 * capped) · 📌 pin indicator · trailing … button opening the note-actions
 * sheet. Tapping the row opens the editor (parent-owned).
 */

const EXCERPT_LEN = 70
const MAX_CHIPS = 3

function excerpt(body) {
    const firstLine = (body || '').split('\n').find(l => l.trim()) || ''
    return firstLine.length > EXCERPT_LEN
        ? `${firstLine.slice(0, EXCERPT_LEN)}…`
        : firstLine
}

export default function NoteCard({ note, onOpen, onOpenActions }) {
    const label = note.title || excerpt(note.body) || 'Empty note'
    const chips = (note.tags || []).slice(0, MAX_CHIPS)
    const overflow = (note.tags || []).length - chips.length

    return (
        <div className="note-card">
            <button
                className="note-card__main"
                onClick={() => onOpen(note)}
                aria-label={`Open note ${label}`}
            >
                <div className={`note-card__title${note.title ? '' : ' text-dim'}`}>
                    {note.pinned && <span className="note-card__pin" aria-label="Pinned">📌 </span>}
                    {label}
                </div>
                {(chips.length > 0) && (
                    <div className="note-card__meta">
                        {chips.map(tag => (
                            <span key={tag} className="tag-chip tag-chip--static">#{tag}</span>
                        ))}
                        {overflow > 0 && <span className="tag-chip tag-chip--static">+{overflow}</span>}
                    </div>
                )}
            </button>
            <button
                className="btn-ghost note-card__more"
                onClick={() => onOpenActions(note)}
                aria-label={`Actions for ${label}`}
            >
                …
            </button>
        </div>
    )
}
