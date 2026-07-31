/**
 * useMoreBackNavigation.js — Android hardware-Back support for the More hub (W29).
 *
 * WHY THIS EXISTS
 * The app has no router: every navigation is React state (AppShell.jsx), so
 * no history entry is created for a hub or tab change and nothing answers the
 * Android back gesture. At the initial history entry, Back backgrounds or
 * closes the installed PWA. That is tolerable for flat hubs, but W29 adds
 * drill-down — and "I pressed Back on a detail screen and the app closed" is
 * a trap, not a quirk.
 *
 * THE CONTRACT
 * Push exactly ONE history entry when a detail screen opens; consume it on the
 * way out. Both failure modes trap the user in opposite directions:
 *   - pushing per render stacks entries, so Back appears broken (several
 *     presses to escape one screen);
 *   - pushing none lets Back close the app from a detail screen.
 * The decision itself lives in `shouldPushHistoryEntry` (utils/moreNav.js) and
 * is directly unit-tested; this module is the thin DOM wiring around it.
 *
 * WHY THE WIRING ISN'T UNIT-TESTED HERE
 * The suite runs in `environment: 'node'` with no DOM and no React testing
 * library (app/vitest.config.js) — a standing decision that React-render
 * infrastructure is its own call, not something to introduce as a side effect
 * of a feature branch. So the predicate is tested and the wiring is verified
 * on a real installed Android PWA. That device check is a REQUIRED part of
 * this PR, not a nice-to-have.
 *
 * IMPORTANT: `goBack()` does not set state directly. It calls history.back(),
 * which fires popstate, which returns to the menu — one single path in and out,
 * so the in-app Back control and the hardware gesture can never disagree about
 * whether the pushed entry was consumed.
 */
import { useCallback, useEffect, useRef } from 'react'
import { MENU_SCREEN, shouldPushHistoryEntry } from '../utils/moreNav.js'

const MARKER = 'combatosMoreDetail'

export function useMoreBackNavigation(screen, goToMenu) {
    const pushedRef = useRef(false)
    // Latest-ref pattern: keeps the popstate listener registered ONCE for the
    // hub's lifetime instead of re-binding whenever the caller re-renders with
    // a new closure. Re-binding mid-gesture is how these bridges drop events.
    const goToMenuRef = useRef(goToMenu)
    useEffect(() => { goToMenuRef.current = goToMenu })

    useEffect(() => {
        const onPop = () => {
            // Our entry (or an ancestor's) was popped. Either way the correct
            // state for this hub is the menu, and our entry is no longer live.
            pushedRef.current = false
            goToMenuRef.current()
        }
        window.addEventListener('popstate', onPop)
        return () => window.removeEventListener('popstate', onPop)
    }, [])

    useEffect(() => {
        if (shouldPushHistoryEntry(screen, pushedRef.current)) {
            // Same URL: this is a nav-state marker, not a route. The app has
            // no URL-addressable screens and adding one here would collide
            // with the Supabase magic-link intake that already reads the URL.
            window.history.pushState({ [MARKER]: true }, '')
            pushedRef.current = true
        }
    }, [screen])

    // Leaving the hub with a detail open (bottom-nav tap) must not strand the
    // entry — otherwise the next Back press would silently consume it and look
    // like a dead gesture. The popstate listener is already torn down by the
    // time this runs, so no state update is attempted on an unmounted tree.
    useEffect(() => () => {
        if (pushedRef.current) {
            pushedRef.current = false
            window.history.back()
        }
    }, [])

    return useCallback(() => {
        if (pushedRef.current) {
            window.history.back()   // → popstate → goToMenu
        } else {
            // Defensive: no entry of ours to consume (e.g. an ancestor popped
            // first). Fall back to a direct state change rather than calling
            // history.back() and navigating the user out of the app.
            goToMenuRef.current()
        }
    }, [])
}

export { MENU_SCREEN }
