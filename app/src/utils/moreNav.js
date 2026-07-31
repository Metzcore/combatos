/**
 * moreNav.js — pure screen definitions for the More hub (W29).
 *
 * The More hub deliberately does NOT use `HUB_TOP_TABS` / `TopTabs` like the
 * other four hubs do. Its menu-to-screen relationship is HIERARCHICAL (a menu
 * row drills into a screen, with a Back affordance), not a set of peer tabs.
 * Modelling it as top tabs would drag in the wrong component and the wrong
 * ARIA semantics (`role="tablist"` for what is really a navigation list), so
 * the two live in separate modules on purpose.
 *
 * Layer-2 selection for the tabbed hubs stays in navState.js and is owned by
 * AppShell so it survives hub switches. More's screen selection is
 * deliberately the opposite: it is LOCAL to MoreHub and resets to the menu
 * when you leave the hub, which is the right behaviour for a catch-all
 * launcher — you expect to land back on the list, not deep inside whatever
 * you last opened.
 */

export const MENU_SCREEN = 'menu'

/**
 * Menu rows, in display order. Each drills into one screen.
 * `icon` is presentational only — screen readers get the label.
 */
export const MORE_SCREENS = [
    { key: 'profile', icon: '👤', label: 'Profile', blurb: 'Account and check-ins' },
    { key: 'settings', icon: '🎨', label: 'Settings', blurb: 'App name and splash' },
    { key: 'ignition', icon: '🔖', label: 'Ignition', blurb: 'Saved and custom quotes' },
    { key: 'backup', icon: '💾', label: 'Backup & Data', blurb: 'Where your data lives' },
    { key: 'agent', icon: '🔌', label: 'Agent', blurb: 'Automated backup' },
    { key: 'about', icon: 'ℹ️', label: 'About & Help', blurb: 'Version and how this works' }
]

/** Every valid screen key, including the menu itself. */
export const MORE_SCREEN_KEYS = [MENU_SCREEN, ...MORE_SCREENS.map(s => s.key)]

/**
 * isMoreScreen — validates a screen key.
 *
 * Mirrors setHubTab's discipline in navState.js: an unknown key must never
 * reach component state, so callers can reject bad input by identity rather
 * than rendering a blank hub.
 */
export function isMoreScreen(key) {
    return MORE_SCREEN_KEYS.includes(key)
}

/** The row definition for a screen key, or undefined for the menu/unknown. */
export function moreScreenMeta(key) {
    return MORE_SCREENS.find(s => s.key === key)
}

/**
 * shouldPushHistoryEntry — the Android hardware-Back decision, kept pure.
 *
 * The app has no router, so nothing in it currently answers the Android back
 * gesture: pressing Back at the initial history entry backgrounds or closes
 * the installed PWA. Drill-down navigation makes that gap user-visible ("I
 * pressed back on a detail screen and it closed the app"), so MoreHub pushes
 * exactly ONE history entry when a detail opens and consumes it on the way
 * out.
 *
 * "Exactly one" is the whole contract. Pushing per-render would stack entries
 * and make Back appear broken (several presses to escape one screen); pushing
 * none would let Back close the app from a detail screen. Both failure modes
 * are trapping, which is why this predicate is pure and directly tested even
 * though the effect that consumes it cannot be (the suite runs in `node` with
 * no DOM — see the module note in useMoreBackNavigation.js).
 */
export function shouldPushHistoryEntry(screen, alreadyPushed) {
    return screen !== MENU_SCREEN && isMoreScreen(screen) && !alreadyPushed
}
