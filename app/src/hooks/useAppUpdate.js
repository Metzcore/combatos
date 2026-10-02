/**
 * hooks/useAppUpdate.js — the update-ready state for one component (W40).
 * Thin React binding over swUpdate.js (module-level store, started on import
 * from main.jsx).
 */
import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, restartApp } from '../swUpdate.js'

export function useAppUpdate() {
    const { status } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    return { status, restart: restartApp }
}
