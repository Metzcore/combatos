/**
 * utils/backupSchedule.js — the Agent auto-push "should we push now?" rule
 * (W29 PR E). PURE — no Dexie, no fetch, no timers, no DOM.
 *
 * WHY THIS IS EXTRACTED
 * The test suite runs `environment: 'node'` with no DOM and no React testing
 * library (open decision D14), so a hook that reads window/focus/online
 * events cannot be unit-tested directly. Every branch that actually decides
 * "push or don't" is pulled out here so it stays covered; the hook
 * (hooks/useBackupPushScheduler.js) is thin wiring around this function.
 *
 * THE RULE: at most once per LOCAL CALENDAR DAY, and only when the feature is
 * actually turned on. "Once per day" is a CALENDAR comparison (today's local
 * date string vs. the local date string the last success falls on) — NOT an
 * elapsed-24h check, so a push right after midnight is correctly "due" again
 * even if the prior success was only minutes ago on the wall clock.
 *
 * `lastSuccessIso` is a full ISO timestamp (an instant), not a bare
 * `YYYY-MM-DD` string — it comes straight from backupPush.js's
 * LAST_PUSH_OK_KEY, written as `new Date().toISOString()`. Feeding an instant
 * through `new Date(isoString)` is safe (unlike `new Date('YYYY-MM-DD')`,
 * which parses as UTC midnight and is the exact bug this codebase already
 * paid for once) — the trap is a bare calendar string, not a full timestamp.
 * `today` is expected to already be a `localDateStr()` output.
 */

import { localDateStr } from './checklistDate.js'

/**
 * isPushDue — decide whether the scheduler should attempt a push right now.
 *
 * @param {Object} args
 * @param {string|null|undefined} args.lastSuccessIso - LAST_PUSH_OK_KEY's raw value.
 * @param {string} args.today - localDateStr() output for "now".
 * @param {string|null|undefined} args.endpoint - the configured endpoint URL (or falsy).
 * @param {boolean} args.autoPush - the agentBackupAutoPush setting.
 * @returns {boolean}
 */
export function isPushDue({ lastSuccessIso, today, endpoint, autoPush }) {
    // Inert by design: no endpoint configured or auto-push off means this
    // never fires, regardless of what the timestamp says.
    if (!autoPush) return false
    if (!endpoint) return false
    if (!today) return false

    // Never pushed successfully (or the row is corrupt/unparseable): due now.
    if (!lastSuccessIso) return true
    const lastSuccessDate = new Date(lastSuccessIso)
    if (Number.isNaN(lastSuccessDate.getTime())) return true

    const lastSuccessLocalDay = localDateStr(lastSuccessDate)
    return lastSuccessLocalDay !== today
}
