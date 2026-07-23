import { useEffect, useMemo, useState } from 'react'
import { formatCartridgeTag } from '../utils/cartridgeLibrary.js'
import {
    blockKindLabel,
    blockKindColor,
    formatPrescription,
    formatPair,
} from '../utils/cartridgeFormat.js'

const DAY_TYPE_LABEL = {
    rest: 'Rest',
    recovery: 'Recovery',
    custom: 'Custom / Free-form',
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
                    {item.perRound.map((line, index) => <li key={index}>{line}</li>)}
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
    conditioning: ConditioningItem,
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
                className="cartridge-day__toggle card__toggle"
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
                    {day.blocks.map((block, index) => <BlockSection key={index} block={block} />)}
                </div>
            </div>
        </div>
    )
}

/**
 * Shared read-only cartridge presentation used by Plan and Library detail.
 * Account state, navigation and activation stay in the owning screen.
 */
export default function ProgramOverview({ cartridge, statusLabel }) {
    const [openDays, setOpenDays] = useState(() => new Set())
    const [aboutOpen, setAboutOpen] = useState(false)
    const sortedDays = useMemo(
        () => [...cartridge.days].sort((a, b) => a.day - b.day),
        [cartridge]
    )
    const cycleBlocks = Array.isArray(cartridge.cycle?.blocks) ? cartridge.cycle.blocks : []
    const descriptionParagraphs = typeof cartridge.description === 'string'
        ? cartridge.description.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
        : []

    useEffect(() => {
        setOpenDays(new Set())
        setAboutOpen(false)
        window.scrollTo(0, 0)
    }, [cartridge.cartridgeId])

    const toggleDay = (dayNumber) => setOpenDays((previous) => {
        const next = new Set(previous)
        if (next.has(dayNumber)) next.delete(dayNumber)
        else next.add(dayNumber)
        return next
    })

    return (
        <>
            <section className="library-detail__hero">
                <div className="library-detail__status">{statusLabel}</div>
                <h2>{cartridge.label}</h2>
                <p>{cartridge.summary}</p>
                <div className="library-detail__facts">
                    <span>{cartridge.cycle?.dayCount ?? cartridge.days.length}-day cycle</span>
                    {cartridge.cycle?.weeksPerBlock && (
                        <span>{cartridge.cycle.weeksPerBlock}-week block</span>
                    )}
                </div>
                {cycleBlocks.length > 0 && (
                    <div className="library-detail__phases" aria-label="Program phases">
                        {cycleBlocks.map((block) => <span key={block.id}>{block.label}</span>)}
                    </div>
                )}
            </section>

            <section className="library-detail__section">
                <h3>What this helps you build</h3>
                <ul className="library-outcomes">
                    {cartridge.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
                </ul>
            </section>

            <section className="library-detail__section">
                <h3>Equipment</h3>
                {cartridge.requirements.equipment.length > 0 ? (
                    <ul className="library-equipment">
                        {cartridge.requirements.equipment.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                ) : (
                    <p className="library-equipment-empty">No specific equipment required.</p>
                )}
            </section>

            <section className="library-detail__section">
                <h3>Focus</h3>
                <div className="library-detail__tags">
                    {cartridge.tags.map((tag) => (
                        <span key={tag}>{formatCartridgeTag(tag)}</span>
                    ))}
                </div>
            </section>

            {descriptionParagraphs.length > 0 && (
                <div className={`card card--collapsible cartridge-about${aboutOpen ? ' open' : ''}`}>
                    <button
                        type="button"
                        className="cartridge-about__toggle"
                        onClick={() => setAboutOpen((value) => !value)}
                        aria-expanded={aboutOpen}
                    >
                        <span>How this program works</span>
                        <span className="card__chevron" aria-hidden="true">▾</span>
                    </button>
                    <div className="card__body">
                        <div className="cartridge-about__text">
                            {descriptionParagraphs.map((paragraph, index) => (
                                <p key={`${cartridge.cartridgeId}-description-${index}`}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <section className="library-week" aria-labelledby={`${cartridge.cartridgeId}-week-title`}>
                <div className="library-week__heading">
                    <h3 id={`${cartridge.cartridgeId}-week-title`}>Program week</h3>
                    <span>Tap a day to inspect it</span>
                </div>
                {sortedDays.map((day) => (
                    <DayCard
                        key={day.day}
                        day={day}
                        open={openDays.has(day.day)}
                        onToggle={() => toggleDay(day.day)}
                    />
                ))}
            </section>
        </>
    )
}
