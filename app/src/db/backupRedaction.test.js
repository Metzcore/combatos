/**
 * backupRedaction.test.js — the device-secret boundary (W29).
 *
 * The headline case is the SENTINEL test at the bottom: a real secret value is
 * written into the real settings table, a real backup is taken, and the whole
 * document is serialized and searched. That is deliberately a blunt
 * string-search rather than a structural assertion — a structural check only
 * proves the shape we thought to check, while the actual risk is the value
 * escaping through ANY path (a second table, a nested field, a future export
 * addition). If the secret is anywhere in the JSON, this fails.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './index.jsx'
import { exportFullBackup } from './backup.js'
import {
    SENSITIVE_SETTING_KEYS,
    AGENT_ENDPOINT_URL_KEY,
    AGENT_ENDPOINT_TOKEN_KEY,
    isSensitiveSettingKey,
    redactSettingsRows,
} from './backupRedaction.js'

vi.stubGlobal('navigator', { onLine: true })

beforeEach(async () => {
    for (const table of db.tables) {
        await table.clear()
    }
})

describe('isSensitiveSettingKey', () => {
    it('flags every declared credential key', () => {
        for (const key of SENSITIVE_SETTING_KEYS) {
            expect(isSensitiveSettingKey(key)).toBe(true)
        }
    })

    it('does not flag ordinary preferences', () => {
        // Over-redaction is its own bug: it silently degrades what a backup
        // can restore, with no visible symptom until someone needs it.
        for (const key of ['currentPhase', 'appName', 'appSubtitle', 'dailyIgnitionEnabled',
            'bookmarkedIgnitions', 'lastFullBackupAt', 'savedRoundsTimers', 'checklistResetTime']) {
            expect(isSensitiveSettingKey(key)).toBe(false)
        }
    })

    it('does not flag near-miss keys', () => {
        expect(isSensitiveSettingKey(AGENT_ENDPOINT_TOKEN_KEY + 'x')).toBe(false)
        expect(isSensitiveSettingKey('agentBackup')).toBe(false)
        expect(isSensitiveSettingKey(undefined)).toBe(false)
    })
})

describe('redactSettingsRows', () => {
    it('removes sensitive rows ENTIRELY rather than blanking them', () => {
        // A { key, value: '' } row would round-trip through a future restore
        // and overwrite a working credential with an empty one.
        const { rows, redactedKeys } = redactSettingsRows([
            { key: 'appName', value: 'Combat OS' },
            { key: AGENT_ENDPOINT_TOKEN_KEY, value: 'super-secret' },
        ])
        expect(rows).toEqual([{ key: 'appName', value: 'Combat OS' }])
        expect(rows.find(r => r.key === AGENT_ENDPOINT_TOKEN_KEY)).toBeUndefined()
        expect(redactedKeys).toEqual([AGENT_ENDPOINT_TOKEN_KEY])
    })

    it('reports key NAMES but never values', () => {
        const { redactedKeys } = redactSettingsRows([
            { key: AGENT_ENDPOINT_URL_KEY, value: 'https://example.test/hook/abc' },
        ])
        expect(redactedKeys).toEqual([AGENT_ENDPOINT_URL_KEY])
        expect(JSON.stringify(redactedKeys)).not.toContain('abc')
    })

    it('preserves order and passes through untouched rows', () => {
        const { rows } = redactSettingsRows([
            { key: 'a', value: 1 }, { key: 'b', value: 2 }, { key: 'c', value: 3 },
        ])
        expect(rows.map(r => r.key)).toEqual(['a', 'b', 'c'])
    })

    it('is defensive about corrupt input instead of throwing', () => {
        // A backup that fails hard is worse than one honest about being empty.
        expect(redactSettingsRows(undefined)).toEqual({ rows: [], redactedKeys: [] })
        expect(redactSettingsRows(null)).toEqual({ rows: [], redactedKeys: [] })
        expect(redactSettingsRows('nope')).toEqual({ rows: [], redactedKeys: [] })
    })

    it('keeps malformed rows — they cannot be credentials by construction', () => {
        const { rows, redactedKeys } = redactSettingsRows([null, { novalue: true }, { key: 42 }])
        expect(rows).toHaveLength(3)
        expect(redactedKeys).toEqual([])
    })

    it('returns no redactions when nothing sensitive is stored', () => {
        const { rows, redactedKeys } = redactSettingsRows([{ key: 'appName', value: 'x' }])
        expect(rows).toHaveLength(1)
        expect(redactedKeys).toEqual([])
    })
})

describe('SENTINEL — a stored credential must not appear anywhere in a real backup', () => {
    const SENTINEL_TOKEN = 'SENTINEL-TOKEN-d41d8cd98f00b204e9800998ecf8427e'
    const SENTINEL_URL = 'https://SENTINEL-HOST.example.test/hook/7f3a9c1e'

    it('does not leak the value through ANY path in the serialized document', async () => {
        await db.settings.put({ key: AGENT_ENDPOINT_TOKEN_KEY, value: SENTINEL_TOKEN })
        await db.settings.put({ key: AGENT_ENDPOINT_URL_KEY, value: SENTINEL_URL })
        // Realistic company: ordinary settings alongside the secrets.
        await db.settings.put({ key: 'appName', value: 'Combat OS' })
        await db.sessions.add({ date: '2026-07-01', day: 1, phase: 1, hipScore: 3 })

        const out = await exportFullBackup()
        const serialized = JSON.stringify(out)

        // Blunt on purpose — see the file header.
        expect(serialized).not.toContain(SENTINEL_TOKEN)
        expect(serialized).not.toContain(SENTINEL_URL)
        expect(serialized).not.toContain('SENTINEL-HOST')

        // ...and the non-secret data still survives, so this is redaction and
        // not an accidental wipe of the settings table.
        expect(out.tables.settings).toEqual([{ key: 'appName', value: 'Combat OS' }])
        expect(out.tables.sessions).toHaveLength(1)
    })

    it('names what it withheld, so a restore can tell the user what to reconfigure', async () => {
        await db.settings.put({ key: AGENT_ENDPOINT_TOKEN_KEY, value: SENTINEL_TOKEN })

        const out = await exportFullBackup()

        expect(out.redactedSettings).toEqual([AGENT_ENDPOINT_TOKEN_KEY])
    })

    it('emits an empty redaction list when no credential is configured', async () => {
        await db.settings.put({ key: 'appName', value: 'Combat OS' })

        const out = await exportFullBackup()

        expect(out.redactedSettings).toEqual([])
        expect(out.tables.settings).toHaveLength(1)
    })

    it('POSITIVE CONTROL — the same value under a NON-sensitive key does appear', async () => {
        // Guards against the sentinel above passing vacuously. A string search
        // that never finds anything proves nothing: if the export were broken,
        // or the serialization empty, or the key never written, "not present"
        // would still pass. Storing the identical value under an ordinary key
        // must therefore FIND it — which shows the search works and that
        // redaction, not accident, is what removes it in the test above.
        await db.settings.put({ key: 'appName', value: SENTINEL_TOKEN })

        const out = await exportFullBackup()

        expect(JSON.stringify(out)).toContain(SENTINEL_TOKEN)
        expect(out.redactedSettings).toEqual([])
    })
})
