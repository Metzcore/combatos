/**
 * Account-scoped cartridge access cache.
 *
 * Uses the existing key/value settings store: no Dexie schema bump and no
 * second offline mutation queue. Only complete, validated server snapshots
 * are written here.
 */

import { db } from './index.jsx'
import { parseCartridgeAccessSnapshot } from '../cartridges/accessModel.js'

export const CARTRIDGE_ACCESS_CACHE_KEY = 'cartridgeAccessCache'

export async function readCartridgeAccessCache(expectedUserId = null) {
    const row = await db.settings.get(CARTRIDGE_ACCESS_CACHE_KEY)
    const snapshot = parseCartridgeAccessSnapshot(row?.value)

    if (!snapshot) return null
    if (expectedUserId !== null && snapshot.userId !== expectedUserId) return null
    return snapshot
}

export async function writeCartridgeAccessCache(value) {
    const snapshot = parseCartridgeAccessSnapshot(value)
    if (!snapshot) throw new Error('Refusing to cache invalid cartridge access data.')

    await db.settings.put({ key: CARTRIDGE_ACCESS_CACHE_KEY, value: snapshot })
    return snapshot
}

export async function clearCartridgeAccessCache() {
    await db.settings.delete(CARTRIDGE_ACCESS_CACHE_KEY)
}
