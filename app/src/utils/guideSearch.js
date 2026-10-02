/**
 * utils/guideSearch.js — search over the in-app Guide (W39). Pure.
 *
 * Plain, case-insensitive substring matching — the same idea as the Notes
 * search (utils/noteFilter.js) — with no dependency. The query is split on
 * whitespace and an article matches when EVERY word is found somewhere in its
 * title, summary, keywords, body, points or steps. That lets "log past day"
 * find "Log a workout for a past day". An empty query returns every article.
 */

/** Everything searchable about one article, lower-cased, as one string. */
export function articleHaystack(article) {
    const parts = [
        article?.title,
        article?.summary,
        ...(article?.keywords || []),
        ...(article?.body || []),
        ...(article?.points || []),
        ...(article?.steps || []),
    ]
    return parts.filter(p => typeof p === 'string').join('\n').toLowerCase()
}

/** Lower-cased query words; empty array for a blank or non-string query. */
export function queryTokens(query) {
    if (typeof query !== 'string') return []
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * @param {object[]} articles
 * @param {string} query
 * @returns {object[]} matching articles. Articles whose title contains the
 *   whole query come first; otherwise the original order is kept.
 */
export function searchGuide(articles, query) {
    const list = Array.isArray(articles) ? articles : []
    const tokens = queryTokens(query)
    if (tokens.length === 0) return list

    const matches = list.filter(a => {
        const hay = articleHaystack(a)
        return tokens.every(t => hay.includes(t))
    })

    const whole = tokens.join(' ')
    const titleHit = a => typeof a.title === 'string' && a.title.toLowerCase().includes(whole)
    return [...matches.filter(titleHit), ...matches.filter(a => !titleHit(a))]
}
