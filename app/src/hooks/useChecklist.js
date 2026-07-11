/**
 * useChecklist.js — thin React wrapper over db/checklist.js (W21, W22)
 *
 * Deliberately NOT part of DBProvider: the checklist's Dexie reads happen on
 * the Checklist hub's own mount, never gating the app-wide `ready` flag, so
 * this feature can't add latency to Train/Timer/Log startup. LOCAL-ONLY —
 * zero coupling to sync/syncQueue.js.
 *
 * "Today" handling (W22): the logical day boundary is the configurable reset
 * time (settings key `checklistResetTime`). The setting is loaded ONCE per
 * mount — sequenced BEFORE the first view-model read so the first paint
 * can't use the wrong offset — then cached in state and only re-read when
 * the user edits it via updateResetTime. The view model is re-read (with a
 * fresh logicalDateStr) after every action, and additionally whenever the
 * document becomes visible again (reviewer ruling #2) — covering the
 * phone-unlocked-next-morning case with the PWA still open. A truly idle,
 * visible app sitting across the reset instant is an accepted limitation.
 */

import { useState, useEffect, useCallback } from 'react'
import {
    createGroup, renameGroup, moveGroup, deleteGroup,
    createTask, quickAddTask, updateTask, stopRepeating, moveTask, softDeleteTask,
    setCompletion, getGroupsWithTasks, exportChecklist,
    getResetTime, setResetTime
} from '../db/checklist.js'
import { logicalDateStr, DEFAULT_RESET_TIME } from '../utils/checklistDate.js'

export function useChecklist() {
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [resetTime, setResetTimeState] = useState(DEFAULT_RESET_TIME)

    // Callers inside the mount effect pass the just-loaded value explicitly;
    // everyone else falls back to the cached setting.
    const refresh = useCallback(async (rt = resetTime) => {
        const model = await getGroupsWithTasks(logicalDateStr(new Date(), rt))
        setGroups(model)
        setLoading(false)
    }, [resetTime])

    useEffect(() => {
        // Sequenced: the setting load COMPLETES before the first view-model
        // read, so there is no flash of default-midnight "today".
        (async () => {
            const rt = await getResetTime()
            setResetTimeState(rt)
            await refresh(rt)
        })()
        // refresh is intentionally not a dependency: this must run once per
        // mount, and the explicit `rt` argument makes the closure safe.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [refresh])

    const updateResetTime = useCallback(async (value) => {
        await setResetTime(value)
        setResetTimeState(value)
        // Recompute immediately: the logical "today" may shift right now,
        // which can flip doneToday/streak display — accepted per the W22
        // ruling, and doing it here makes the flip happen deterministically
        // at Save-time rather than on some later unrelated action.
        await refresh(value)
    }, [refresh])

    // Every action funnels through refresh() so the view (streaks included)
    // is always recomputed against a fresh logical "today".
    const wrap = fn => async (...args) => { await fn(...args); await refresh() }

    return {
        groups,
        loading,
        refresh,
        resetTime,
        updateResetTime,
        exportData: exportChecklist, // read-only, no refresh needed
        addGroup: wrap(createGroup),
        renameGroup: wrap(renameGroup),
        moveGroup: wrap(moveGroup),
        deleteGroup: wrap(deleteGroup),
        addTask: wrap(createTask),
        quickAdd: wrap(quickAddTask),
        updateTask: wrap(updateTask),
        stopRepeating: wrap(stopRepeating),
        moveTask: wrap(moveTask),
        deleteTask: wrap(softDeleteTask),
        setCompletion: wrap(setCompletion)
    }
}
