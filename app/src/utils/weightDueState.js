/**
 * weightDueState.js — the weekly weight check-in due signal (W30). PURE.
 *
 * Gives the due condition ONE home, the same discipline phaseUnlock.js applies
 * to phase unlocking: if two surfaces computed "is a check-in due?"
 * independently they would eventually disagree, and a prompt that appears in
 * one place and not another reads as a bug in the app rather than a reminder.
 *
 * ── DESIGN CONSTRAINTS, ALL DELIBERATE ───────────────────────────────────
 *
 * NO ENTRY IS NOT OVERDUE. A user who has never logged a weight is not
 * behind on anything — they simply have not opted in. Treating "never" as
 * overdue would make the feature nag every existing user the moment it ships,
 * which is the fastest way to teach people to ignore it. The weekly cycle
 * starts after the FIRST saved check-in.
 *
 * DISMISS IS A SNOOZE, NOT A KILL SWITCH. Seven days, matching the cadence.
 * The alternatives all fail:
 *   - not persisted → recurs on every reload; a weekly aid becomes daily friction
 *   - persisted forever → dismiss once and the feature silently dies
 *   - one day → an app-open trigger turns it into a daily nag
 *
 * NO TARGET, NO STREAK, NO COUNT. This module returns due/not-due and the
 * number of days since the last entry, and nothing else. It deliberately does
 * not expose "days overdue", because that number invites a scoreboard and this
 * surface is a reminder, not a judgement. Per decision_log 2026-07-31: the
 * evidence for self-monitoring is strong; for distal targets it is weak — so
 * record the trend, never create a number to fail against.
 *
 * All dates are LOCAL calendar date strings ('YYYY-MM-DD') from
 * localDateStr(). Never `new Date('YYYY-MM-DD')` — it parses as UTC midnight
 * and renders local, which silently shifts the day for any user west of UTC.
 * That bug was live in the History list and was fixed in W26.
 */

import { daysBetween, isValidDateStr } from './dateMath.js'

/** A check-in is due once the last one is older than this many days. */
export const WEIGHT_CHECKIN_INTERVAL_DAYS = 7

/** How long "Later" suppresses the prompt. Same as the cadence, by design. */
export const WEIGHT_SNOOZE_DAYS = 7

/**
 * weightDueState — should the check-in prompt show right now?
 *
 * @param {object}  args
 * @param {?string} args.lastEntryDate  local 'YYYY-MM-DD' of the newest entry, or null
 * @param {string}  args.today          local 'YYYY-MM-DD'
 * @param {?string} args.snoozedUntil   local 'YYYY-MM-DD' exclusive, or null
 * @returns {{ due: boolean, reason: string, daysSinceLast: ?number }}
 *
 * `reason` is for tests and diagnostics, never for display — it exists so a
 * failing case says WHY rather than just "expected true, got false".
 */
export function weightDueState({ lastEntryDate, today, snoozedUntil = null } = {}) {
    if (!isValidDateStr(today)) {
        // Without a trustworthy "today" the honest answer is silence, not a
        // guess — a prompt fired on a bad clock is worse than none.
        return { due: false, reason: 'invalid-today', daysSinceLast: null }
    }

    if (!isValidDateStr(lastEntryDate)) {
        // Covers null, undefined and malformed alike. See the header: never
        // having logged is not being overdue.
        return { due: false, reason: 'no-entry-yet', daysSinceLast: null }
    }

    const daysSinceLast = daysBetween(lastEntryDate, today)

    // A future-dated entry means a device clock change or a bad write. Treat
    // it as not-due rather than computing a negative interval.
    if (daysSinceLast < 0) {
        return { due: false, reason: 'future-entry', daysSinceLast }
    }

    if (isValidDateStr(snoozedUntil) && daysBetween(today, snoozedUntil) > 0) {
        return { due: false, reason: 'snoozed', daysSinceLast }
    }

    if (daysSinceLast > WEIGHT_CHECKIN_INTERVAL_DAYS) {
        return { due: true, reason: 'overdue', daysSinceLast }
    }

    return { due: false, reason: 'recent', daysSinceLast }
}

/**
 * snoozeUntilDate — the date a "Later" tap should suppress the prompt through.
 * Exclusive: on that date the prompt is due again.
 */
export function snoozeUntilDate(today, addDaysFn) {
    if (!isValidDateStr(today)) return null
    if (typeof addDaysFn !== 'function') {
        throw new TypeError('snoozeUntilDate requires an addDays(dateStr, n) function')
    }
    return addDaysFn(today, WEIGHT_SNOOZE_DAYS)
}
