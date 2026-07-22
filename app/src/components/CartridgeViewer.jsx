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
import { useState, useMemo } from 'react'
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
        <div className="cartridge-block">
            <div className={`section-header ${blockKindColor(block.kind)}`} style={{ fontSize: '0.85rem' }}>
                {block.label || blockKindLabel(block.kind)}
            </div>
            <div style={{ padding: 12 }}>
                {block.items.map((item) => (
                    <div key={item.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--divider)' }}>
                        <ItemComponent item={item} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function DayCard({ day }) {
    const isTraining = day.type === 'training' && Array.isArray(day.blocks) && day.blocks.length > 0
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-header red" style={{ fontSize: '0.9rem' }}>
                {day.label || `Day ${day.day}`}
                {!isTraining && <span style={{ float: 'right', color: 'var(--dim)' }}>{DAY_TYPE_LABEL[day.type] || day.type}</span>}
            </div>
            <div style={{ padding: 12 }}>
                {day.focus && <div style={{ color: 'var(--label)', fontSize: '0.85rem', marginBottom: isTraining ? 12 : 0 }}>{day.focus}</div>}
                {isTraining && day.blocks.map((block, i) => <BlockSection key={i} block={block} />)}
            </div>
        </div>
    )
}

export default function CartridgeViewer() {
    const [activeId, setActiveId] = useState(CARTRIDGES[0]?.cartridgeId)
    const active = useMemo(() => CARTRIDGES.find((c) => c.cartridgeId === activeId), [activeId])
    const sortedDays = useMemo(() => (active ? [...active.days].sort((a, b) => a.day - b.day) : []), [active])

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
                <div className="card" style={{ marginBottom: 16, padding: 12 }}>
                    <div style={{ color: 'var(--label)', fontSize: '0.85rem', lineHeight: 1.5 }}>{active.description}</div>
                </div>
                {sortedDays.map((day) => <DayCard key={day.day} day={day} />)}
            </div>
        </div>
    )
}
