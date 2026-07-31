import { useState, useEffect, useRef } from 'react'
import { useDB } from '../db/index.jsx'
import { IGNITION_QUOTES } from '../data/ignition.js'
import { mergeIgnitions } from '../utils/customIgnitions.js'

export default function DailyIgnition() {
    const {
        dailyIgnitionEnabled, ignitionHasShown, setIgnitionHasShown,
        bookmarkedIgnitions, toggleIgnitionBookmark, customIgnitions,
    } = useDB()
    const [quote, setQuote] = useState(null)
    const [fading, setFading] = useState(false)
    const timeoutRef = useRef(null)

    // W29 PR D — the splash must pick from bundled + user-authored quotes
    // alike; that is the whole point of custom ignitions existing.
    const allQuotes = mergeIgnitions(IGNITION_QUOTES, customIgnitions)

    useEffect(() => {
        // Prevent Daily Ignition in browser tabs to ensure native PWA install UI is not blocked
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        if (!isStandalone) {
            setIgnitionHasShown(true);
            return;
        }

        if (!dailyIgnitionEnabled || ignitionHasShown) return;
        if (allQuotes.length === 0) return;

        // Pick random quote (bundled + custom, merged)
        const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)]
        setQuote(randomQuote)

        timeoutRef.current = setTimeout(() => {
            setFading(true)
            setTimeout(() => {
                setIgnitionHasShown(true)
            }, 300) // matches transition duration
        }, 5000)

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
        // allQuotes is intentionally NOT a dependency: it's a derived array
        // (new identity each render), and re-running this effect on every
        // customIgnitions mutation would re-roll and re-show the splash
        // mid-session, which is not the intent. dailyIgnitionEnabled/
        // ignitionHasShown/setIgnitionHasShown are the only real triggers,
        // matching the pre-existing dependency list.
    }, [dailyIgnitionEnabled, ignitionHasShown, setIgnitionHasShown])

    if (!quote || ignitionHasShown || !dailyIgnitionEnabled) return null;

    const handleDismiss = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setFading(true)
        setTimeout(() => setIgnitionHasShown(true), 300)
    }

    const isBookmarked = bookmarkedIgnitions.includes(quote.id)

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(5, 5, 5, 0.98)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.3s ease-out',
            color: 'var(--text)'
        }}>
            <button 
                onClick={handleDismiss}
                style={{
                    position: 'absolute',
                    top: '2rem',
                    right: '2rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--dim)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '10px'
                }}
            >
                ✕
            </button>
            
            <p style={{
                fontSize: '1.5rem',
                lineHeight: 1.4,
                textAlign: 'center',
                fontWeight: 600,
                maxWidth: '600px',
                marginBottom: '2.5rem',
                fontStyle: 'italic',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
                "{quote.text}"
            </p>

            <button 
                onClick={() => toggleIgnitionBookmark(quote.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: isBookmarked ? 'var(--alert)' : 'var(--dim)',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    padding: '10px'
                }}
            >
                {isBookmarked ? '★' : '☆'}
            </button>
        </div>
    )
}
