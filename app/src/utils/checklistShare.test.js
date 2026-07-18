/**
 * checklistShare.test.js — W23.5 delivery-outcome contract.
 *
 * Pins the three shareOrDownloadJson outcomes ('shared' | 'cancelled' |
 * 'downloaded') that the "last full backup" timestamp depends on, plus the
 * unchanged shareOrDownloadChecklist wrapper behavior (filename + title).
 *
 * Node test environment (no DOM): navigator, document, and the object-URL
 * half of URL are stubbed per test. `File` itself is a real Node global.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { shareOrDownloadJson, shareOrDownloadChecklist, shareOrDownloadNotes } from './checklistShare.js'
import { localDateStr } from './checklistDate.js'

const DATA = { hello: 'world' }

function stubAnchor() {
    const anchor = { href: '', download: '', click: vi.fn() }
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor) })
    vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:fake-url'),
        revokeObjectURL: vi.fn()
    })
    return anchor
}

function stubShare({ canShare = true, shareImpl }) {
    const share = vi.fn(shareImpl)
    vi.stubGlobal('navigator', { canShare: vi.fn(() => canShare), share })
    return share
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('shareOrDownloadJson — delivery outcomes', () => {
    it("returns 'shared' when the share sheet completes, without downloading", async () => {
        const anchor = stubAnchor()
        const share = stubShare({ shareImpl: async () => {} })

        const result = await shareOrDownloadJson(DATA, 'file.json')

        expect(result).toBe('shared')
        expect(share).toHaveBeenCalledTimes(1)
        const { files, title } = share.mock.calls[0][0]
        expect(files).toHaveLength(1)
        expect(files[0].name).toBe('file.json')
        expect(title).toBe('file.json') // title defaults to the filename
        expect(anchor.click).not.toHaveBeenCalled()
    })

    it("returns 'cancelled' on user AbortError — and does NOT fall through to download", async () => {
        const anchor = stubAnchor()
        const abort = new Error('user closed the sheet')
        abort.name = 'AbortError'
        stubShare({ shareImpl: async () => { throw abort } })

        const result = await shareOrDownloadJson(DATA, 'file.json')

        expect(result).toBe('cancelled')
        expect(anchor.click).not.toHaveBeenCalled()
        expect(URL.createObjectURL).not.toHaveBeenCalled()
    })

    it("returns 'downloaded' via the blob path when canShare is unavailable", async () => {
        const anchor = stubAnchor()
        vi.stubGlobal('navigator', {}) // desktop-style: no Web Share API

        const result = await shareOrDownloadJson(DATA, 'file.json')

        expect(result).toBe('downloaded')
        expect(anchor.download).toBe('file.json')
        expect(anchor.href).toBe('blob:fake-url')
        expect(anchor.click).toHaveBeenCalledTimes(1)
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
    })

    it('a NON-abort share failure falls through to the download', async () => {
        const anchor = stubAnchor()
        stubShare({ shareImpl: async () => { throw new TypeError('share broke') } })

        const result = await shareOrDownloadJson(DATA, 'file.json')

        expect(result).toBe('downloaded')
        expect(anchor.click).toHaveBeenCalledTimes(1)
    })

    it('serializes the payload as pretty-printed JSON', async () => {
        stubAnchor()
        const share = stubShare({ shareImpl: async () => {} })

        await shareOrDownloadJson(DATA, 'file.json')

        const file = share.mock.calls[0][0].files[0]
        expect(file.type).toBe('application/json')
        expect(await file.text()).toBe(JSON.stringify(DATA, null, 2))
    })
})

describe('shareOrDownloadChecklist — unchanged W22 wrapper behavior', () => {
    it('keeps the combatos-checklist-<local date> filename and W22 share title', async () => {
        stubAnchor()
        const share = stubShare({ shareImpl: async () => {} })

        const result = await shareOrDownloadChecklist(DATA)

        const { files, title } = share.mock.calls[0][0]
        expect(files[0].name).toBe(`combatos-checklist-${localDateStr()}.json`)
        expect(title).toBe('CombatOS Checklist Export')
        expect(result).toBeUndefined() // W22 signature: resolves with nothing
    })

    it('still swallows a user cancel silently (no download, no throw)', async () => {
        const anchor = stubAnchor()
        const abort = new Error('cancel')
        abort.name = 'AbortError'
        stubShare({ shareImpl: async () => { throw abort } })

        await expect(shareOrDownloadChecklist(DATA)).resolves.toBeUndefined()
        expect(anchor.click).not.toHaveBeenCalled()
    })
})

describe('shareOrDownloadNotes — W25 wrapper behavior', () => {
    it('keeps the combatos-notes-<local date> filename and W25 share title', async () => {
        stubAnchor()
        const share = stubShare({ shareImpl: async () => {} })

        const result = await shareOrDownloadNotes(DATA)

        const { files, title } = share.mock.calls[0][0]
        expect(files[0].name).toBe(`combatos-notes-${localDateStr()}.json`)
        expect(title).toBe('CombatOS Notes Export')
        expect(result).toBeUndefined() // same signature as shareOrDownloadChecklist
    })

    it('still swallows a user cancel silently (no download, no throw)', async () => {
        const anchor = stubAnchor()
        const abort = new Error('cancel')
        abort.name = 'AbortError'
        stubShare({ shareImpl: async () => { throw abort } })

        await expect(shareOrDownloadNotes(DATA)).resolves.toBeUndefined()
        expect(anchor.click).not.toHaveBeenCalled()
    })
})
