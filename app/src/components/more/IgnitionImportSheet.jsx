/**
 * IgnitionImportSheet.jsx — paste-text import bottom sheet for custom
 * Daily Ignition quotes (W29 PR D).
 *
 * Mirrors components/checklist/ImportSheet.jsx exactly: same BottomSheet
 * primitive, same textarea + live count + submit shape. The only
 * difference is what's being pasted (quotes, not task titles) and where
 * the parsing/dedupe logic lives (utils/customIgnitions.js's
 * parseIgnitionLines, not utils/checklistImport.js's parseImportLines) —
 * duplicate lines are silently skipped by addCustomIgnitions on submit, so
 * the count shown here is "lines parsed", not "quotes that will be added".
 */
import { useState } from 'react'
import BottomSheet from '../BottomSheet.jsx'
import { parseIgnitionLines } from '../../utils/customIgnitions.js'

export default function IgnitionImportSheet({ open, onClose, onImport }) {
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)

    const lines = parseIgnitionLines(text)

    const close = () => {
        setText('')
        onClose()
    }

    const submit = async e => {
        e.preventDefault()
        if (lines.length === 0 || busy) return
        setBusy(true)
        try {
            await onImport(lines)
        } finally {
            setBusy(false)
        }
        close()
    }

    return (
        <BottomSheet open={open} onClose={close} title="Add custom ignitions">
            <form className="sheet-form" onSubmit={submit}>
                <div className="text-dim text-sm">
                    Paste your own quotes — one per line. Leading -, * or •
                    markers are stripped. Quotes that match one you've
                    already added are skipped.
                </div>
                <label className="sheet-form__label">
                    Quotes
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={'Decide. Commit. Act.\nGet comfortable being uncomfortable.'}
                        rows={6}
                    />
                </label>
                <div className="import-count" aria-live="polite">
                    {lines.length} line{lines.length === 1 ? '' : 's'} parsed
                </div>
                <button type="submit" className="btn-primary" disabled={lines.length === 0 || busy}>
                    {busy ? 'Adding…' : 'Add'}
                </button>
            </form>
        </BottomSheet>
    )
}
