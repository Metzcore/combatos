import { describe, it, expect } from 'vitest'
import { GUIDE_CARD_STORAGE_KEY, shouldShowGuideCard, parseDismissed } from './guideCard.js'

describe('shouldShowGuideCard', () => {
    it('shows for a new user with no workout in progress', () => {
        expect(shouldShowGuideCard({ dismissed: false, workoutActive: false })).toBe(true)
    })

    it('stays hidden once dismissed', () => {
        expect(shouldShowGuideCard({ dismissed: true, workoutActive: false })).toBe(false)
    })

    it('never shows during an active workout', () => {
        expect(shouldShowGuideCard({ dismissed: false, workoutActive: true })).toBe(false)
    })

    it('defaults to showing when given nothing', () => {
        expect(shouldShowGuideCard()).toBe(true)
        expect(shouldShowGuideCard({})).toBe(true)
    })
})

describe('parseDismissed', () => {
    it('reads only "1" as dismissed', () => {
        expect(parseDismissed('1')).toBe(true)
        for (const raw of [null, undefined, '', '0', 'true', 1]) {
            expect(parseDismissed(raw)).toBe(false)
        }
    })
})

describe('storage key', () => {
    it('is the agreed per-device key', () => {
        expect(GUIDE_CARD_STORAGE_KEY).toBe('combatos.guideCardDismissed')
    })
})
