/**
 * registryCompleteness.test.js — Step 08 follow-up.
 *
 * Enumerates every JSON file physically present in this directory and fails
 * if any of them is absent from the runtime registry exported by index.js.
 * Catches the case where a cartridge file is added/mirrored but never wired
 * into CARTRIDGES / CARTRIDGE_BY_ID, a stale entry left with no backing file,
 * or a duplicate/collapsed cartridgeId on disk or in the registry.
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

    it('no two on-disk JSON files share a cartridgeId', () => {
        const idToFiles = new Map()
        for (const file of jsonFiles) {
            const id = JSON.parse(readFileSync(resolve(here, file), 'utf8')).cartridgeId
            idToFiles.set(id, [...(idToFiles.get(id) ?? []), file])
        }
        const duplicates = [...idToFiles.entries()].filter(([, files]) => files.length > 1)
        expect(duplicates).toEqual([])
    })

    it('CARTRIDGES contains no duplicate cartridgeId values', () => {
        const ids = CARTRIDGES.map((cartridge) => cartridge.cartridgeId)
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
        expect(duplicates).toEqual([])
    })

    it('CARTRIDGE_BY_ID has exactly one entry per CARTRIDGES entry (no collapsed duplicates)', () => {
        expect(CARTRIDGE_BY_ID.size).toBe(CARTRIDGES.length)
    })

    it('every CARTRIDGE_BY_ID entry references the exact same object as its CARTRIDGES counterpart', () => {
        for (const cartridge of CARTRIDGES) {
            expect(CARTRIDGE_BY_ID.get(cartridge.cartridgeId)).toBe(cartridge)
        }
    })
})
