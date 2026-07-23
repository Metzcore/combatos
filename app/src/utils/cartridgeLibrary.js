/**
 * Pure Library view helpers. Keeping state priority and ordering outside the
 * component makes the no-fallback access rules easy to pin with unit tests.
 */

export function orderLibraryCartridges(cartridges, activeId) {
    if (!Array.isArray(cartridges)) return []
    if (!activeId) return [...cartridges]

    return [...cartridges].sort((a, b) => {
        if (a.cartridgeId === activeId) return -1
        if (b.cartridgeId === activeId) return 1
        return 0
    })
}

export function getCartridgeLibraryState({
    loading,
    snapshot,
    offline,
    error,
    knownCount,
    unknownCount,
}) {
    if (loading && !snapshot) return 'loading'
    if (snapshot && knownCount > 0) return 'ready'
    if (snapshot && unknownCount > 0) return 'update-required'
    if (snapshot) return 'empty'
    if (offline) return 'offline-empty'
    if (error) return 'error'
    return 'loading'
}

export function formatCartridgeTag(tag) {
    return String(tag).split('-').join(' ')
}
