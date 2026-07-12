/**
 * NoteEditor.jsx — full in-tab note editor SCREEN (W23; ruled screen-not-
 * sheet so a long journal entry gets real vertical space and can't be lost
 * to an accidental backdrop tap).
 *
 * Two modes:
 * - VIEW: body lines rendered via parseNoteLines(); `- [ ]` / `- [x]`
 *   lines are tappable checkboxes — a tap rewrites exactly that line in
 *   the stored text (toggleCheckboxLine) and persists IMMEDIATELY.
 * - EDIT: plain <textarea> (plain text ONLY — no rich text, ruled) +
 *   title input + tag chips (add/remove).
 *
 * Save semantics (W23 ruling — the failure mode designed against is losing
 * a long journal entry):
 * - debounced autosave (~700ms) on every edit
 * - flush on visibilitychange→hidden and on unmount (OS backgrounding /
 *   navigation can't lose more than the debounce window)
 * - LAZY creation: a brand-new note has NO row until the first persist
 *   with non-empty content — backing out of an untouched editor creates
 *   nothing ("no empty notes, ever", generalized from the daily-note rule)
 * - persists are serialized through a promise chain, so a debounce fire
 *   racing the initial create can never double-create
 *
 * The component seeds local state ONCE from `initial` — while the editor
 * is open it is the source of truth; background view-model refreshes never
 * reseed it (they would clobber in-flight typing).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { parseNoteLines, toggleCheckboxLine } from '../../utils/noteChecklist.js'
import { normalizeTag } from '../../utils/noteTags.js'

const AUTOSAVE_MS = 700

export default function NoteEditor({ initial, onCreate, onUpdate, onClose }) {
    const [title, setTitle] = useState(initial.note?.title ?? '')
    const [body, setBody] = useState(initial.note?.body ?? '')
    const [tags, setTags] = useState(initial.note?.tags ?? [])
    const [tagInput, setTagInput] = useState('')
    const [mode, setMode] = useState(initial.mode ?? 'view')

    const noteIdRef = useRef(initial.note?.id ?? null)
    const groupIdRef = useRef(initial.note?.groupId ?? initial.groupId ?? null)
    const timerRef = useRef(null)
    const pendingRef = useRef(null)
    const chainRef = useRef(Promise.resolve())

    // Serialized persist: updates go to the existing row; the FIRST
    // non-empty persist of a new note creates the row and remembers its id.
    const doPersist = useCallback(fields => {
        chainRef.current = chainRef.current.then(async () => {
            if (noteIdRef.current) {
                await onUpdate(noteIdRef.current, fields)
            } else if (fields.title.trim() || fields.body.trim() || fields.tags.length > 0) {
                const note = await onCreate({ ...fields, groupId: groupIdRef.current })
                noteIdRef.current = note.id
            }
        }).catch(console.error)
        return chainRef.current
    }, [onCreate, onUpdate])

    const flush = useCallback(() => {
        clearTimeout(timerRef.current)
        if (pendingRef.current) {
            const fields = pendingRef.current
            pendingRef.current = null
            doPersist(fields)
        }
    }, [doPersist])

    const schedule = useCallback(fields => {
        pendingRef.current = fields
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(flush, AUTOSAVE_MS)
    }, [flush])

    // Data-loss guards: drain any pending debounce the moment the app is
    // hidden (backgrounded / screen off) and again on unmount (back button,
    // hub switch). The Dexie write itself doesn't need the component alive.
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flush()
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            flush()
        }
    }, [flush])

    const edit = patch => {
        const next = { title, body, tags, ...patch }
        if ('title' in patch) setTitle(patch.title)
        if ('body' in patch) setBody(patch.body)
        if ('tags' in patch) setTags(patch.tags)
        schedule({ title: next.title, body: next.body, tags: next.tags })
    }

    // View-mode checkbox tap: a discrete action — rewrite the exact line
    // and persist NOW (no debounce; any pending fields would be stale).
    const handleToggleLine = lineIndex => {
        const newBody = toggleCheckboxLine(body, lineIndex)
        if (newBody === body) return
        setBody(newBody)
        clearTimeout(timerRef.current)
        pendingRef.current = null
        doPersist({ title, body: newBody, tags })
    }

    const addTag = () => {
        const tag = normalizeTag(tagInput)
        setTagInput('')
        if (!tag || tags.includes(tag)) return
        edit({ tags: [...tags, tag] })
    }

    const removeTag = tag => {
        edit({ tags: tags.filter(t => t !== tag) })
    }

    const handleTagKeyDown = e => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
        }
    }

    const close = () => {
        flush()
        onClose()
    }

    const lines = parseNoteLines(body)

    return (
        <div className="app note-editor">
            <header className="note-editor__bar">
                <button className="btn-ghost" onClick={close} aria-label="Back to notes">← Notes</button>
                <button
                    className="btn-ghost note-editor__mode"
                    onClick={() => { if (mode === 'edit') flush(); setMode(mode === 'edit' ? 'view' : 'edit') }}
                    aria-label={mode === 'edit' ? 'Switch to view mode' : 'Switch to edit mode'}
                >
                    {mode === 'edit' ? '✓ Done' : '✎ Edit'}
                </button>
            </header>

            <main className="content note-editor__content">
                {mode === 'edit' ? (
                    <>
                        <input
                            type="text"
                            className="note-editor__title-input"
                            value={title}
                            onChange={e => edit({ title: e.target.value })}
                            placeholder="Title (optional)"
                            aria-label="Note title"
                        />
                        <textarea
                            className="note-editor__body"
                            value={body}
                            onChange={e => edit({ body: e.target.value })}
                            placeholder={'Write anything…\n\n- [ ] lines become tappable checkboxes in view mode'}
                            aria-label="Note body"
                        />
                        <div className="note-editor__tags">
                            {tags.map(tag => (
                                <span key={tag} className="tag-chip tag-chip--static">
                                    #{tag}
                                    <button
                                        className="tag-chip__remove"
                                        onClick={() => removeTag(tag)}
                                        aria-label={`Remove tag ${tag}`}
                                    >✕</button>
                                </span>
                            ))}
                            <input
                                type="text"
                                className="note-editor__tag-input"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                onBlur={addTag}
                                placeholder="+ tag"
                                aria-label="Add tag"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        {title && <h2 className="note-editor__title">{title}</h2>}
                        <div className="note-editor__view">
                            {lines.map((line, i) => line.type === 'checkbox' ? (
                                <div key={i} className={`note-line note-line--checkbox${line.checked ? ' done' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={line.checked}
                                        onChange={() => handleToggleLine(i)}
                                        aria-label={`Toggle ${line.text || 'checkbox'}`}
                                    />
                                    <span className="note-line__text">{line.text || ' '}</span>
                                </div>
                            ) : (
                                <div key={i} className="note-line">{line.raw || ' '}</div>
                            ))}
                            {!body && (
                                <div className="text-dim text-sm">
                                    Empty note — tap ✎ Edit to start writing.
                                </div>
                            )}
                        </div>
                        {tags.length > 0 && (
                            <div className="note-editor__tags">
                                {tags.map(tag => (
                                    <span key={tag} className="tag-chip tag-chip--static">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
