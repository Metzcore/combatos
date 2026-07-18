/**
 * checklistShare.js — Share/export delivery mechanics (W22, generalized W23.5).
 *
 * shareOrDownloadJson() hands any plain-JSON payload to the user. Feature-
 * detection order per the W22 ruling:
 *   1. `navigator.canShare({ files })` (guarded — older browsers lack it)
 *   2. `navigator.share({ files })` (Android Chrome PWA supports file share)
 *   3. plain blob download under the given filename
 * There is NO fileless text-share middle tier (reviewer ruling, 2026-07-11).
 * Desktop browsers typically fail step 1 and get the normal download flow.
 *
 * Return value (W23.5): 'shared' | 'downloaded' | 'cancelled'. Callers that
 * need delivered-vs-cancelled (the "last full backup" timestamp) treat
 * anything except 'cancelled' as a true delivery — a completed share sheet
 * AND a plain download both count; only an explicit user-cancel of the
 * share sheet (AbortError) does not.
 *
 * shareOrDownloadChecklist() is the original W22 entry point, now a thin
 * wrapper — its signature and observable behavior are unchanged. It takes
 * the ALREADY-FETCHED exportChecklist() result (that function's shape is
 * the D4 connector contract and is not touched here).
 *
 * Filename stamps are the plain local calendar date (localDateStr), not the
 * reset-shifted logical date — they label when the file was made, they are
 * not a data boundary (reviewer ruling, 2026-07-11).
 */

import { localDateStr } from './checklistDate.js'

export async function shareOrDownloadJson(data, filename, title = filename) {
    const json = JSON.stringify(data, null, 2)
    const file = new File([json], filename, { type: 'application/json' })

    if (typeof navigator !== 'undefined'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title })
            return 'shared'
        } catch (err) {
            // User cancelled the share sheet — done, do NOT also download.
            if (err && err.name === 'AbortError') return 'cancelled'
            // Any other share failure falls through to the blob download.
        }
    }

    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
}

export async function shareOrDownloadChecklist(exportData) {
    const filename = `combatos-checklist-${localDateStr()}.json`
    await shareOrDownloadJson(exportData, filename, 'CombatOS Checklist Export')
}

// shareOrDownloadNotes() — W25, thin sibling of shareOrDownloadChecklist().
// Takes the ALREADY-FETCHED exportNotes() result (that function's shape is
// the D4 connector contract and is not touched here).
export async function shareOrDownloadNotes(exportData) {
    const filename = `combatos-notes-${localDateStr()}.json`
    await shareOrDownloadJson(exportData, filename, 'CombatOS Notes Export')
}
