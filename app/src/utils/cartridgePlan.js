/**
 * Derive Plan's mutually exclusive screen state without inventing a fallback
 * cartridge. A validated cached snapshot remains usable through refresh
 * failures; provider notices communicate staleness separately.
 */
export function getCartridgePlanState({
    loading,
    snapshot,
    offline,
    error,
    activeCartridge,
}) {
    if (loading && !snapshot) return 'loading'

    if (!snapshot) {
        if (offline) return 'offline-empty'
        if (error) return 'error'
        return 'no-active'
    }

    if (snapshot.activeId && !activeCartridge) return 'update-required'
    if (!snapshot.activeId) return 'no-active'
    return 'ready'
}
