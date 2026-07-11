/**
 * QuickAddBar.jsx — pinned quick-add input (W21)
 *
 * Fixed just above the bottom nav while the Checklist hub is mounted.
 * Zero-navigation capture: submit creates a task in the default/General
 * group. NO FAB, per the W19 §6 ruling.
 */
import { useState } from 'react'

export default function QuickAddBar({ onSubmit }) {
    const [text, setText] = useState('')

    const submit = e => {
        e.preventDefault()
        const title = text.trim()
        if (!title) return
        onSubmit(title)
        setText('')
    }

    return (
        <form className="quick-add-bar" onSubmit={submit}>
            <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Describe your task"
                aria-label="Describe your task"
            />
            <button type="submit" className="quick-add-bar__submit" aria-label="Add task">↓</button>
        </form>
    )
}
