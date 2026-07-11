/**
 * TaskEditSheet.jsx — full-field task create/edit bottom sheet (W21)
 *
 * Fields: title · note · scheduled time-of-day · repeat-daily toggle — the
 * v1 field ceiling (duration / custom end time / timezone / reminders are
 * explicitly out of scope). Used for both editing an existing task and
 * adding one to a specific group (task == null, group set).
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function TaskEditSheet({ task, group, open, onClose, onSave }) {
    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')
    const [scheduledTime, setScheduledTime] = useState('')
    const [repeatDaily, setRepeatDaily] = useState(false)

    // Re-seed the form whenever the sheet opens for a (different) target
    useEffect(() => {
        if (open) {
            setTitle(task?.title ?? '')
            setNote(task?.note ?? '')
            setScheduledTime(task?.scheduledTime ?? '')
            setRepeatDaily(task?.repeatDaily ?? false)
        }
    }, [open, task?.id])

    const save = e => {
        e.preventDefault()
        const trimmed = title.trim()
        if (!trimmed) return
        onSave({ title: trimmed, note, scheduledTime, repeatDaily })
        onClose()
    }

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title={task ? 'Edit task' : `New task${group ? ` — ${group.name}` : ''}`}
        >
            <form className="sheet-form" onSubmit={save}>
                <label className="sheet-form__label">
                    Title
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" />
                </label>
                <label className="sheet-form__label">
                    Note
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" rows={2} />
                </label>
                <label className="sheet-form__label">
                    Scheduled time
                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                </label>
                <label className="sheet-form__toggle">
                    <input
                        type="checkbox"
                        checked={repeatDaily}
                        onChange={e => setRepeatDaily(e.target.checked)}
                    />
                    Repeat daily
                </label>
                <button type="submit" className="btn-primary">
                    {task ? 'Save changes' : 'Add task'}
                </button>
            </form>
        </BottomSheet>
    )
}
