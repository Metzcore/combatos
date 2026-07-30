/**
 * components/today/PerformedStrengthItem.jsx — A7b strength/core item
 * (corrective plan §4). One bounded visual unit per set (SET n / load+reps,
 * then a CONDITIONAL effort row) plus one row per prescribed PAP/pair set
 * (reps only — corrective-pass finding D / D11 point 14).
 *
 * Effort input is conditional on the item's own `prescription`, never both
 * by default: `prescription.rpe` present -> an RPE input; else
 * `prescription.rir` present -> an RIR input; neither -> no effort input at
 * all. `percent` alongside `rpe` still shows only the RPE input (the %1RM
 * text is display-only guidance via `formatPrescription`, schema §9 — never
 * itself a logged field).
 *
 * "Use Last Values" (schema §9, via the pure `resolveUseLastValues` helper)
 * copies only when today's effective exercise name matches the recalled
 * record's, and never beyond the current prescribed slot count — this
 * component never re-implements that rule, only calls the helper. "Add Set"
 * appends one performed entry beyond the prescribed count for asymmetric
 * extra work; utils/cartridgeCompleteness.js already caps completeness at
 * the prescribed count regardless of how many extra entries exist.
 *
 * `lastPerformance` is factual recall only — never a suggested load. The
 * legacy %1RM-derived suggestion (hooks/useHistory.js) is legacy-only and
 * untouched.
 *
 * A7b corrective pass (finding C — true superset round order): the header
 * (name/meta/history/pair/use-last), the per-set unit, and the footer
 * (Add Set/pair rows/Change exercise/note) are exported SEPARATELY
 * (`buildStrengthItemView`, `StrengthItemHeader`, `StrengthSetRow`,
 * `StrengthItemFooter`) so SupersetGroup.jsx can interleave set UNITS across
 * different members in true round order (A1 set1, A2 set1, A1 set2, …)
 * while each member's header/footer still render exactly once. The default
 * export below (used for ungrouped items) composes the same pieces in the
 * original order — a pure extraction, not a behavior change for items with
 * no `superset`.
 */
import { useState } from 'react'
import { formatPrescription } from '../../utils/cartridgeFormat.js'
import { resolveUseLastValues } from '../../utils/lastPerformance.js'
import { hasMeaningfulSetValue } from '../../utils/extraSetState.js'
import ChangeExerciseSheet, { ChangedExerciseNote } from './ChangeExerciseSheet.jsx'
import PowerPairItem from './PowerPairItem.jsx'
import BottomSheet from '../BottomSheet.jsx'
import FocusedNoteEditor from '../FocusedNoteEditor.jsx'
import TodayExerciseReferenceLink from './TodayExerciseReferenceLink.jsx'

function formatLastSet(set) {
    const parts = []
    if (set.kg != null) parts.push(`${set.kg}kg`)
    if (set.reps != null) parts.push(`${set.reps} reps`)
    if (set.rpe != null) parts.push(`RPE ${set.rpe}`)
    if (set.rir != null) parts.push(`RIR ${set.rir}`)
    return parts.join(' · ')
}

/**
 * buildStrengthItemView — pure derivation shared by the header, every set
 * row, and the footer, so all three agree on prescribedSets/numRows/
 * effortKind/etc. without recomputing (or disagreeing) independently.
 */
export function buildStrengthItemView(item, performed, substitutedName, lastPerformance) {
    const displayName = substitutedName || item.name
    const rx = formatPrescription(item.prescription)
    const prescribedSets = typeof item.sets === 'number' ? item.sets : 0
    const hasPair = Boolean(item.pair)
    const pairSets = typeof item.pair?.sets === 'number' ? item.pair.sets : 0

    const sets = performed?.sets || []
    const pairPerformed = performed?.pair?.sets || []
    const numRows = Math.max(prescribedSets, sets.length)

    const prescription = item.prescription || {}
    const effortKind = typeof prescription.rpe === 'number' ? 'rpe'
        : typeof prescription.rir === 'number' ? 'rir'
            : null

    const todayEffectiveName = substitutedName || item.name
    const useLastSets = resolveUseLastValues({
        todayEffectiveName,
        lastRecord: lastPerformance,
        currentPrescribedSetCount: prescribedSets,
    })

    return {
        displayName, rx, prescribedSets, hasPair, pairSets,
        sets, pairPerformed, numRows, effortKind, useLastSets, lastPerformance,
    }
}

