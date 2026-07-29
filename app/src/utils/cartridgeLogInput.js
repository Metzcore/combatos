/**
 * utils/cartridgeLogInput.js — A7b raw-input assembly for
 * DBProvider.logCartridgeSession(rawInput) (corrective plan finding B/J10).
 *
 * CartridgeToday.jsx builds ONLY this raw shape — no sessionId, no built
 * payload, no direct validation call — and hands it to the provider, which
 * owns identity generation, building, and validation
 * (db/cartridgeLogging.js's performCartridgeLog). Exported so tests exercise
 * the SAME assembly production uses, never a hand-copied mirror. Pure,
 * side-effect free except for the injectable `now` clock (defaults to the
 * real Date, overridable by tests for deterministic timestamps).
 */

/** Shared by both raw-input builders below — was duplicated across
 *  CartridgeToday's Finish and one-tap paths before this extraction
 *  (corrective-pass finding J10). */
export function buildBlockInputs(dayBlocks, itemStateById, substitutions, itemNotes) {
    return (dayBlocks || []).map((block) => ({
        kind: block.kind,
        label: block.label,
        items: (block.items || []).map((item) => {
            const performed = (itemStateById && itemStateById[item.id]) || {}
            const substitutedName = substitutions && substitutions[item.id]
            const performedInput = { sets: performed.sets, pair: performed.pair }
            if (substitutedName) performedInput.name = substitutedName
            return {
                itemId: item.id,
                cartridgeItem: item,
                performedInput,
                note: itemNotes && itemNotes[item.id],
            }
        }),
    }))
}

/**
 * buildTrainingOrCustomLogInput — the raw input for the training/custom
 * Finish path (after the pre-log flush has already succeeded).
 */
export function buildTrainingOrCustomLogInput({
    startedAt, cartridgeId, cartridgeVersion, cartridgeSchemaVersion, cartridgeDay,
    day, dayType, cartridgePhaseId, itemStateById, substitutions, itemNotes,
    cartridgeNotes, sessionActivities, otherActivity, sessionDuration, customSessionContent,
    category, now = () => new Date(),
}) {
    const nowDate = now()
    return {
        date: nowDate.toISOString().slice(0, 10),
        startedAt: startedAt || undefined,
        completedAt: nowDate.toISOString(),
        sessionCategory: category,
        cartridgeId, cartridgeVersion, cartridgeSchemaVersion,
        dayTemplateKey: `day:${cartridgeDay}`,
        dayTemplateLabel: day.label,
        dayType,
        phaseId: cartridgePhaseId,
        blocks: dayType === 'training' ? buildBlockInputs(day.blocks, itemStateById, substitutions, itemNotes) : [],
        notes: cartridgeNotes || undefined,
        sessionActivities,
        otherActivity: Array.isArray(sessionActivities) && sessionActivities.includes('other') ? otherActivity : undefined,
        sessionDuration: dayType === 'custom' ? sessionDuration : undefined,
        customContent: dayType === 'custom' ? customSessionContent : undefined,
    }
}

/**
 * buildRestOrRecoveryLogInput — the raw input for the idle-state one-tap
 * rest/recovery log (no active draft, no Start pressed, no blocks).
 */
export function buildRestOrRecoveryLogInput({
    activeCartridge, effectiveSelectedDay, selectedDayDef, phaseBlock, category, now = () => new Date(),
}) {
    const nowDate = now()
    return {
        date: nowDate.toISOString().slice(0, 10),
        completedAt: nowDate.toISOString(),
        sessionCategory: category,
        cartridgeId: activeCartridge.cartridgeId,
        cartridgeVersion: activeCartridge.cartridgeVersion,
        cartridgeSchemaVersion: activeCartridge.schemaVersion,
        dayTemplateKey: `day:${effectiveSelectedDay}`,
        dayTemplateLabel: selectedDayDef.label,
        dayType: selectedDayDef.type,
        phaseId: phaseBlock ? phaseBlock.id : null,
        blocks: [],
    }
}
