/**
 * useNotes.js — thin React wrapper over db/notes.js (W23)
 *
 * Deliberately NOT part of DBProvider (same reasoning as useChecklist.js):
 * the notes Dexie reads happen on the Notes tab's own mount, never gating
 * the app-wide `ready` flag. LOCAL-ONLY — zero coupling to
 * sync/syncQueue.js.
 *
 * "Today" (the daily note) uses the SAME logical-day clock as the
 * checklist: logicalDateStr + the `checklistResetTime` setting — one clock
 * for the whole hub. The setting is read FRESH on every Today tap (no
 * cached copy in this hook), so a reset-time edit made on the Checklist
 * tab, or a day rollover while the app sat open, can never hand Today a
 * stale logical date. The view model is additionally re-read whenever the
 * document becomes visible again (same reviewer ruling as useChecklist).
 */

import { useState, useEffect, useCallback } from 'react'
import {
    createNoteGroup, renameNoteGroup, moveNoteGroup, deleteNoteGroup,
    createNote, quickCaptureNote, updateNote, setNotePinned, moveNote, softDeleteNote,
    getOrCreateDailyNote, getNotesViewModel, exportNotes,
    getDailyTemplate, setDailyTemplate
} from '../db/notes.js'
import { getResetTime } from '../db/checklist.js'
import { logicalDateStr } from '../utils/checklistDate.js'

export function useNotes() {
    const [groups, setGroups] = useState([])
    const [tagCounts, setTagCounts] = useState([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const model = await getNotesViewModel()
        setGroups(model.groups)
        setTagCounts(model.tagCounts)
        setLoading(false)
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [refresh])

    /**
     * The daily note for the current LOGICAL day — created on demand.
     * Reads the reset time NOW so the logical date is never stale.
     */
    const openDailyNote = useCallback(async () => {
        const rt = await getResetTime()
        const note = await getOrCreateDailyNote(logicalDateStr(new Date(), rt))
        await refresh()
        return note
    }, [refresh])

    // Every action funnels through refresh() so the view (tag chips
    // included) is always recomputed from live data. The db result is
    // passed through — NoteEditor's lazy create needs the new note's id.
    const wrap = fn => async (...args) => {
        const result = await fn(...args)
        await refresh()
        return result
    }

    return {
        groups,
        tagCounts,
        loading,
        refresh,
        openDailyNote,
        exportData: exportNotes,       // read-only, no refresh needed
        getDailyTemplate,              // read-only
        saveDailyTemplate: setDailyTemplate, // affects FUTURE daily notes only — no view change
        addGroup: wrap(createNoteGroup),
        renameGroup: wrap(renameNoteGroup),
        moveGroup: wrap(moveNoteGroup),
        deleteGroup: wrap(deleteNoteGroup),
        addNote: wrap(createNote),
        quickCapture: wrap(quickCaptureNote),
        updateNote: wrap(updateNote),
        setPinned: wrap(setNotePinned),
        moveNote: wrap(moveNote),
        deleteNote: wrap(softDeleteNote)
    }
}
