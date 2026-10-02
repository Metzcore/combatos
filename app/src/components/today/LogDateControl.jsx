/**
 * components/today/LogDateControl.jsx — W34 "Logging for" control: Today ·
 * Yesterday · Pick a date (a native date input bounded by min/max).
 *
 * Presentation only. Every decision (UTC today, the 14-day window, labels)
 * comes from utils/logDate.js. `value` is the provider-held selection:
 * null = Today (no override); a string = an explicit past day. A cleared
 * native input reports '' and is stored as-is — resolveLogDate rejects it
 * at FINISH with a specific message rather than guessing a date here.
 */
import { useState } from 'react'
import { getLogDateRange, utcYesterdayStr, formatLogDateLabel } from '../../utils/logDate.js'

export default function LogDateControl({ value, onChange }) {
    const now = new Date()
    const { min, max } = getLogDateRange(now)
    const yesterday = utcYesterdayStr(now)

    // Picker mode is local UI state; derived on remount from the held value,
    // so a hub switch (which unmounts this) restores the picker view.
    const [pickOpen, setPickOpen] = useState(value != null && value !== yesterday)
    const showPicker = pickOpen || (value != null && value !== yesterday)

    const isToday = value == null && !showPicker
    const isYesterday = value === yesterday && !showPicker

    const chooseToday = () => { setPickOpen(false); onChange(null) }
    const chooseYesterday = () => { setPickOpen(false); onChange(yesterday) }
    const choosePick = () => { setPickOpen(true); if (value == null) onChange(yesterday) }

    return (
        <div className="today-log-date card" role="group" aria-label="Logging for">
            <div className="today-session-summary__title">Logging for</div>
            <div className="today-log-date__chips">
                <button type="button" className={`today-chip${isToday ? ' today-chip--active' : ''}`}
                    aria-pressed={isToday} onClick={chooseToday}>
                    Today
                </button>
                <button type="button" className={`today-chip${isYesterday ? ' today-chip--active' : ''}`}
                    aria-pressed={isYesterday} onClick={chooseYesterday}>
                    Yesterday
                </button>
                <button type="button" className={`today-chip${showPicker ? ' today-chip--active' : ''}`}
                    aria-pressed={showPicker} onClick={choosePick}>
                    Pick a date
                </button>
            </div>
            {showPicker && (
                <label className="today-log-date__picker" htmlFor="today-log-date-input">
                    Training day (last 14 days)
                    <input
                        id="today-log-date-input" type="date"
                        min={min} max={max}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </label>
            )}
            {value != null && value !== '' && (
                <div className="today-log-date__note">
                    Will be logged as {formatLogDateLabel(value)}. It is recorded as entered now, not on that day.
                </div>
            )}
        </div>
    )
}
