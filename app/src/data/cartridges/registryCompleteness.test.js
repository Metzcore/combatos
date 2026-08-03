/**
 * registryCompleteness.test.js — Step 08 follow-up.
 *
 * Enumerates every JSON file physically present in this directory and fails
 * if any of them is absent from the runtime registry exported by index.js.
 * Catches the case where a cartridge file is added/mirrored but never wired
 * into CARTRIDGES / CARTRIDGE_BY_ID.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { CARTRIDGES, CARTRIDGE_BY_ID } from './index.js'

const here = dirname(fileURLToPath(import.meta.url))

describe('cartridge registry — completeness', () => {
    const jsonFiles = readdirSync(here).filter((name) => name.endsWith('.json'))

    it('finds at least one bundled cartridge JSON file (fixture sanity check)', () => {
        expect(jsonFiles.length).toBeGreaterThan(0)
    })

    it('every bundled cartridge JSON file is registered in CARTRIDGES and CARTRIDGE_BY_ID', () => {
        const cartridgeIdsOnDisk = jsonFiles.map((file) => JSON.parse(readFileSync(resolve(here, file), 'utf8')).cartridgeId)
        const registeredIds = new Set(CARTRIDGES.map((cartridge) => cartridge.cartridgeId))

        const missingFromCartridges = cartridgeIdsOnDisk.filter((id) => !registeredIds.has(id))
        const missingFromById = cartridgeIdsOnDisk.filter((id) => !CARTRIDGE_BY_ID.has(id))

        expect(missingFromCartridges).toEqual([])
        expect(missingFromById).toEqual([])
    })

    it('CARTRIDGES has no entries beyond what is on disk (no stale/orphaned registrations)', () => {
        const cartridgeIdsOnDisk = new Set(
            jsonFiles.map((file) => JSON.parse(readFileSync(resolve(here, file), 'utf8')).cartridgeId)
        )
        const orphaned = CARTRIDGES.map((cartridge) => cartridge.cartridgeId).filter((id) => !cartridgeIdsOnDisk.has(id))
        expect(orphaned).toEqual([])
    })
})
