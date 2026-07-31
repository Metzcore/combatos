/**
 * navState.js — pure hub / top-tab navigation state logic (W20).
 *
 * Extracted from AppShell so the tab-state shape and its update rule can be
 * unit-tested with plain Vitest (node env, no DOM). AppShell owns the actual
 * useState; this module owns the keys, defaults, and the update rule.
 *
 * Layer-2 selection (which top tab is active inside a hub) deliberately lives
 * ABOVE the hub components: hubs fully unmount on hub switch, so any tab
 * state kept inside them would reset (that was the pre-W20 behavior of the
 * Timer and Log toggles). It resets on a full page reload by design — same
 * lifetime as the active-hub selection itself.
 */

// Bottom-nav hubs, in slot order (W19 §6 rulings).
// W29: slot 5 `settings` → `more`. The hub grew from one flat page into a
// menu of six screens, so the label now describes the hub rather than one of
// its rows (Settings is still in there, as a row).
export const HUBS = ['train', 'timer', 'log', 'checklist', 'more']

export const DEFAULT_HUB = 'train'

// Layer-2 top-tab definitions per hub. Hubs absent here (more) have no top
// tabs. A10 gives Train the user-facing Today / Plan / Library contract; the
// other labels preserve their existing hub language.
//
// W29: `more` is deliberately absent. Its menu-to-screen relationship is
// hierarchical, not peer tabs — those screen keys live in utils/moreNav.js and
// are owned locally by MoreHub. Adding `more` here would render a TopTabs bar
// with the wrong ARIA semantics for what is really a navigation list.
export const HUB_TOP_TABS = {
    train: [
        { key: 'today', label: 'Today' },
        { key: 'plan', label: 'Plan' },
        { key: 'library', label: 'Library' }
    ],
    timer: [
        { key: 'basic', label: 'Basic' },
        { key: 'rounds', label: 'Custom Rounds' }
    ],
    log: [
        // W26: labels renamed for the Log-hub rebuild (History = the detail
        // record, Overview = the pattern view). The KEYS stay 'log'/'stats' —
        // they are matched literally in Calendar.jsx and validated by
        // setHubTab, so renaming them would risk a silent fallthrough.
        { key: 'log', label: 'History' },
        { key: 'stats', label: 'Overview' }
    ],
    checklist: [
        { key: 'checklist', label: 'Checklist' },
        { key: 'notes', label: 'Notes' }
    ]
}

/**
 * Initial Layer-2 selection: the first tab of every hub that has top tabs.
 * { train: 'today', timer: 'basic', log: 'log', checklist: 'checklist' }
 */
export function initialTopTabs() {
    const out = {}
    for (const hub of Object.keys(HUB_TOP_TABS)) {
        out[hub] = HUB_TOP_TABS[hub][0].key
    }
    return out
}

/**
 * setHubTab — pure update rule for Layer-2 selection.
 *
 * Returns a new state object with `hub`'s selection set to `tab`, leaving
 * every other hub's selection untouched (so e.g. switching the Timer tab
 * never disturbs which Train tab you were on).
 *
 * Invalid input (unknown hub, or a tab that hub doesn't have) returns the
 * SAME state reference unchanged, so a bad call can never corrupt nav state
 * or cause a spurious re-render. A no-op update (tab already active) also
 * returns the same reference.
 */
export function setHubTab(state, hub, tab) {
    const tabs = HUB_TOP_TABS[hub]
    if (!tabs || !tabs.some(t => t.key === tab)) return state
    if (state[hub] === tab) return state
    return { ...state, [hub]: tab }
}
