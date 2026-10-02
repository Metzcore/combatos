import { describe, it, expect } from 'vitest'
import { GUIDE_SECTIONS, GUIDE_ARTICLES } from './guideContent.js'

const sectionIds = GUIDE_SECTIONS.map(s => s.id)
const ids = GUIDE_ARTICLES.map(a => a.id)
const contentLists = a => [a.body, a.points, a.steps].filter(l => l !== undefined)
const allText = a => [a.title, a.summary, ...(a.keywords || []), ...(a.body || []), ...(a.points || []), ...(a.steps || [])]

describe('guide content integrity', () => {
    it('has the five sections, each with a title and blurb', () => {
        expect(sectionIds).toEqual(['start', 'hubs', 'howto', 'trouble', 'new'])
        for (const s of GUIDE_SECTIONS) {
            expect(s.title.trim()).not.toBe('')
            expect(s.blurb.trim()).not.toBe('')
        }
    })

    it('has unique article ids', () => {
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('puts every article in a known section, and every section has articles', () => {
        for (const a of GUIDE_ARTICLES) expect(sectionIds).toContain(a.section)
        for (const id of sectionIds) {
            expect(GUIDE_ARTICLES.some(a => a.section === id)).toBe(true)
        }
    })

    it('gives every article a title, summary, keywords and some content', () => {
        for (const a of GUIDE_ARTICLES) {
            expect(typeof a.title === 'string' && a.title.trim() !== '').toBe(true)
            expect(typeof a.summary === 'string' && a.summary.trim() !== '').toBe(true)
            expect(Array.isArray(a.keywords) && a.keywords.length > 0).toBe(true)
            expect(contentLists(a).some(l => Array.isArray(l) && l.length > 0)).toBe(true)
        }
    })

    it('has no empty or blank strings or lists', () => {
        for (const a of GUIDE_ARTICLES) {
            for (const l of [...contentLists(a), a.keywords, a.related].filter(l => l !== undefined)) {
                expect(Array.isArray(l)).toBe(true)
                expect(l.length).toBeGreaterThan(0)
                for (const s of l) {
                    expect(typeof s).toBe('string')
                    expect(s.trim()).not.toBe('')
                }
            }
        }
    })

    it('links only to other existing articles', () => {
        for (const a of GUIDE_ARTICLES) {
            for (const r of a.related || []) {
                expect(ids).toContain(r)
                expect(r).not.toBe(a.id)
            }
        }
    })

    it("dates What's new entries, newest first, and nothing else", () => {
        const news = GUIDE_ARTICLES.filter(a => a.section === 'new')
        for (const a of GUIDE_ARTICLES) {
            if (a.section === 'new') expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            else expect(a.date).toBeUndefined()
        }
        const dates = news.map(a => a.date)
        expect(dates).toEqual([...dates].sort().reverse())
    })

    it('never mentions features that are not built', () => {
        const denylist = ['restart', 'change your password', 'change password', 'new version is ready']
        for (const a of GUIDE_ARTICLES) {
            const text = allText(a).join('\n').toLowerCase()
            for (const phrase of denylist) {
                expect(text, `${a.id} mentions "${phrase}"`).not.toContain(phrase)
            }
        }
    })
})
