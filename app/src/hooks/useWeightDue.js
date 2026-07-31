/**
 * useWeightDue.js — reads the weekly weight check-in signal (W30).
 *
 * The DECISION lives in the pure, tested `utils/weightDueState.js`. This hook
 * only supplies it with data and persists a snooze — the same split W27 uses
 * for phase unlocking (`utils/phaseUnlock.js` decides, HUD renders). Two
 * surfaces computing "is a check-in due?" independently would eventually
 * disagree, and a prompt that appears in one place but not another reads as a
 * broken app rather than a reminder.
 *
 * The snooze key is OWNER-SCOPED. The Dexie database is single-named and most
 * settings are not keyed by user, so an unscoped key would let one account's
 * "Later" silence the prompt for whoever signs in next on that device.
 *
 * Written straight through `getSetting` / `db.settings.put` rather than added
 * to DBProvider: this is a single-consumer key, the same discipline
 * `lastFullBackupAt` and `checklistResetTime` already follow.
 */
import { useCallback, useEffect, useState } from 'react'
import { db, getSetting } from '../db/index.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { latestWeightRow } from '../db/bodyWeight.js'
import { localDateStr } from '../utils/checklistDate.js'
import { addDays } from '../utils/dateMath.js'
import { weightDueState, snoozeUntilDate } from '../utils/weightDueState.js'

const snoozeKey = ownerUserId => `weightDueSnoozedUntil:${ownerUserId}`

export function useWeightDue() {
    const { user } = useAuth()
    const ownerUserId = user?.id ?? null

    const [lastEntryDate, setLastEntryDate] = useState(null)
    const [snoozedUntil, setSnoozedUntil] = useState(null)
    const [ready, setReady] = useState(false)

    const refresh = useCallback(async () => {
        if (!ownerUserId) {
            setLastEntryDate(null)
            setSnoozedUntil(null)
            setReady(true)
            return
        }
        try {
            const [row, snooze] = await Promise.all([
                latestWeightRow(ownerUserId),
                getSetting(snoozeKey(ownerUserId)),
            ])
            setLastEntryDate(row?.date ?? null)
            setSnoozedUntil(typeof snooze === 'string' ? snooze : null)
        } catch (err) {
            console.error('weight due-state read failed', err)
            // A failed read must not manufacture a prompt: leaving these null
            // means weightDueState returns not-due, which is the safe default.
            setLastEntryDate(null)
            setSnoozedUntil(null)
        } finally {
            setReady(true)
        }
    }, [ownerUserId])

    useEffect(() => { refresh() }, [refresh])

    // Re-read when the app comes back to the foreground. A phone opened the
    // next morning has crossed a calendar day without any React state
    // changing — the same reason checklistDate.js re-reads on this event.
    useEffect(() => {
        const onVisible = () => { if (!document.hidden) refresh() }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', refresh)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', refresh)
        }
    }, [refresh])

    const snooze = useCallback(async () => {
        if (!ownerUserId) return
        const until = snoozeUntilDate(localDateStr(), addDays)
        if (!until) return
        await db.settings.put({ key: snoozeKey(ownerUserId), value: until })
        setSnoozedUntil(until)
    }, [ownerUserId])

    const state = weightDueState({
        lastEntryDate,
        today: localDateStr(),
        snoozedUntil,
    })

    // Never prompt before the first read resolves — a flash of "due" that
    // vanishes is worse than showing nothing for a moment.
    return { ...state, due: ready && state.due, refresh, snooze, ownerUserId }
}
