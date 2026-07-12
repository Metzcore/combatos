/**
 * NoteGroupCard.jsx — one note-group card: header actions + note rows (W23)
 *
 * Mirrors ChecklistGroupCard: header keeps ONLY `+` (new note) and the `…`
 * group-actions opener; rename / move / delete live in the bottom sheet.
 * Notes arrive already sorted (pinned-first, then recency) from the view
 * model — no ordering logic here.
 */
import NoteCard from './NoteCard.jsx'

export default function NoteGroupCard({
    group,
    onAddNote, onOpenGroupActions,
    onOpenNote, onOpenNoteActions
}) {
    return (
        <div className="card checklist-group">
            <div className="checklist-group__header">
                <div className="checklist-group__name">{group.name}</div>
                <div className="checklist-group__actions">
                    <button className="btn-ghost" onClick={() => onAddNote(group)} aria-label={`New note in ${group.name}`}>+</button>
                    <button className="btn-ghost" onClick={() => onOpenGroupActions(group)} aria-label={`Actions for ${group.name}`}>…</button>
                </div>
            </div>
            {group.notes.length === 0 ? (
                <div className="checklist-group__empty">No notes yet</div>
            ) : (
                group.notes.map(note => (
                    <NoteCard
                        key={note.id}
                        note={note}
                        onOpen={onOpenNote}
                        onOpenActions={onOpenNoteActions}
                    />
                ))
            )}
        </div>
    )
}
