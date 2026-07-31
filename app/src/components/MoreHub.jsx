/**
 * MoreHub.jsx — slot-5 hub wrapper (W29), replacing the flat Settings screen.
 *
 * Unlike the other four hubs, More does NOT use the shared TopTabs bar. Its
 * six destinations are a hierarchical menu (row → screen → Back), not peer
 * tabs: six tab labels would not fit a 360px portrait bar, and a menu list
 * scales as the hub accumulates the odds and ends a "More" hub always does.
 * The row idiom follows the TRW reference recorded in
 * archive/Snippets-for-review/trw-app-more-tab.jpeg.
 *
 * The menu is a normal page, deliberately NOT a BottomSheet. BottomSheet is a
 * modal primitive — dimmed backdrop, 80vh cap, dismiss-on-tap-outside — which
 * suits contextual actions and pickers but not a primary hub, which needs
 * stable scroll, visible bottom navigation and a predictable Back.
 *
 * Screen selection is LOCAL and resets to the menu when the hub unmounts, the
 * opposite of the tabbed hubs' AppShell-owned selection. Returning to a
 * catch-all launcher should land you on the list, not back inside whatever you
 * last opened.
 *
 * Visual language (W29 visual pass): the `more-hub` root class scopes every
 * More-specific rule in index.css — the menu is one raised Strata slab with
 * hairline-separated rows and recessed icon wells; detail screens reuse the
 * same slab. `.more-hub__main` carries the short drill-down enter animation,
 * keyed on `screen` so it replays on each navigation and degrades to static
 * under prefers-reduced-motion.
 */
import { useCallback, useState } from 'react'
import { MENU_SCREEN, MORE_SCREENS, moreScreenMeta } from '../utils/moreNav.js'
import { useMoreBackNavigation } from '../hooks/useMoreBackNavigation.js'
import ProfileScreen from './more/ProfileScreen.jsx'
import SettingsScreen from './more/SettingsScreen.jsx'
import IgnitionScreen from './more/IgnitionScreen.jsx'
import BackupScreen from './more/BackupScreen.jsx'
import AgentScreen from './more/AgentScreen.jsx'
import AboutScreen from './more/AboutScreen.jsx'

const SCREENS = {
    profile: ProfileScreen,
    settings: SettingsScreen,
    ignition: IgnitionScreen,
    backup: BackupScreen,
    agent: AgentScreen,
    about: AboutScreen
}

/**
 * `initialScreen` lets another surface open a specific screen — the W30 weight
 * due-rail's "Log it" jumps straight to Profile rather than dropping the user
 * on the menu to find it themselves. It seeds `useState` only, so it does NOT
 * pin the screen: once inside, Back and the menu behave exactly as they do on
 * a normal entry. A defaulted-away invalid value falls back to the menu via
 * the same guard that protects any other unknown key.
 */
export default function MoreHub({ initialScreen = MENU_SCREEN }) {
    const [screen, setScreen] = useState(initialScreen)
    const goToMenu = useCallback(() => setScreen(MENU_SCREEN), [])
    const goBack = useMoreBackNavigation(screen, goToMenu)

    const meta = moreScreenMeta(screen)
    const Screen = SCREENS[screen]
    // An unknown key can only arrive via a future bug. Falling back to the
    // menu keeps the hub navigable; rendering nothing would strand the user
    // on a blank screen whose only escape is the bottom nav.
    const showMenu = screen === MENU_SCREEN || !meta || !Screen

    if (showMenu) {
        return (
            <div className="app more-hub">
                <header className="page-header">
                    <h1>⋯ More</h1>
                    <div className="subtitle">Settings, data and integrations</div>
                </header>

                <main key={MENU_SCREEN} className="content more-hub__main">
                    <nav className="more-menu" aria-label="More">
                        {MORE_SCREENS.map(s => (
                            <button
                                key={s.key}
                                type="button"
                                className="more-menu__row"
                                onClick={() => setScreen(s.key)}
                            >
                                <span className="more-menu__icon" aria-hidden="true">{s.icon}</span>
                                <span className="more-menu__text">
                                    <span className="more-menu__label">{s.label}</span>
                                    <span className="more-menu__blurb">{s.blurb}</span>
                                </span>
                                <span className="more-menu__chevron" aria-hidden="true">›</span>
                            </button>
                        ))}
                    </nav>
                </main>
            </div>
        )
    }

    return (
        <div className="app more-hub">
            <header className="page-header more-detail__header">
                <button
                    type="button"
                    className="more-detail__back"
                    onClick={goBack}
                    aria-label="Back to More"
                >
                    ‹
                </button>
                <div>
                    <h1>{meta.icon} {meta.label}</h1>
                    <div className="subtitle">{meta.blurb}</div>
                </div>
            </header>

            <main key={screen} className="content more-hub__main">
                <Screen />
            </main>
        </div>
    )
}
