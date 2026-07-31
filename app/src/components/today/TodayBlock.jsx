/**
 * components/today/TodayBlock.jsx — A7b interactive block renderer
 * (corrective plan §4). The performed-value twin of ProgramOverview.jsx's
 * read-only BlockSection — same five block kinds, same quiet sub-header
 * styling, but strength/core items take real input and are grouped by
 * `item.superset` when present. Real open/onToggle wiring against
 * `cartridgeBlockOpen`, keyed by block index within the frozen day (stable
 * for the session's lifetime since the day is frozen at Start/Continue).
 */
import { blockKindLabel, blockKindColor } from '../../utils/cartridgeFormat.js'
import SupersetGroup from './SupersetGroup.jsx'
import PerformedHoldItem from './PerformedHoldItem.jsx'
import PerformedStrengthItem from './PerformedStrengthItem.jsx'
import PerformedConditioningItem from './PerformedConditioningItem.jsx'

export default function TodayBlock({
    block, open, onToggle,
    itemStateById, substitutions, itemNotes, getLastPerformance,
    onSetField, onPairSetField, onAddSet, onRemoveSet, onAddRound, onUseLastValues,
    onSubstitute, onItemNote,
}) {
    const renderItem = (item) => {
        const performed = itemStateById[item.id]
        const substitutedName = substitutions[item.id]
        const note = itemNotes[item.id]

        if (block.kind === 'mobility' || block.kind === 'cooldown') {
            return (
                <PerformedHoldItem
                    item={item} substitutedName={substitutedName}
                    onSubstitute={(name) => onSubstitute(item.id, name)}
                    note={note} onNoteChange={(value) => onItemNote(item.id, value)}
                />
            )
        }
        if (block.kind === 'strength' || block.kind === 'core') {
            return (
                <PerformedStrengthItem
                    item={item} performed={performed} substitutedName={substitutedName}
                    lastPerformance={getLastPerformance(item.id)}
                    onSetChange={(setIndex, field, value) => onSetField(item.id, setIndex, field, value)}
                    onPairSetChange={(setIndex, field, value) => onPairSetField(item.id, setIndex, field, value)}
                    onAddSet={() => onAddSet(item.id)}
                    onRemoveSet={(setIndex, prescribedSets) => onRemoveSet(item.id, setIndex, prescribedSets)}
                    onUseLastValues={(sets) => onUseLastValues(item.id, sets)}
                    onSubstitute={(name) => onSubstitute(item.id, name)}
                    note={note} onNoteChange={(value) => onItemNote(item.id, value)}
                />
            )
        }
        if (block.kind === 'conditioning') {
            return (
                <PerformedConditioningItem
                    item={item} substitutedName={substitutedName}
                    onSubstitute={(name) => onSubstitute(item.id, name)}
                    note={note} onNoteChange={(value) => onItemNote(item.id, value)}
                />
            )
        }
        return null
    }

    const isGroupable = block.kind === 'strength' || block.kind === 'core'

    return (
        <div className={`card card--collapsible cartridge-block cartridge-block--${blockKindColor(block.kind)}${open ? ' open' : ''}`}>
            <button type="button" className="cartridge-block__head card__toggle" onClick={onToggle} aria-expanded={open}>
                <span>{block.label || blockKindLabel(block.kind)}</span>
                <span className="card__chevron" aria-hidden="true">▾</span>
            </button>
            <div className="card__body">
                <div className="cartridge-block__items">
                    {isGroupable ? (
                        <SupersetGroup
                            items={block.items} renderItem={renderItem} onAddRound={onAddRound}
                            itemStateById={itemStateById} substitutions={substitutions} itemNotes={itemNotes}
                            getLastPerformance={getLastPerformance}
                            onSetField={onSetField} onPairSetField={onPairSetField} onAddSet={onAddSet}
                            onRemoveSet={onRemoveSet}
                            onUseLastValues={onUseLastValues} onSubstitute={onSubstitute} onItemNote={onItemNote}
                        />
                    ) : (
                        block.items.map((item) => (
                            <div key={item.id} className="cartridge-block__item">{renderItem(item)}</div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
