/**
 * ResetTimeSheet.jsx — edit the daily reset time (W22)
 *
 * Opened by tapping the RESETS IN countdown. One time input + Save — NO
 * timezone picker, device-local only (W22 ruling #2). Saving may shift the
 * logical "today" immediately, which can flip doneToday/streak display at
 * that moment — accepted, no compensation logic.
 */
import { useState, useEffect } from 'react'
import BottomSheet from '../BottomSheet.jsx'

export default function ResetTimeSheet({ open, resetTime, onClose, onSave }) {
    const [value, setValue] = useState(resetTime)

    // Re-seed from the live setting whenever the sheet opens
    useEffect(() => {
        if (open) setValue(resetTime)
    }, [open, resetTime])

    const save = e => {
        e.preventDefault()
        if (!/^\d{2}:\d{2}$/.test(value)) return
        onSave(value)
        onClose()
    }

    return (
        <BottomSheet open={open} onClose={onClose} title="Edit reset time">
            <form className="sheet-form" onSubmit={save}>
                <div className="text-dim text-sm">
                    Set when your daily checklist tasks reset. Device-local time.
                </div>
                <label className="sheet-form__label">
                    Daily reset time
                    <input
                        type="time"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        required
                    />
                </label>
                <button type="submit" className="btn-primary">Save</button>
            </form>
        </BottomSheet>
    )
}
