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

    // NOTE — no history.back() on unmount, deliberately.
    //
    // An earlier version popped the entry when the user left the hub with a
    // detail open, to stop stale entries accumulating. That is unshippable:
    // history.back() fires popstate ASYNCHRONOUSLY, so the cleanup pop can land
    // AFTER the next MoreHub has mounted, and the new instance reads it as
    // "the user pressed Back" and bounces to the menu. Reproduced in the
    // browser — open a More detail, tap another hub, then deep-link straight
    // into a detail (the W30 due rail's "Log it") and you land on the menu
    // instead of the screen you asked for.
    //
    // Neither `history.state` inspection nor a pending-pop counter fixes it
    // reliably: a cleanup pop and a genuine Back are indistinguishable to the
    // listener, and a counter is never decremented when the pop happens to fire
    // during the unmount→mount gap where no listener is registered — which then
    // poisons the NEXT real Back.
    //
    // The trade taken instead: leaving a detail via the bottom nav strands one
    // history entry, so the next hardware-Back press is a no-op before the app
    // closes. That is a small wart, bounded by how often anyone abandons a
    // detail screen, and strictly better than an in-app Back that silently
    // fails or a deep link that lands on the wrong screen. Revisit only with a
    // real router, or once DOM tests exist to prove a cleverer scheme.


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
