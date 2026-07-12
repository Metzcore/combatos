/**
 * DailyTemplateSheet.jsx — edit the daily-note template (W23)
 *
 * Small sheet reachable from the Notes toolbar. Plain-text template stored
 * in the key-value `settings` store (`notesDailyTemplate`) — editing it
 * affects the NEXT daily note created, never any existing note. Seeds from
 * the live setting on every open (async read, same seed-on-open pattern as
 * ResetTimeSheet, just with a fetch).
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function DailyTemplateSheet({ open, onClose, getTemplate, onSave }) {
    const [value, setValue] = useState('')
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        if (!open) return
        setLoaded(false)
        let cancelled = false
        getTemplate().then(t => {
            if (!cancelled) {
                setValue(t)
                setLoaded(true)
            }
        })
        return () => { cancelled = true }
    }, [open, getTemplate])

    const save = e => {
        e.preventDefault()
        onSave(value)
        onClose()
    }

    return (
        <BottomSheet open={open} onClose={onClose} title="Daily note template">
            <form className="sheet-form" onSubmit={save}>
                <div className="text-dim text-sm">
                    New daily notes start from this text. Editing it never
                    changes notes that already exist.
                </div>
                <label className="sheet-form__label">
                    Template
                    <textarea
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        rows={6}
                        disabled={!loaded}
                    />
                </label>
                <button type="submit" className="btn-primary" disabled={!loaded}>Save</button>
            </form>
        </BottomSheet>
    )
}
