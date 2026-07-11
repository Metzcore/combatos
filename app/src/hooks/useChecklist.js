/**
 * useChecklist.js — thin React wrapper over db/checklist.js (W21)
 *
 * Deliberately NOT part of DBProvider: the checklist's Dexie reads happen on
 * the Checklist hub's own mount, never gating the app-wide `ready` flag, so
 * this feature can't add latency to Train/Timer/Log startup. LOCAL-ONLY —
 * zero coupling to sync/syncQueue.js.
 *
 * "Today" handling: the view model is re-read (with a fresh localDateStr())
 * after every action, and additionally whenever the document becomes visible
 * again (reviewer ruling #2) — covering the phone-unlocked-next-morning case
 * with the PWA still open. A truly idle, visible app sitting across midnight
 * is an accepted v1 limitation.
 */

import { useState, useEffect, useCallback } from 'react'
import {
    createGroup, renameGroup, moveGroup, deleteGroup,
    createTask, quickAddTask, updateTask, stopRepeating, moveTask, softDeleteTask,
    setCompletion, getGroupsWithTasks
} from '../db/checklist.js'

export function useChecklist() {
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const model = await getGroupsWithTasks()
        setGroups(model)
        setLoading(false)
    }, [])

    useEffect(() => {
        refresh()
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [refresh])

    // Every action funnels through refresh() so the view (streaks included)
    // is always recomputed against a fresh local "today".
    const wrap = fn => async (...args) => { await fn(...args); await refresh() }

    return {
        groups,
        loading,
        refresh,
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
