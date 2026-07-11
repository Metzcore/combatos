/**
 * ImportSheet.jsx — paste-text import bottom sheet (W22)
 *
 * Textarea, one task per line (parsing rules live in
 * utils/checklistImport.js), live "N tasks will be created" count, and on
 * confirm the titles are created as plain tasks (repeatDaily false, no
 * time) in the General group via the hook's quickAdd path — option (A) per
 * the reviewer ruling: loop cl.quickAdd, preserving the hook-only layering.
 * No image import, no AI parsing, no quota (W22 ruling #4).
 */
import { useState } from 'react'
import BottomSheet from '../BottomSheet.jsx'
import { parseImportLines } from '../../utils/checklistImport.js'

export default function ImportSheet({ open, onClose, onImport }) {
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)

    const titles = parseImportLines(text)

    const close = () => {
        setText('')
        onClose()
    }

    const submit = async e => {
        e.preventDefault()
        if (titles.length === 0 || busy) return
        setBusy(true)
        try {
            await onImport(titles)
        } finally {
            setBusy(false)
        }
        close()
    }

    return (
        <BottomSheet open={open} onClose={close} title="Import checklist">
            <form className="sheet-form" onSubmit={submit}>
                <div className="text-dim text-sm">
                    Paste your checklist as text — one task per line. Leading
                    -, * or • markers are stripped.
                </div>
                <label className="sheet-form__label">
                    Tasks
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={'- Wake up at 5am\n- Exercise for 30 minutes\n- Review goals…'}
                        rows={6}
                    />
                </label>
                <div className="import-count" aria-live="polite">
                    {titles.length} task{titles.length === 1 ? '' : 's'} will be created
                </div>
                <button type="submit" className="btn-primary" disabled={titles.length === 0 || busy}>
                    {busy ? 'Importing…' : 'Import'}
                </button>
            </form>
        </BottomSheet>
    )
}
