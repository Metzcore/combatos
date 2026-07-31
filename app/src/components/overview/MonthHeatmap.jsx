import { useMemo, useState } from 'react'
import { buildMonthHeatmap } from '../../utils/logOverview.js'

/**
 * MonthHeatmap — W26 Overview panel (a). Thin renderer over
 * buildMonthHeatmap(): every bucket, count, and isFuture/isToday flag comes
 * from the utility; this component only draws them. If the utility's output
 * looks wrong, the fix belongs there, not here.
 *
 * Every cell state carries BOTH colour and a glyph (S/C/O/R) — colour alone
 * is inaccessible to a colourblind user, the same reason the hip-score dots
 * carry a number. The legend under the grid states what each colour/glyph
 * means; nothing on this panel should leave the user guessing.
 *
 * Tapping (W26 follow-ups 1–2): ANY cell with at least one session is
 * tappable and reveals the day's own breakdown (from cell.counts) in the
 * neutral caption line under the grid — same toggle/switch selection
 * behaviour as CompletenessTrend one panel below. The corner dot marks
 * "more than one session on this day" — extra information, not the tap
 * affordance — and is a wordless dot, never a numeral (a bare digit on a
 * coloured cell reads as a score and collides with the retired hip-score
 * convention). Empty and future cells stay purely visual: there is
 * genuinely nothing to reveal.
 *
 * Colour vs. neutral (this round's fix): colour is reserved for WHAT was
 * trained (BUCKET_STYLE fills, mirroring the History tab's badges — never
 * touched here). Today, selected, and the multi-session dot are UI STATE
 * about a cell, not a training fact, so they're all rendered in
 * var(--text) and told apart by shape/style (solid ring vs. dashed
 * outline vs. dot) instead of hue — see TODAY_RING_SHADOW and
 * MULTI_SESSION_DOT_STYLE below, which are also the source for the
 * "markers" legend group so the key can never drift from the grid.
 */

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_HEADER = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Fill + glyph per bucket. rest/recovery share the dim treatment.
const BUCKET_STYLE = {
    sc: { background: 'var(--primary)', color: 'var(--bg)', glyph: 'S', name: 'S&C' },
    combat: { background: 'var(--alert)', color: 'var(--bg)', glyph: 'C', name: 'Combat' },
    other: { background: 'var(--warn)', color: 'var(--bg)', glyph: 'O', name: 'Other' },
    rest: { background: 'var(--divider)', color: 'var(--dim)', glyph: 'R', name: 'Rest' },
    recovery: { background: 'var(--divider)', color: 'var(--dim)', glyph: 'R', name: 'Recovery' },
}

// The legend reuses BUCKET_STYLE's colours/glyphs — never restated here.
// Rest and Recovery share one entry because they already share a treatment.
const LEGEND_ENTRIES = [
    { bucket: 'sc', name: 'S&C' },
    { bucket: 'combat', name: 'Combat' },
    { bucket: 'other', name: 'Other' },
    { bucket: 'rest', name: 'Rest / Recovery' },
]

// Cell markers are UI STATE, not a training category — neutral colour only,
// shape/style carries the meaning instead of hue. These constants are the
// single source of truth for both the grid marks and their legend swatches
// below, so the two can never drift apart.
const TODAY_RING_SHADOW = '0 0 0 2px var(--text)' // solid ring, closest to the cell
const MULTI_SESSION_DOT_STYLE = {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--text)',
    boxShadow: '0 0 0 1px var(--bg)',
}

// Today as the write path and the utilities produce it.
function todayString() {
    return new Date().toISOString().slice(0, 10)
}

// 'YYYY-MM-DD' → 'Jul 6' — string split only, never Date parsing.
function formatShort(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number)
    return `${MONTHS_SHORT[m - 1]} ${d}`
}

// "Jul 30 — 5 sessions: S&C x4, Combat x1" — zero-count categories omitted,
// same shape as the month summary line. An unrecognized-category session
// counts toward sessionCount but no key in cell.counts, so a day of only
// unrecognized sessions honestly shows the bare "N session(s)" head.
function dayBreakdownCaption(cell) {
    const parts = []
    if (cell.counts.sc > 0) parts.push(`S&C x${cell.counts.sc}`)
    if (cell.counts.combat > 0) parts.push(`Combat x${cell.counts.combat}`)
    if (cell.counts.other > 0) parts.push(`Other x${cell.counts.other}`)
    if (cell.counts.rest > 0) parts.push(`Rest x${cell.counts.rest}`)
    if (cell.counts.recovery > 0) parts.push(`Recovery x${cell.counts.recovery}`)
    const head = `${formatShort(cell.date)} — ${cell.sessionCount} session${cell.sessionCount !== 1 ? 's' : ''}`
    return parts.length > 0 ? `${head}: ${parts.join(', ')}` : head
}