/** The name/meta/cue/substitution-note/history/pair/use-last portion —
 *  renders ONCE per member regardless of how many rounds its sets span.
 *  `memberLabel` (e.g. "A1"), when provided, ALWAYS shows a clear member
 *  badge (corrective plan §4: not only on mismatch); otherwise falls back to
 *  the item's own `· Superset X` text for a standalone item that happens to
 *  carry a superset label outside a rendered group (defensive — SupersetGroup
 *  always supplies memberLabel for anything it groups). */
export function StrengthItemHeader({ item, view, memberLabel, onUseLastValues, substitutedName }) {
    const { displayName, rx, lastPerformance, useLastSets } = view
    return (
        <>
            <div className="today-item__header-row">
                <div className="today-item__name">
                    {displayName}
                    {memberLabel
                        ? <span className="today-item__superset-badge today-item__superset-badge--member"> · {memberLabel}</span>
                        : (item.superset && <span className="today-item__superset-badge"> · Superset {item.superset}</span>)}
                </div>
                <TodayExerciseReferenceLink exerciseId={item.exerciseId} substitutedName={substitutedName} />
            </div>
            {item.target && <div className="today-item__meta">Target: {item.target}</div>}
            <div className="today-item__meta">Sets: {item.sets} × {item.reps}{rx ? ` · ${rx}` : ''}</div>
            {item.cue && <div className="today-item__cue">💬 {item.cue}</div>}
            <ChangedExerciseNote performedName={substitutedName} prescribedName={item.name} />

            {lastPerformance && lastPerformance.sets.length > 0 && (
                <div className="history-badge">
                    Last: {lastPerformance.sets.map(formatLastSet).filter(Boolean).join(' / ')}
                </div>
            )}

            <PowerPairItem mainName={displayName} pair={item.pair} />

            {useLastSets && useLastSets.length > 0 && (
                <button type="button" className="today-item__action-btn" onClick={() => onUseLastValues(useLastSets)}>
                    Use last values
                </button>
            )}
        </>
    )
}

/** One bounded "SET n" visual unit — load+reps, then a conditional effort
 *  row. `memberLabel`, when provided (superset round rendering), prefixes
 *  the set head so a row is unambiguous even when interleaved with another
 *  member's rows in the same round block.
 *
 *  Extra-set removal (Android acceptance remediation plan §3.2): a Remove
 *  action appears ONLY on extra units (index >= prescribedSets) — a
 *  prescribed set never displays it, and the CartridgeToday mutator refuses
 *  such an index again on its own. A blank extra removes immediately; a
 *  populated one (numeric 0 counts as populated) first asks through the
 *  shared BottomSheet with explicit Cancel/Remove. The sheet's open/closed
 *  state is local presentation state owned here, exactly as the plan
 *  allows. */
export function StrengthSetRow({ item, displayName, entry, index, prescribedSets, effortKind, onSetChange, memberLabel, onRemoveSet }) {
    const isExtra = index >= prescribedSets
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

    const handleRemove = () => {
        if (!onRemoveSet) return
        if (hasMeaningfulSetValue(entry)) setConfirmRemoveOpen(true)
        else onRemoveSet()
    }

    const confirmRemove = () => {
        setConfirmRemoveOpen(false)
        if (onRemoveSet) onRemoveSet()
    }

    return (
        <>
            <div className="today-set-unit">
                <div className="today-set-unit__head">
                    {memberLabel && <span className="today-set-unit__member">{memberLabel} · </span>}
                    SET {index + 1}{isExtra && <span className="today-set-unit__extra-tag"> extra</span>}
                </div>
                <div className="today-set-unit__row">
                    <input
                        type="number" inputMode="decimal" placeholder="kg" min="0" step="0.5"
                        value={entry.kg ?? ''} onChange={(e) => onSetChange(index, 'kg', e.target.value)}
                        aria-label={`${displayName} set ${index + 1} weight in kg`}
                    />
                    <input
                        type="number" inputMode="numeric" placeholder="reps" min="0" step="1"
                        value={entry.reps ?? ''} onChange={(e) => onSetChange(index, 'reps', e.target.value)}
                        aria-label={`${displayName} set ${index + 1} reps`}
                    />
                </div>
                {effortKind === 'rpe' && (
                    <div className="today-set-unit__row today-set-unit__row--effort">
                        <input
                            type="number" inputMode="decimal" placeholder="RPE" min="0" max="10" step="0.5"
                            value={entry.rpe ?? ''} onChange={(e) => onSetChange(index, 'rpe', e.target.value)}
                            aria-label={`${displayName} set ${index + 1} RPE`}
                        />
                    </div>
                )}
                {effortKind === 'rir' && (
                    <div className="today-set-unit__row today-set-unit__row--effort">
                        <input
                            type="number" inputMode="numeric" placeholder="RIR" min="0" step="1"
                            value={entry.rir ?? ''} onChange={(e) => onSetChange(index, 'rir', e.target.value)}
                            aria-label={`${displayName} set ${index + 1} RIR`}
                        />
                    </div>
                )}
                {isExtra && onRemoveSet && (
                    <button type="button" className="today-set-unit__remove" onClick={handleRemove}>
                        Remove
                    </button>
                )}
            </div>
            <BottomSheet
                open={confirmRemoveOpen}
                onClose={() => setConfirmRemoveOpen(false)}
                title="Remove this extra set?"
            >
                <p className="sheet__copy">
                    The values entered for {displayName} set {index + 1} will be discarded.
                </p>
                <button type="button" className="btn-secondary" onClick={() => setConfirmRemoveOpen(false)}>
                    Cancel
                </button>
                <button type="button" className="sheet__action destructive" onClick={confirmRemove}>
                    Remove
                </button>
            </BottomSheet>
        </>
    )
}

