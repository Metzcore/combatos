/**
 * components/today/SupersetGroup.jsx — A7b superset grouping (corrective
 * plan §4, corrective-pass finding C). Groups a strength/core block's items
 * by `item.superset` and renders them in TRUE round order: A1 set1, A2
 * set1, A1 set2, A2 set2, … — never each member's full set list rendered
 * back-to-back. Items with no `superset` render exactly as before (the
 * default, ungrouped `PerformedStrengthItem`), with no wrapper at all.
 *
 * Every member ALWAYS carries a clear A1/A2/… label (not just on mismatch —
 * corrective plan §4). The header states the approved round count and, when
 * members have different set counts, each member's OWN set count (D11
 * ruling 10 + corrective plan §4 — this rule is already approved; nothing
 * new is invented here). A shorter member simply contributes no row once its
 * own rounds are exhausted — never an absent-round placeholder.
 *
 * None of the three shipped cartridges currently author a `superset` field
 * (only `pair`/PAP), so this path is exercised by tests and future
 * cartridges rather than today's real data — it must still behave
 * correctly the moment one is authored.
 */
import { buildStrengthItemView, StrengthItemHeader, StrengthSetRow, StrengthItemFooter } from './PerformedStrengthItem.jsx'

/** Groups items into runs sharing the same non-empty `superset` label,
 *  preserving each item's original position otherwise. Returns an array of
 *  { label: string|null, items: object[] } — `label` is null for an
 *  ungrouped singleton. */
export function groupItemsBySuperset(items) {
    const list = Array.isArray(items) ? items : []
    const groups = []
    const indexByLabel = new Map()

    for (const item of list) {
        const label = typeof item?.superset === 'string' && item.superset.trim() !== '' ? item.superset : null
        if (label === null) {
            groups.push({ label: null, items: [item] })
            continue
        }
        if (indexByLabel.has(label)) {
            groups[indexByLabel.get(label)].items.push(item)
        } else {
            indexByLabel.set(label, groups.length)
            groups.push({ label, items: [item] })
        }
    }
    return groups
}

/**
 * buildSupersetRounds — pure round-order builder. `items` is a superset
 * group's members IN ORDER (A1, A2, …); `performedByItemId` maps
 * `itemId -> performed state` (`{ sets: [...] }`, the same shape
 * itemStateById[itemId] carries). Returns an array of rounds; each round is
 * an array of `{ itemId, index }` entries, in member order, containing ONLY
 * the members whose own row count (prescribed sets, or more if extra
 * performed sets exist) reaches that round — a shorter/exhausted member
 * contributes nothing for that round, never a placeholder.
 *
 * A member's own row count is `max(prescribedSets, performedSets.length)`
 * — identical to PerformedStrengthItem's standalone `numRows` — so "Add Set"
 * on one member (creating an extra performed entry) or an authored set-count
 * mismatch both participate correctly without special-casing either here.
 *
 * @param {Array<{id: string, sets?: number}>} items
 * @param {Object<string, {sets?: Array}>} performedByItemId
 * @returns {Array<Array<{itemId: string, index: number}>>}
 */
export function buildSupersetRounds(items, performedByItemId) {
    const list = Array.isArray(items) ? items : []
    const perMember = list.map((item) => {
        const prescribedSets = typeof item?.sets === 'number' ? item.sets : 0
        const performed = performedByItemId && item ? performedByItemId[item.id] : undefined
        const performedSets = Array.isArray(performed?.sets) ? performed.sets : []
        return { itemId: item?.id, numRows: Math.max(prescribedSets, performedSets.length) }
    })
    const maxRounds = perMember.reduce((max, m) => Math.max(max, m.numRows), 0)

    const rounds = []
    for (let r = 0; r < maxRounds; r++) {
        const round = []
        for (const member of perMember) {
            if (r < member.numRows) round.push({ itemId: member.itemId, index: r })
        }
        rounds.push(round)
    }
    return rounds
}