function Cell({ cell, isSelected, onSelect }) {
    if (cell === null) return <div /> // adjacent-month padding renders nothing

    // Any day with a logged session has something to reveal.
    const tappable = cell.sessionCount >= 1

    const base = {
        position: 'relative',
        aspectRatio: '1',
        // 48px floor (same as the month-nav buttons): on narrow phones the
        // 1:1 width lands ~45px, which is under a comfortable tap target.
        // Applied to every cell so grid rows stay uniform.
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.7rem',
        fontWeight: 700,
        ...(tappable ? { width: '100%', padding: 0 } : {}),
    }

    let style
    let content = null
    let label
    if (cell.bucket !== null) {
        const b = BUCKET_STYLE[cell.bucket]
        style = { ...base, background: b.background, color: b.color }
        content = b.glyph
        label = `${cell.date}: ${b.name}`
    } else if (cell.sessionCount > 0) {
        // Logged, but the category is unrecognized — honestly "something was
        // logged", never guessed into a bucket. Neutral fill, no glyph.
        style = { ...base, background: 'var(--input)', border: '1px solid var(--divider)' }
        label = `${cell.date}: session logged (category unrecognized)`
    } else if (cell.isFuture) {
        // An unreached day is flat/neutral — never drawn as a missed one.
        style = { ...base, background: 'var(--panel)' }
        label = `${cell.date}: upcoming`
    } else {
        // Past/today with no session: empty outline — absence rendered as
        // absence, not failure.
        style = { ...base, border: '1px solid var(--divider)' }
        label = `${cell.date}: no session`
    }

    // Today and selected are both neutral UI markers, distinguished from
    // each other by SHAPE/STYLE, never by hue — a solid ring (box-shadow,
    // flush to the cell) for today, a dashed outline (offset outward) for
    // selected. The two live on independent CSS properties, so a cell that
    // is both today AND selected renders both at once without merging into
    // one thicker ring.
    if (cell.isToday) style.boxShadow = TODAY_RING_SHADOW // position marker, not celebration
    if (isSelected) {
        style.outline = '2px dashed var(--text)'
        style.outlineOffset = '2px'
    }

    // "More than one session" marker: a solid dot, never a digit. It is
    // extra information, NOT the tap affordance — every cell with a session
    // is tappable. Distinct from the today ring (a corner point vs. a ring).
    const dot = cell.sessionCount > 1 && (
        <span
            aria-hidden="true"
            style={{
                position: 'absolute', top: 3, right: 3,
                ...MULTI_SESSION_DOT_STYLE,
            }}
        />
    )

    if (!tappable) {
        return (
            <div style={style} role="img" aria-label={label}>
                {content}
            </div>
        )
    }

    return (
        <button
            type="button"
            style={style}
            onClick={() => onSelect(cell.date)}
            aria-pressed={isSelected}
            aria-label={cell.sessionCount > 1
                ? `${label} — ${cell.sessionCount} sessions, tap for breakdown`
                : `${label} — tap for breakdown`}
        >
            {content}
            {dot}
        </button>
    )
}

