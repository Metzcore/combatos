import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './index.jsx'
import {
    CARTRIDGE_ACCESS_CACHE_KEY,
    clearCartridgeAccessCache,
    readCartridgeAccessCache,
    writeCartridgeAccessCache,
} from './cartridgeAccess.js'

vi.stubGlobal('navigator', { onLine: true })

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'
const snapshot = {
    userId: USER_A,
    availableIds: ['program-one', 'future-program'],
    activeId: 'program-one',
    syncedAt: '2026-07-22T16:00:00.000Z',
}

beforeEach(async () => {
    await db.settings.delete(CARTRIDGE_ACCESS_CACHE_KEY)
})

describe('cartridge access cache', () => {
    it('round-trips the complete server snapshot, including unknown bundled IDs', async () => {
        await writeCartridgeAccessCache(snapshot)
        expect(await readCartridgeAccessCache(USER_A)).toEqual(snapshot)
    })

    it('ignores a valid cache belonging to another authenticated user', async () => {
        await writeCartridgeAccessCache(snapshot)
        expect(await readCartridgeAccessCache(USER_B)).toBeNull()
        expect(await readCartridgeAccessCache(USER_A)).toEqual(snapshot)
    })

    it('fails closed on corrupt storage without rewriting it', async () => {
        const corrupt = { ...snapshot, activeId: 'not-available' }
        await db.settings.put({ key: CARTRIDGE_ACCESS_CACHE_KEY, value: corrupt })

        expect(await readCartridgeAccessCache(USER_A)).toBeNull()
        expect((await db.settings.get(CARTRIDGE_ACCESS_CACHE_KEY)).value).toEqual(corrupt)
    })

    it('refuses invalid writes, preserving the previous valid snapshot', async () => {
        await writeCartridgeAccessCache(snapshot)

        await expect(writeCartridgeAccessCache({ ...snapshot, syncedAt: 'invalid' }))
            .rejects.toThrow('Refusing to cache invalid cartridge access data')
        expect(await readCartridgeAccessCache(USER_A)).toEqual(snapshot)
    })

    it('removes local offline trust on explicit clear', async () => {
        await writeCartridgeAccessCache(snapshot)
        await clearCartridgeAccessCache()
        expect(await readCartridgeAccessCache()).toBeNull()
    })

    it('uses the existing settings store without a Dexie schema bump', () => {
        expect(db.verno).toBe(3)
        expect(db.tables.map((table) => table.name)).not.toContain('cartridgeAccess')
    })
})
