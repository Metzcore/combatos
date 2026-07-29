/**
 * utils/cartridgeDaySelection.js — A7b day suggestion and category defaults
 * (D10, D11). Pure — no React, no Dexie.
 *
 * D10 remains binding: a cartridge is a flexible pool of day-templates with
 * a SUGGESTED order, never a forced rotation. The suggestion here is always
 * derived at render time from logged history, never stored, and always
 * paired with an explicit "choose a different day" affordance in the UI.
 */

import { parseCartridgeDay } from './workoutDraftState.js'
import { isReadableCartridgeRow } from './cartridgeSessionPayload.js'

function sessionSortKey(session) {
    return session?.completedAt || session?.date || ''
}

/** Newest cartridge-kind session (either tolerated payloadVersion) matching `predicate`, or null. */
function findNewestMatchingSession(sessions, predicate) {
    let newest = null
    for (const session of sessions || []) {
        if (!isReadableCartridgeRow(session)) continue
        if (!predicate(session)) continue
        if (!newest || sessionSortKey(session) > sessionSortKey(newest)) newest = session
    }
    return newest
}

/** The cartridge's day numbers, sorted ascending. */
export function sortedDayNumbers(cartridge) {
    const days = Array.isArray(cartridge?.days) ? cartridge.days : []
    return days.map((d) => d.day).filter((n) => typeof n === 'number').sort((a, b) => a - b)
}

/**
 * The day-template list for the DaySelectSheet: every day, sorted, with
 * enough to render a row (label, type, how many training sections).
 */
export function listSelectableDays(cartridge) {
    const days = Array.isArray(cartridge?.days) ? cartridge.days : []
    return [...days]
        .sort((a, b) => a.day - b.day)
        .map((day) => ({
            day: day.day,
            label: day.label || `Day ${day.day}`,
            type: day.type || 'training',
            sectionCount: Array.isArray(day.blocks) ? day.blocks.length : 0,
        }))
}

/**
 * Suggested next day (D10): the day after the newest logged session's day
 * FOR THIS CARTRIDGE, wrapping through the sorted day list; the lowest day
 * when no history exists for this cartridge at all. Never stored, never
 * forced — purely a render-time suggestion.
 */
export function suggestNextDayTemplate(cartridge, sessions) {
    const days = sortedDayNumbers(cartridge)
    if (days.length === 0) return null

    const last = findNewestMatchingSession(sessions, (s) => s.cartridgeId === cartridge?.cartridgeId)
    if (!last) return days[0]

    const lastDay = parseCartridgeDay(last.dayTemplateKey)
    const idx = days.indexOf(lastDay)
    if (idx === -1) return days[0] // the last-logged day no longer exists in this cartridge version
    return days[(idx + 1) % days.length]
}

/**
 * The category default for a `custom` day: the newest logged session's
 * sessionCategory for the SAME cartridge AND day template. Null on first
 * use — nothing is preselected, and this never writes a new settings
 * record; the choice remains explicit and editable before logging either way.
 */
export function defaultCategoryFor({ sessions, cartridgeId, dayTemplateKey }) {
    const last = findNewestMatchingSession(
        sessions,
        (s) => s.cartridgeId === cartridgeId && s.dayTemplateKey === dayTemplateKey,
    )
    return last?.sessionCategory ?? null
}

export default { sortedDayNumbers, listSelectableDays, suggestNextDayTemplate, defaultCategoryFor }
