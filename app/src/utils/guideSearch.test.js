import { describe, it, expect } from 'vitest'
import { searchGuide, queryTokens } from './guideSearch.js'

const A = (over) => ({ id: 'a', section: 's', title: 'T', summary: 'S', keywords: [], ...over })

const ARTICLES = [
    A({ id: 'one', title: 'Log a workout for a past day', summary: 'Forgot to log?', keywords: ['yesterday'] }),
    A({ id: 'two', title: 'Back up my data', summary: 'Save a copy', body: ['Your checklist lives only on this phone.'] }),
    A({ id: 'three', title: 'Install on an iPhone', summary: 'Home screen', steps: ['Tap Add to Home Screen.'] }),
    A({ id: 'four', title: 'Weight', summary: 'x', points: ['Switch between kg and lb.'] }),
]

describe('searchGuide', () => {
    it('returns every article for an empty or blank query', () => {
        expect(searchGuide(ARTICLES, '')).toBe(ARTICLES)
        expect(searchGuide(ARTICLES, '   ')).toBe(ARTICLES)
        expect(searchGuide(ARTICLES, undefined)).toBe(ARTICLES)
    })

    it('matches title, summary, keywords, body, points and steps', () => {
        expect(searchGuide(ARTICLES, 'past day').map(a => a.id)).toEqual(['one'])
        expect(searchGuide(ARTICLES, 'save a copy').map(a => a.id)).toEqual(['two'])
        expect(searchGuide(ARTICLES, 'yesterday').map(a => a.id)).toEqual(['one'])
        expect(searchGuide(ARTICLES, 'checklist').map(a => a.id)).toEqual(['two'])
        expect(searchGuide(ARTICLES, 'lb').map(a => a.id)).toEqual(['four'])
        expect(searchGuide(ARTICLES, 'add to home screen').map(a => a.id)).toEqual(['three'])
    })

    it('is case-insensitive', () => {
        expect(searchGuide(ARTICLES, 'BACK UP').map(a => a.id)).toEqual(['two'])
    })

    it('requires every word to match, in any order', () => {
        expect(searchGuide(ARTICLES, 'day past log').map(a => a.id)).toEqual(['one'])
        expect(searchGuide(ARTICLES, 'log banana')).toEqual([])
    })

    it('puts title matches first, otherwise keeps order', () => {
        const list = [
            A({ id: 'x', title: 'Other', summary: 'mentions timer here' }),
            A({ id: 'y', title: 'Timer basics' }),
        ]
        expect(searchGuide(list, 'timer').map(a => a.id)).toEqual(['y', 'x'])
    })

    it('tolerates a missing list and non-string entries', () => {
        expect(searchGuide(null, 'x')).toEqual([])
        expect(searchGuide([A({ keywords: [null, 5] })], 'zzz')).toEqual([])
    })
})

describe('queryTokens', () => {
    it('lower-cases and splits on whitespace', () => {
        expect(queryTokens('  Log   PAST day ')).toEqual(['log', 'past', 'day'])
        expect(queryTokens(42)).toEqual([])
    })
})
