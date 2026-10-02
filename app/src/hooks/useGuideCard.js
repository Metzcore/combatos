/**
 * hooks/useGuideCard.js — dismissed state for the first-run guide card (W39).
 *
 * localStorage, every read and write guarded (private mode or blocked storage
 * simply means the card shows again next load). See utils/guideCard.js.
 */
import { useState, useCallback } from 'react'
import { GUIDE_CARD_STORAGE_KEY, parseDismissed } from '../utils/guideCard.js'

function readDismissed() {
    try {
        return parseDismissed(window.localStorage.getItem(GUIDE_CARD_STORAGE_KEY))
    } catch {
        return false
    }
}

function writeDismissed() {
    try {
        window.localStorage.setItem(GUIDE_CARD_STORAGE_KEY, '1')
    } catch {
        // Blocked storage: the card just reappears next load.
    }
}

export function useGuideCard() {
    const [dismissed, setDismissed] = useState(readDismissed)
    const dismiss = useCallback(() => {
        writeDismissed()
        setDismissed(true)
    }, [])
    return { dismissed, dismiss }
}
