import { describe, it, expect } from 'vitest'
import { formatBuildLabel, currentBuildLabel } from './buildLabel.js'

describe('formatBuildLabel', () => {
    it('formats date and short commit', () => {
        expect(formatBuildLabel({ commit: '4c5551b', builtAt: '2026-10-02T14:30:00.000Z' }))
            .toBe('2 Oct 2026 · 4c5551b')
    })

    it('uses UTC so every device reads the same label', () => {
        expect(formatBuildLabel({ commit: 'abc1234', builtAt: '2026-01-31T23:59:59.000Z' }))
            .toBe('31 Jan 2026 · abc1234')
        expect(formatBuildLabel({ commit: 'abc1234', builtAt: '2026-02-01T00:00:00.000Z' }))
            .toBe('1 Feb 2026 · abc1234')
    })

    it('keeps the "dev" fallback commit', () => {
        expect(formatBuildLabel({ commit: 'dev', builtAt: '2026-10-02T00:00:00.000Z' }))
            .toBe('2 Oct 2026 · dev')
    })

    it('degrades to whichever half is usable', () => {
        expect(formatBuildLabel({ commit: '4c5551b', builtAt: 'not a date' })).toBe('4c5551b')
        expect(formatBuildLabel({ commit: '', builtAt: '2026-10-02T00:00:00.000Z' })).toBe('2 Oct 2026')
    })

    it('never throws on a missing stamp', () => {
        expect(formatBuildLabel(null)).toBe('unknown')
        expect(formatBuildLabel(undefined)).toBe('unknown')
        expect(formatBuildLabel({})).toBe('unknown')
    })

    it('currentBuildLabel is safe where the build constant was never defined', () => {
        expect(typeof currentBuildLabel()).toBe('string')
    })
})