/** Add Set / prescribed-pair rows (reps only — D11 point 14) / Change
 *  exercise / note. Renders ONCE per member, after all of that member's
 *  round-ordered set rows. */
export function StrengthItemFooter({ item, view, onAddSet, onPairSetChange, onSubstitute, substitutedName, note, onNoteChange }) {
    const { displayName, hasPair, pairSets, pairPerformed } = view
    const [subOpen, setSubOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                className="today-item__action-btn today-item__action-btn--amber today-item__action-btn--compact"
                onClick={onAddSet}
            >
                <span className="today-item__action-btn-label">+ Add set</span>
            </button>

            {hasPair && Array.from({ length: pairSets }, (_, i) => {
                const entry = pairPerformed[i] || {}
                return (
                    <div className="today-set-unit today-set-unit--pair" key={`pair-${i}`}>
                        <div className="today-set-unit__head">POWER {i + 1}</div>
                        <div className="today-set-unit__row today-set-unit__row--pair">
                            <input
                                type="number" inputMode="numeric" placeholder="reps" min="0" step="1"
                                value={entry.reps ?? ''} onChange={(e) => onPairSetChange(i, 'reps', e.target.value)}
                                aria-label={`${item.pair.name} set ${i + 1} reps`}
                            />
                        </div>
                    </div>
                )
            })}

            <div className="today-item__actions">
                <button type="button" className="today-item__action-btn" onClick={() => setSubOpen(true)}>
                    Change exercise
                </button>
            </div>
            <FocusedNoteEditor label="Note" value={note} onChange={onNoteChange} />

            <ChangeExerciseSheet
                open={subOpen}
                onClose={() => setSubOpen(false)}
                prescribedName={item.name}
                currentValue={substitutedName}
                onSave={onSubstitute}
            />
        </>
    )
}

export default function PerformedStrengthItem({
    item, performed, substitutedName, lastPerformance,
    onSetChange, onPairSetChange, onAddSet, onRemoveSet, onUseLastValues,
    onSubstitute, note, onNoteChange,
}) {
    const view = buildStrengthItemView(item, performed, substitutedName, lastPerformance)

    return (
        <div className="today-item today-item--strength">
            <StrengthItemHeader item={item} view={view} onUseLastValues={onUseLastValues} substitutedName={substitutedName} />

            {Array.from({ length: view.numRows }, (_, i) => (
                <StrengthSetRow
                    key={i}
                    item={item}
                    displayName={view.displayName}
                    entry={view.sets[i] || {}}
                    index={i}
                    prescribedSets={view.prescribedSets}
                    effortKind={view.effortKind}
                    onSetChange={onSetChange}
                    onRemoveSet={onRemoveSet ? () => onRemoveSet(i, view.prescribedSets) : undefined}
                />
            ))}

            <StrengthItemFooter
                item={item} view={view}
                onAddSet={onAddSet} onPairSetChange={onPairSetChange}
                onSubstitute={onSubstitute} substitutedName={substitutedName}
                note={note} onNoteChange={onNoteChange}
            />
        </div>
    )
}