export default function MonthHeatmap({ sessions }) {
    const [todayStr] = useState(todayString)
    const [yearMonth, setYearMonth] = useState(() => ({
        year: Number(todayStr.slice(0, 4)),
        month: Number(todayStr.slice(5, 7)),
    }))
    const [selectedDate, setSelectedDate] = useState(null)

    const heatmap = useMemo(
        () => buildMonthHeatmap(sessions, { year: yearMonth.year, month: yearMonth.month, todayStr }),
        [sessions, yearMonth, todayStr]
    )

    const shiftMonth = delta => {
        setSelectedDate(null) // selection is per-visible-month
        setYearMonth(({ year, month }) => {
            const m = month + delta
            if (m < 1) return { year: year - 1, month: 12 }
            if (m > 12) return { year: year + 1, month: 1 }
            return { year, month: m }
        })
    }

    // Same toggle/switch behaviour as CompletenessTrend's bar selection.
    const toggleSelect = date => setSelectedDate(prev => (prev === date ? null : date))

    const selectedCell = selectedDate
        ? heatmap.weeks.flat().find(c => c !== null && c.date === selectedDate) ?? null
        : null

    const { counts } = heatmap
    const summaryParts = []
    if (counts.total > 0) summaryParts.push(`${counts.total} session${counts.total !== 1 ? 's' : ''}`)
    if (counts.sc > 0) summaryParts.push(`S&C ${counts.sc}`)
    if (counts.combat > 0) summaryParts.push(`Combat ${counts.combat}`)
    if (counts.other > 0) summaryParts.push(`Other ${counts.other}`)
    if (counts.rest > 0) summaryParts.push(`Rest ${counts.rest}`)
    if (counts.recovery > 0) summaryParts.push(`Recovery ${counts.recovery}`)

    const navButtonStyle = {
        minWidth: 48,
        minHeight: 48,
        background: 'var(--panel)',
        color: 'var(--label)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '1.1rem',
        padding: '0 14px',
    }

    return (
        <section aria-label="Monthly calendar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <button
                    type="button"
                    style={navButtonStyle}
                    onClick={() => shiftMonth(-1)}
                    aria-label="Previous month"
                >
                    ‹
                </button>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {MONTH_NAMES[heatmap.month - 1]} {heatmap.year}
                </div>
                <button
                    type="button"
                    style={navButtonStyle}
                    onClick={() => shiftMonth(1)}
                    aria-label="Next month"
                >
                    ›
                </button>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', textAlign: 'center', marginBottom: 8 }}>
                Each square is a day — tap a filled one to see what was trained.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {WEEKDAY_HEADER.map((d, i) => (
                    <div
                        key={i}
                        aria-hidden="true"
                        style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--dim)', paddingBottom: 2 }}
                    >
                        {d}
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {heatmap.weeks.flat().map((cell, i) => (
                    <Cell
                        key={cell ? cell.date : `pad-${i}`}
                        cell={cell}
                        isSelected={cell !== null && cell.date === selectedDate}
                        onSelect={toggleSelect}
                    />
                ))}
            </div>

            {/* Legend: the key to the cell colours/glyphs, in their own
                colours, straight from BUCKET_STYLE. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', marginTop: 10 }}>
                {LEGEND_ENTRIES.map(entry => {
                    const b = BUCKET_STYLE[entry.bucket]
                    return (
                        <span key={entry.bucket} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span
                                aria-hidden="true"
                                style={{
                                    width: 14, height: 14, borderRadius: 3,
                                    background: b.background, color: b.color,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.6rem', fontWeight: 700,
                                }}
                            >
                                {b.glyph}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>{entry.name}</span>
                        </span>
                    )
                })}
            </div>

            {/* Legend, part 2: what the neutral marks on a cell mean — these
                are UI state (today / multi-session), not training categories,
                so they get their own quiet group, visually separate from the
                colour key above. Swatches reuse the exact same style values
                as the grid marks (TODAY_RING_SHADOW / MULTI_SESSION_DOT_STYLE)
                so this can never fall out of sync with what's rendered. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', marginTop: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span aria-hidden="true" style={{ ...MULTI_SESSION_DOT_STYLE, position: 'relative' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Multiple sessions</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span
                        aria-hidden="true"
                        style={{ width: 14, height: 14, borderRadius: 'var(--radius-sm)', boxShadow: TODAY_RING_SHADOW }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Today</span>
                </span>
            </div>

            {/* Selected-day caption: neutral and transient — one day, not the
                month. Reserved-height slot so the grid never shifts. */}
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text)', minHeight: '1.2em', textAlign: 'center' }}>
                {selectedCell ? dayBreakdownCaption(selectedCell) : ''}
            </div>

            {/* Month scope is always explicit — never a bare list of numbers
                that could be misread as part of the day caption. */}
            <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--dim)', textAlign: 'center' }}>
                {MONTH_NAMES[heatmap.month - 1].toUpperCase()} TOTAL
                {summaryParts.length > 0 ? ` · ${summaryParts.join(' · ')}` : ' · No sessions logged'}
            </div>
        </section>
    )
}
