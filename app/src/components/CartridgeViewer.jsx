/**
 * CartridgeViewer.jsx — read-only browser for block-model program cartridges
 * (PROGRAM-CARTRIDGE-SPEC.md v2, Track A / Stage-2).
 *
 * Renders the bundled cartridges (app/src/data/cartridges/) day-by-day,
 * block-by-block. This is deliberately READ-ONLY: no logging, no Dexie/db
 * writes, no touch to HUD.jsx or the session/webhook path. It exists so the
 * developer can see their real authored programs live in the app before the
 * interactive renderer (which needs the still-open W26 payload-shape
 * decision) is built.
 *
 * Visual language mirrors the shipped PlaybookViewer.jsx (same card /
 * section-header / page-header classes) rather than the input-heavy
 * StrengthBlock.jsx, since this is a browsing surface, not a logging one.
 */
import { useState, useMemo, useEffect } from 'react'
import CARTRIDGES from '../data/cartridges/index.js'
import { blockKindLabel, blockKindColor, formatPrescription, formatPair } from '../utils/cartridgeFormat.js'

const DAY_TYPE_LABEL = {
    rest: 'Rest',
    recovery: 'Recovery',
    custom: 'Custom / Free-form'
}

function MobilityItem({ item }) {
    return (
        <div className="cartridge-item">
            <div className="cartridge-item-name">{item.name}</div>
            <div className="cartridge-item-meta">
                <span><strong>Dose:</strong> {item.dose}</span>
                {item.note && <span><strong>Note:</strong> {item.note}</span>}
            </div>
            {item.cue && <div className="cartridge-item-cue">💡 {item.cue}</div>}
        </div>
    )
}

function StrengthItem({ item }) {
    const rx = formatPrescription(item.prescription)
    const pair = formatPair(item.pair)
    return (
        <div className="cartridge-item">
            <div className="cartridge-item-name">
                {item.name}
                {item.superset && <span className="cartridge-superset-badge"> · Superset {item.superset}</span>}
            </div>
            <div className="cartridge-item-meta">
                {item.target && <span><strong>Target:</strong> {item.target}</span>}
                <span><strong>Sets:</strong> {item.sets} × {item.reps}</span>
                {rx && <span><strong>Load:</strong> {rx}</span>}
            </div>
            {pair && <div className="cartridge-pap">⚡ PAP: {pair}</div>}
            {item.cue && <div className="cartridge-item-cue">💡 {item.cue}</div>}
        </div>
    )
}

