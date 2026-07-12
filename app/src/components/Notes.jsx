/**
 * Notes.jsx — the Notes tab inside the slot-4 Checklist hub (W23, D4).
 *
 * Groups → notes with tags + pin, tappable inline checklists (view mode),
 * on-demand daily note on the LOGICAL day (one clock with the checklist —
 * logicalDateStr + the checklistResetTime setting), substring search
 * combinable with a tag-chip filter, and quick capture. LOCAL-ONLY: zero
 * webhook/Sheets involvement — data lives in the W23 Dexie stores via
 * hooks/useNotes.js (deliberately outside DBProvider).
 *
 * The editor is a full in-tab SCREEN (ruled): while a note is open, this
 * component renders NoteEditor instead of the list. Plain text only.
 */
import { useState } from 'react'
import { useNotes } from '../hooks/useNotes.js'
import { filterNotesViewModel } from '../utils/noteFilter.js'
import NoteGroupCard from './notes/NoteGroupCard.jsx'
import NoteEditor from './notes/NoteEditor.jsx'
import NoteActionsSheet from './notes/NoteActionsSheet.jsx'
import NoteGroupActionsSheet from './notes/NoteGroupActionsSheet.jsx'
import DailyTemplateSheet from './notes/DailyTemplateSheet.jsx'
import TagChipRow from './notes/TagChipRow.jsx'
import GroupNameSheet from './checklist/GroupNameSheet.jsx'
import QuickAddBar from './checklist/QuickAddBar.jsx'

export default function Notes() {
    const n = useNotes()

    // Editor screen state: null | { note, groupId, mode }. New notes pass
    // note: null + the target groupId; the row is created lazily by the
    // editor on the first non-empty autosave (no empty notes, ever).
    const [editorState, setEditorState] = useState(null)

    // Filters (component-local, reset on unmount by design)
    const [query, setQuery] = useState('')
    const [activeTag, setActiveTag] = useState('')

    // Which sheet is open (at most one in practice)
    const [actionsNote, setActionsNote] = useState(null)
    const [actionsGroupId, setActionsGroupId] = useState(null)
    const [nameState, setNameState] = useState(null) // { group } (rename) | {} (create) | null
    const [templateOpen, setTemplateOpen] = useState(false)

    // Group-actions sheet derives its target from the LIVE view model (same
    // idiom as Checklist.jsx) so Move up/down keeps working across renders.
    const actionsGroupIdx = n.groups.findIndex(g => g.id === actionsGroupId)
    const actionsGroup = actionsGroupIdx === -1 ? null : n.groups[actionsGroupIdx]

    const handleSaveGroupName = name => {
        if (nameState?.group) {
            n.renameGroup(nameState.group.id, name)
        } else {
            n.addGroup(name)
        }
    }

    const handleToday = async () => {
        const note = await n.openDailyNote()
        setEditorState({ note, mode: 'edit' })
    }

    if (editorState) {
        return (
            <NoteEditor
                initial={editorState}
                onCreate={n.addNote}
                onUpdate={n.updateNote}
                onClose={() => setEditorState(null)}
            />
        )
    }

    const visibleGroups = filterNotesViewModel(n.groups, { query, tag: activeTag })
    const filtering = query.trim() !== '' || activeTag !== ''

    return (
        <div className="app">
            <header className="page-header">
                <h1>📝 Notes</h1>
                <div className="subtitle">Field Notes & Debriefs</div>
            </header>

            <main className="content checklist-content">
                <div className="notes-toolbar">
                    <input
                        type="search"
                        className="notes-search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search notes…"
                        aria-label="Search notes"
                    />
                    <div className="checklist-toolbar__actions">
                        <button className="btn-ghost" onClick={handleToday} aria-label="Open today's daily note">
                            ☀ Today
                        </button>
                        <button className="btn-ghost" onClick={() => setTemplateOpen(true)} aria-label="Edit daily note template">
                            ✎ Template
                        </button>
                    </div>
                </div>

                <TagChipRow
                    tagCounts={n.tagCounts}
                    activeTag={activeTag}
                    onSelect={setActiveTag}
                />

                {n.loading ? (
                    <div className="checklist-empty text-dim">Loading…</div>
                ) : visibleGroups.length === 0 ? (
                    <div className="card checklist-empty">
                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📝</div>
                        <div className="checklist-empty__title">
                            {filtering ? 'No matching notes' : 'No notes yet'}
                        </div>
                        <div className="text-dim text-sm">
                            {filtering
                                ? 'Try a different search or clear the tag filter.'
                                : 'Type below to capture a note — it lands in an Inbox group.'}
                        </div>
                    </div>
                ) : (
                    visibleGroups.map(group => (
                        <NoteGroupCard
                            key={group.id}
                            group={group}
                            onAddNote={g => setEditorState({ note: null, groupId: g.id, mode: 'edit' })}
                            onOpenGroupActions={g => setActionsGroupId(g.id)}
                            onOpenNote={note => setEditorState({ note, mode: 'view' })}
                            onOpenNoteActions={setActionsNote}
                        />
                    ))
                )}

                <button className="btn-secondary" onClick={() => setNameState({})}>
                    + Create Group
                </button>
            </main>

            <QuickAddBar
                onSubmit={n.quickCapture}
                placeholder="Capture a note"
                submitLabel="Add note"
            />

            <NoteActionsSheet
                note={actionsNote}
                groups={n.groups}
                onClose={() => setActionsNote(null)}
                onEdit={note => setEditorState({ note, mode: 'edit' })}
                onTogglePin={n.setPinned}
                onMoveToGroup={n.moveNote}
                onDelete={n.deleteNote}
            />

            <NoteGroupActionsSheet
                group={actionsGroup}
                isFirst={actionsGroupIdx === 0}
                isLast={actionsGroupIdx === n.groups.length - 1}
                onClose={() => setActionsGroupId(null)}
                onRename={group => setNameState({ group })}
                onMove={n.moveGroup}
                onDelete={n.deleteGroup}
            />

            <GroupNameSheet
                open={!!nameState}
                group={nameState?.group ?? null}
                onClose={() => setNameState(null)}
                onSave={handleSaveGroupName}
            />

            <DailyTemplateSheet
                open={templateOpen}
                onClose={() => setTemplateOpen(false)}
                getTemplate={n.getDailyTemplate}
                onSave={n.saveDailyTemplate}
            />
        </div>
    )
}
