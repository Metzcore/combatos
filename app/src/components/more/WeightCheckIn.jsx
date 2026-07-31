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
        <div className="card" style={{ marginTop: 20 }}>
            <div className="section-header green">⚖️ Weight check-in</div>
            <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {WEIGHT_UNITS.map(u => (
                        <button
                            key={u}
                            type="button"
                            onClick={() => changeUnit(u)}
                            aria-pressed={unit === u}
                            style={{
                                flex: 1, minHeight: 40,
                                background: unit === u ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--panel)',
                                color: unit === u ? 'var(--accent)' : 'var(--label)',
                                border: `1px solid ${unit === u ? 'var(--accent)' : 'var(--divider)'}`,
                                borderRadius: 'var(--radius-md)',
                                textTransform: 'uppercase', fontSize: '0.8rem',
                            }}
                        >
                            {u}
                        </button>
                    ))}
                </div>

                <label htmlFor="weightInput" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 4, display: 'block' }}>
                    {todayRow ? "Today's check-in" : 'Log today'}
                </label>
                <input
                    id="weightInput"
                    type="text"
                    inputMode="decimal"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={unit === 'kg' ? '81.6' : '180.0'}
                    style={{ width: '100%', padding: '10px' }}
                />
                {error && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--alert)', marginTop: 6 }}>{error}</div>
                )}

                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={busy}
                    style={{ width: '100%', marginTop: 10 }}
                >
                    {busy ? 'Saving…' : todayRow ? 'UPDATE CHECK-IN' : 'SAVE CHECK-IN'}
                </button>

                {rows.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 14 }}>
                        No check-ins yet.
                    </p>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            Recent check-ins
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {rows.slice(0, 8).map(row => {
                                const sync = syncLabel(row)
                                return (
                                    <div key={row.date} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', gap: 10,
                                        background: 'var(--bg)', padding: '10px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                                                {formatWeight(row.kg, unit)}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>
                                                {formatEntryDate(row.date)} · <span style={{ color: sync.tone }}>{sync.text}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(row.date)}
                                            aria-label={`Remove check-in for ${formatEntryDate(row.date)}`}
                                            style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: '1.1rem', cursor: 'pointer', flex: '0 0 auto' }}
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
