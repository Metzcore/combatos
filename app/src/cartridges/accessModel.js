/**
 * Pure validation and registry mapping for account-scoped cartridge access.
 *
 * The cache contains server facts, including IDs that a newer server may know
 * before this bundled app version does. Unknown IDs are therefore preserved
 * and reported; they are never replaced with a convenient local default.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CARTRIDGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CARTRIDGE_ACCESS_RESET_EVENT = 'combatos:cartridge-access-reset'

export function isValidUserId(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function isValidCartridgeId(value) {
    return typeof value === 'string' && CARTRIDGE_ID_PATTERN.test(value)
}

export function parseCartridgeAccessSnapshot(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const { userId, availableIds, activeId, syncedAt } = value
    if (!isValidUserId(userId)) return null
    if (!Array.isArray(availableIds) || !availableIds.every(isValidCartridgeId)) return null
    if (new Set(availableIds).size !== availableIds.length) return null
    if (activeId !== null && !isValidCartridgeId(activeId)) return null
    if (activeId !== null && !availableIds.includes(activeId)) return null
    if (typeof syncedAt !== 'string' || Number.isNaN(Date.parse(syncedAt))) return null

    return {
        userId,
        availableIds: [...availableIds],
        activeId,
        syncedAt,
    }
}

export function createCartridgeAccessSnapshot({ userId, availableIds, activeId, syncedAt = new Date().toISOString() }) {
    const snapshot = parseCartridgeAccessSnapshot({ userId, availableIds, activeId, syncedAt })
    if (!snapshot) throw new Error('Invalid cartridge access snapshot.')
    return snapshot
}

export function mapCartridgeAccess(snapshot, registry) {
    const valid = parseCartridgeAccessSnapshot(snapshot)
    if (!valid) {
        return {
            availableCartridges: [],
            activeCartridge: null,
            unknownIds: [],
            updateRequired: false,
        }
    }

    const unknownIds = valid.availableIds.filter((id) => !registry.has(id))
    const availableCartridges = valid.availableIds
        .map((id) => registry.get(id))
        .filter(Boolean)

    return {
        availableCartridges,
        activeCartridge: valid.activeId ? registry.get(valid.activeId) ?? null : null,
        unknownIds,
        updateRequired: unknownIds.length > 0,
    }
}
