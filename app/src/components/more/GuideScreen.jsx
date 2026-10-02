/**
 * GuideScreen.jsx — More › Guide (W39).
 *
 * One flat screen: a search box, then the five sections, each opening in
 * place, with articles opening in place inside them. There are NO navigation
 * levels, so Android hardware Back and the ‹ in the header both do exactly
 * what they do on every other More screen (useMoreBackNavigation pushes one
 * history entry; this screen never pushes another). Expanding and collapsing
 * is local state, not navigation, and "Related" links open the target article
 * in place without touching history.
 *
 * Content is bundled data (data/guide/guideContent.js); search is the pure
 * utils/guideSearch.js. Articles render with conditional mounting rather than
 * the `.card__body` max-height trick, so a long article can never clip.
 */
import { useEffect, useState } from 'react'
import { GUIDE_SECTIONS, GUIDE_ARTICLES } from '../../data/guide/guideContent.js'
import { searchGuide } from '../../utils/guideSearch.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-10-02" -> "2 Oct 2026", by string maths (never new Date(dateStr)). */
function formatNewsDate(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '')
    if (!m) return ''
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}

const ARTICLES_BY_ID = Object.fromEntries(GUIDE_ARTICLES.map(a => [a.id, a]))
const SECTION_TITLE = Object.fromEntries(GUIDE_SECTIONS.map(s => [s.id, s.title]))

function ArticleBody({ article, onOpenRelated }) {
    return (
        <div className="guide-article__body">
            {article.date && <div className="guide-article__date">{formatNewsDate(article.date)}</div>}
            {(article.body || []).map((p, i) => <p key={`b${i}`}>{p}</p>)}
            {article.points && (
                <ul>{article.points.map((p, i) => <li key={`p${i}`}>{p}</li>)}</ul>
            )}
            {article.steps && (
                <ol>{article.steps.map((s, i) => <li key={`s${i}`}>{s}</li>)}</ol>
            )}
            {article.related && article.related.length > 0 && (
                <div className="guide-article__related">
                    <span>Related</span>
                    {article.related.map(id => (
                        <button key={id} type="button" onClick={() => onOpenRelated(id)}>
                            {ARTICLES_BY_ID[id]?.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function ArticleRow({ article, open, onToggle, onOpenRelated, showSection }) {
    return (
        <div className={`guide-article${open ? ' guide-article--open' : ''}`} id={`guide-article-${article.id}`}>
            <button type="button" className="guide-article__head" onClick={onToggle} aria-expanded={open}>
                <span className="guide-article__text">
                    {showSection && <span className="guide-article__section">{SECTION_TITLE[article.section]}</span>}
                    <span className="guide-article__title">{article.title}</span>
                    <span className="guide-article__summary">{article.summary}</span>
                </span>
                <span className="guide-article__chevron" aria-hidden="true">{open ? '▾' : '›'}</span>
            </button>
            {open && <ArticleBody article={article} onOpenRelated={onOpenRelated} />}
        </div>
    )
}

export default function GuideScreen() {
    const [query, setQuery] = useState('')
    const [openSections, setOpenSections] = useState(() => new Set(['start']))
    const [openArticleId, setOpenArticleId] = useState(null)
    const [scrollToId, setScrollToId] = useState(null)

    const searching = query.trim() !== ''
    const results = searching ? searchGuide(GUIDE_ARTICLES, query) : null

    // After a "Related" jump, scroll the target into view once it has rendered.
    useEffect(() => {
        if (!scrollToId) return
        const el = document.getElementById(`guide-article-${scrollToId}`)
        if (el) el.scrollIntoView({ block: 'start' })
        setScrollToId(null)
    }, [scrollToId])

    const toggleSection = id => setOpenSections(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    })

    const toggleArticle = id => setOpenArticleId(prev => (prev === id ? null : id))

    const openRelated = id => {
        const target = ARTICLES_BY_ID[id]
        if (!target) return
        setQuery('')
        setOpenSections(prev => new Set(prev).add(target.section))
        setOpenArticleId(id)
        setScrollToId(id)
    }

    return (
        <>
            <div className="guide-search">
                <input
                    type="search"
                    className="notes-search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search the guide…"
                    aria-label="Search the guide"
                />
            </div>

            {searching ? (
                results.length === 0 ? (
                    <div className="card guide-empty">
                        <p className="more-note">Nothing matches that. Try a shorter or simpler word.</p>
                    </div>
                ) : (
                    <div className="card guide-results" aria-live="polite">
                        {results.map(a => (
                            <ArticleRow
                                key={a.id}
                                article={a}
                                showSection
                                open={openArticleId === a.id}
                                onToggle={() => toggleArticle(a.id)}
                                onOpenRelated={openRelated}
                            />
                        ))}
                    </div>
                )
            ) : (
                GUIDE_SECTIONS.map(section => {
                    const open = openSections.has(section.id)
                    const articles = GUIDE_ARTICLES.filter(a => a.section === section.id)
                    return (
                        <div key={section.id} className={`card guide-section${open ? ' guide-section--open' : ''}`}>
                            <button
                                type="button"
                                className="guide-section__head"
                                onClick={() => toggleSection(section.id)}
                                aria-expanded={open}
                            >
                                <span className="guide-section__text">
                                    <span className="guide-section__title">{section.title}</span>
                                    <span className="guide-section__blurb">{section.blurb}</span>
                                </span>
                                <span className="guide-section__count">{articles.length}</span>
                                <span className="guide-article__chevron" aria-hidden="true">{open ? '▾' : '›'}</span>
                            </button>
                            {open && articles.map(a => (
                                <ArticleRow
                                    key={a.id}
                                    article={a}
                                    open={openArticleId === a.id}
                                    onToggle={() => toggleArticle(a.id)}
                                    onOpenRelated={openRelated}
                                />
                            ))}
                        </div>
                    )
                })
            )}
        </>
    )
}