export default function SupersetGroup({
    items, renderItem, onAddRound,
    itemStateById, substitutions, itemNotes, getLastPerformance,
    onSetField, onPairSetField, onAddSet, onUseLastValues, onSubstitute, onItemNote,
}) {
    const groups = groupItemsBySuperset(items)

    return (
        <>
            {groups.map((group, groupIndex) => {
                if (group.label === null) {
                    return <div key={group.items[0]?.id ?? groupIndex}>{renderItem(group.items[0])}</div>
                }

                const performedByItemId = {}
                for (const it of group.items) performedByItemId[it.id] = itemStateById?.[it.id]

                const rounds = buildSupersetRounds(group.items, performedByItemId)
                const memberLabelByItemId = {}
                group.items.forEach((it, i) => { memberLabelByItemId[it.id] = `${group.label}${i + 1}` })

                const setCounts = group.items.map((it) => (typeof it.sets === 'number' ? it.sets : null))
                const mismatched = new Set(setCounts.filter((c) => c != null)).size > 1

                const viewByItemId = {}
                for (const it of group.items) {
                    viewByItemId[it.id] = buildStrengthItemView(
                        it, itemStateById?.[it.id], substitutions?.[it.id],
                        getLastPerformance ? getLastPerformance(it.id) : null,
                    )
                }

                return (
                    <div className="superset-group" key={`superset-${group.label}-${groupIndex}`}>
                        <div className="superset-group__head">
                            <span>SUPERSET {group.label} · {rounds.length} ROUND{rounds.length === 1 ? '' : 'S'}</span>
                            {mismatched && (
                                <span className="superset-group__counts">
                                    {group.items.map((it, i) => `${group.label}${i + 1}: ${it.sets} sets`).join(' · ')}
                                </span>
                            )}
                        </div>

                        {group.items.map((item) => (
                            <div key={`header-${item.id}`} className="superset-group__member-header">
                                <StrengthItemHeader
                                    item={item}
                                    view={viewByItemId[item.id]}
                                    memberLabel={memberLabelByItemId[item.id]}
                                    substitutedName={substitutions?.[item.id]}
                                    onUseLastValues={(sets) => onUseLastValues(item.id, sets)}
                                />
                            </div>
                        ))}

                        {rounds.map((round, ri) => (
                            <div className="superset-group__round" key={`round-${ri}`}>
                                <div className="superset-group__round-label">ROUND {ri + 1}</div>
                                {round.map(({ itemId, index }) => {
                                    const item = group.items.find((it) => it.id === itemId)
                                    const view = viewByItemId[itemId]
                                    return (
                                        <StrengthSetRow
                                            key={`${itemId}-${index}`}
                                            item={item}
                                            displayName={view.displayName}
                                            entry={view.sets[index] || {}}
                                            index={index}
                                            prescribedSets={view.prescribedSets}
                                            effortKind={view.effortKind}
                                            memberLabel={memberLabelByItemId[itemId]}
                                            onSetChange={(setIndex, field, value) => onSetField(itemId, setIndex, field, value)}
                                        />
                                    )
                                })}
                            </div>
                        ))}

                        {group.items.map((item) => (
                            <div key={`footer-${item.id}`} className="superset-group__member-footer">
                                <StrengthItemFooter
                                    item={item}
                                    view={viewByItemId[item.id]}
                                    onAddSet={() => onAddSet(item.id)}
                                    onPairSetChange={(setIndex, field, value) => onPairSetField(item.id, setIndex, field, value)}
                                    onSubstitute={(name) => onSubstitute(item.id, name)}
                                    substitutedName={substitutions?.[item.id]}
                                    note={itemNotes?.[item.id]}
                                    onNoteChange={(value) => onItemNote(item.id, value)}
                                />
                            </div>
                        ))}

                        {onAddRound && (
                            <button
                                type="button"
                                className="today-item__action-btn"
                                onClick={() => onAddRound(group.items.map((it) => it.id))}
                            >
                                + Add round
                            </button>
                        )}
                    </div>
                )
            })}
        </>
    )
}
