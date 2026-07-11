/**
 * checklistShare.js — Share/export delivery mechanics (W22).
 *
 * Takes the ALREADY-FETCHED exportChecklist() result (that function's shape
 * is the D4 connector contract and is not touched here) and hands it to the
 * user. Feature-detection order per the W22 ruling:
 *   1. `navigator.canShare({ files })` (guarded — older browsers lack it)
 *   2. `navigator.share({ files })` (Android Chrome PWA supports file share)
 *   3. plain blob download named `combatos-checklist-YYYY-MM-DD.json`
 * There is NO fileless text-share middle tier (reviewer ruling, 2026-07-11).
 * Desktop browsers typically fail step 1 and get the normal download flow.
 *
 * The filename stamp is the plain local calendar date (localDateStr), not
 * the reset-shifted logical date — it labels when the file was made, it is
 * not a data boundary (reviewer ruling, 2026-07-11).
 */

import { localDateStr } from './checklistDate.js'

export async function shareOrDownloadChecklist(exportData) {
    const json = JSON.stringify(exportData, null, 2)
    const filename = `combatos-checklist-${localDateStr()}.json`
    const file = new File([json], filename, { type: 'application/json' })

    if (typeof navigator !== 'undefined'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'CombatOS Checklist Export' })
            return
        } catch (err) {
            // User cancelled the share sheet — done, do NOT also download.
            if (err && err.name === 'AbortError') return
            // Any other share failure falls through to the blob download.
        }
    }

    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
