/**
 * WeightCheckIn.jsx — More › Profile weight section (W30).
 *
 * The logging surface: current weight, this week's entry, recent check-ins,
 * and a unit toggle.
 *
 * ── THE RATCHET, ENFORCED AT THE UI BOUNDARY ─────────────────────────────
 * `utils/weightValue.js` documents why a UI round-trip must never become a
 * write: 180.0 lb is 81.6466 kg, displays as 81.6, and persisting the
 * DISPLAYED value loses 0.047 kg — compounding on every repeat until a stable
 * weight visibly drifts. This component is where that rule is kept:
 *
 *   - toggling the unit only re-renders; it NEVER saves;
 *   - the input is seeded from canonical kg and otherwise left alone;
 *   - Save parses whatever the user typed, in the unit shown at that moment.
 *
 * ── SYNC STATE IS SHOWN, NOT HIDDEN ──────────────────────────────────────
 * Each entry says where it actually is: on this device, synced, or needing
 * attention with a retry. This data is shared with a coach, so both the
 * transfer and any silent failure have to be visible — a row stuck pending
 * forever would otherwise look identical to one safely delivered.
 *
 * NO TARGET, NO STREAK, NO PROJECTION. Per decision_log 2026-07-31.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { db, getSetting } from '../../db/index.jsx'
import {
    saveWeight, listWeights, deleteWeight,
    SYNC_SYNCED,
} from '../../db/bodyWeight.js'
import { fromInput, toEditValue, formatWeight, WEIGHT_UNITS } from '../../utils/weightValue.js'
import { localDateStr } from '../../utils/checklistDate.js'
import { parseDateParts } from '../../utils/dateMath.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const unitKey = ownerUserId => `weightUnit:${ownerUserId}`

// String-based; never new Date(dateStr), which parses as UTC midnight.
function formatEntryDate(dateStr) {
    const parts = parseDateParts(dateStr)
    if (!parts) return dateStr
    return `${MONTHS[parts.m - 1]} ${parts.d}, ${parts.y}`
}

function syncLabel(row) {
    if (row.syncState === SYNC_SYNCED) return { text: 'Synced', tone: 'var(--dim)' }
    if (row.syncError) return { text: 'Sync needs attention', tone: 'var(--warn)' }
    return { text: 'On this device', tone: 'var(--dim)' }
}

export default function WeightCheckIn({ onSaved }) {
    const { user } = useAuth()
    const ownerUserId = user?.id ?? null

    const [unit, setUnit] = useState('kg')
    const [rows, setRows] = useState([])
    const [input, setInput] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const today = localDateStr()

    const load = useCallback(async () => {
        if (!ownerUserId) { setRows([]); return }
        const [list, storedUnit] = await Promise.all([
            listWeights(ownerUserId),
            getSetting(unitKey(ownerUserId)),
        ])
        setRows(list)
        if (WEIGHT_UNITS.includes(storedUnit)) setUnit(storedUnit)
    }, [ownerUserId])

    useEffect(() => { load().catch(console.error) }, [load])

    const todayRow = rows.find(r => r.date === today) ?? null

    // Seed the field from CANONICAL kg whenever the entry or unit changes.
    // Deriving from the stored value (not from the previous display string) is
    // what stops the ratchet: no rounding is ever fed back into a save.
    useEffect(() => {
        setInput(todayRow ? toEditValue(todayRow.kg, unit) : '')
    }, [todayRow, unit])

    const changeUnit = async next => {
        setUnit(next)   // presentation only — no weight is written here
        if (ownerUserId) await db.settings.put({ key: unitKey(ownerUserId), value: next })
    }

    const handleSave = async () => {
        setError('')
        const kg = fromInput(input, unit)
        if (kg === null) {
            setError(`Enter a weight in ${unit}, for example ${unit === 'kg' ? '81.6' : '180.0'}.`)
            return
        }
        setBusy(true)
        try {
            await saveWeight({ ownerUserId, date: today, kg })
            await load()
            if (onSaved) onSaved()
        } catch (err) {
            console.error('weight save failed', err)
            setError('Could not save that check-in. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    const handleDelete = async date => {
        // Wrong-DATE entries are the case that makes deletion necessary: a
        // weight logged against a day you never weighed cannot be corrected by
        // overwriting, only removed.
        if (!confirm(`Remove the check-in for ${formatEntryDate(date)}?`)) return
        await deleteWeight(ownerUserId, date)
        await load()
        if (onSaved) onSaved()
    }

    if (!ownerUserId) return null

    return (
        <div className="card">
            <div className="section-header green">⚖️ Weight check-in</div>
            <div className="more-body">
                <div className="weight-units">
                    {WEIGHT_UNITS.map(u => (
                        <button
                            key={u}
                            type="button"
                            className="weight-units__btn"
                            onClick={() => changeUnit(u)}
                            aria-pressed={unit === u}
                        >
                            {u}
                        </button>
                    ))}
                </div>

                <div className="more-group">
                    <label htmlFor="weightInput" className="more-field-label">
                        {todayRow ? "Today's check-in" : 'Log today'}
                    </label>
                    <input
                        id="weightInput"
                        type="text"
                        inputMode="decimal"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={unit === 'kg' ? '81.6' : '180.0'}
                    />
                    {error && (
                        <div className="more-error">{error}</div>
                    )}
                </div>

                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={busy}
                >
                    {busy ? 'Saving…' : todayRow ? 'UPDATE CHECK-IN' : 'SAVE CHECK-IN'}
                </button>

                {rows.length === 0 ? (
                    <p className="more-empty">
                        No check-ins yet.
                    </p>
                ) : (
                    <div className="weight-history">
                        <div className="more-label">
                            Recent check-ins
                        </div>
                        <div className="more-list">
                            {rows.slice(0, 8).map(row => {
                                const sync = syncLabel(row)
                                return (
                                    <div key={row.date} className="weight-entry">
                                        <div className="weight-entry__main">
                                            <div className="weight-entry__value">
                                                {formatWeight(row.kg, unit)}
                                            </div>
                                            <div className="weight-entry__meta">
                                                {formatEntryDate(row.date)} · <span style={{ color: sync.tone }}>{sync.text}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="icon-btn"
                                            onClick={() => handleDelete(row.date)}
                                            aria-label={`Remove check-in for ${formatEntryDate(row.date)}`}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