function ConditioningItem({ item }) {
    return (
        <div className="cartridge-item">
            <div className="cartridge-item-name">{item.name}</div>
            <div className="cartridge-item-meta">
                <span><strong>Rounds:</strong> {item.rounds}{item.roundLength ? ` × ${item.roundLength}` : ''}</span>
                {item.rest && <span><strong>Rest:</strong> {item.rest}</span>}
            </div>
            {Array.isArray(item.perRound) && item.perRound.length > 0 && (
                <ul className="cartridge-perround">
                    {item.perRound.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
            )}
            {item.cue && <div className="cartridge-item-cue">💡 {item.cue}</div>}
        </div>
    )
}

const ITEM_RENDERERS = {
    mobility: MobilityItem,
    cooldown: MobilityItem,
    strength: StrengthItem,
    core: StrengthItem,
    conditioning: ConditioningItem
}

function BlockSection({ block }) {
    const ItemComponent = ITEM_RENDERERS[block.kind] || StrengthItem
    return (
        <div className={`cartridge-block cartridge-block--${blockKindColor(block.kind)}`}>
            <div className="cartridge-block__head">
                {block.label || blockKindLabel(block.kind)}
            </div>
            <div className="cartridge-block__items">
                {block.items.map((item) => (
                    <div key={item.id} className="cartridge-block__item">
                        <ItemComponent item={item} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function isTrainingDay(day) {
    return day.type === 'training' && Array.isArray(day.blocks) && day.blocks.length > 0
}

function DayCard({ day, open, onToggle }) {
    // Rest / recovery / custom days carry no blocks — a slim static row reads
    // better than a collapsible with one trivial line inside.
    if (!isTrainingDay(day)) {
        return (
            <div className="card cartridge-day cartridge-day--rest">
                <div className="cartridge-day__rest-row">
                    <span className="cartridge-day__rest-label">{day.label || `Day ${day.day}`}</span>
                    <span className="cartridge-day__rest-type">{DAY_TYPE_LABEL[day.type] || day.type}</span>
                </div>
            </div>
        )
    }

    const blockCount = day.blocks.length
    return (
        <div className={`card card--collapsible cartridge-day${open ? ' open' : ''}`}>
            <button
                type="button"
                className="section-header red card__toggle"
                onClick={onToggle}
                aria-expanded={open}
            >
                <span className="cartridge-day__title">{day.label || `Day ${day.day}`}</span>
                <span className="card__summary">{blockCount} block{blockCount === 1 ? '' : 's'}</span>
                <span className="card__chevron" aria-hidden="true">▾</span>
            </button>
            <div className="card__body">
                <div className="cartridge-day__body">
                    {day.focus && <div className="cartridge-day__focus">{day.focus}</div>}
                    {day.blocks.map((block, i) => <BlockSection key={i} block={block} />)}
                </div>
            </div>
        </div>
    )
}

export default function CartridgeViewer() {
    const [activeId, setActiveId] = useState(CARTRIDGES[0]?.cartridgeId)
    const [openDays, setOpenDays] = useState(() => new Set())
    const [aboutOpen, setAboutOpen] = useState(false)

    const active = useMemo(() => CARTRIDGES.find((c) => c.cartridgeId === activeId), [activeId])
    const sortedDays = useMemo(() => (active ? [...active.days].sort((a, b) => a.day - b.day) : []), [active])

    // On cartridge switch: open the first training day only, collapse the rest
    // (and re-collapse the About blob). A user scans the week, then opens a day.
    useEffect(() => {
        const first = sortedDays.find(isTrainingDay)
        setOpenDays(new Set(first ? [first.day] : []))
        setAboutOpen(false)
    }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleDay = (dayNum) => setOpenDays((prev) => {
        const next = new Set(prev)
        if (next.has(dayNum)) next.delete(dayNum)
        else next.add(dayNum)
        return next
    })

    if (!active) {
        return (
            <div className="app">
                <header className="page-header"><h1>Cartridges</h1></header>
                <div className="content">No cartridges bundled yet.</div>
            </div>
        )
    }

    return (
        <div className="app">
            <header className="page-header" style={{ marginBottom: 12 }}>
                <h1>Cartridges</h1>
                <div className="subtitle">PROGRAM LIBRARY</div>
            </header>

            <div className="selector-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {CARTRIDGES.map((c) => (
                    <button
                        key={c.cartridgeId}
                        className={activeId === c.cartridgeId ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveId(c.cartridgeId)}
                        style={{ padding: '8px 14px', width: 'auto', fontSize: '0.8rem' }}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            <div className="content" style={{ padding: 0 }}>
                {active.description && (
                    <div className={`card card--collapsible cartridge-about${aboutOpen ? ' open' : ''}`}>
                        <button
                            type="button"
                            className="cartridge-about__toggle"
                            onClick={() => setAboutOpen((v) => !v)}
                            aria-expanded={aboutOpen}
                        >
                            <span>About this program</span>
                            <span className="card__chevron" aria-hidden="true" style={{ marginLeft: 'auto' }}>▾</span>
                        </button>
                        <div className="card__body">
                            <div className="cartridge-about__text">{active.description}</div>
                        </div>
                    </div>
                )}
                {sortedDays.map((day) => (
                    <DayCard
                        key={day.day}
                        day={day}
                        open={openDays.has(day.day)}
                        onToggle={() => toggleDay(day.day)}
                    />
                ))}
            </div>
        </div>
    )
}
