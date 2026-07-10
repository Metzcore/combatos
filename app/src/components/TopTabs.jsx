/**
 * TopTabs.jsx — shared Layer-2 top-tab bar (W20).
 *
 * Used by the Train, Timer, and Log hubs (Checklist later, per W21).
 * Presentational only: selection state lives in AppShell (see
 * utils/navState.js). Underline indicator on the active tab in CombatOS
 * tactical amber (--accent) — CombatOS's own visual language, per the
 * W19 ruling (paradigm adopted from TRW, styling deliberately not).
 */
export default function TopTabs({ tabs, active, onChange }) {
    return (
        <div className="top-tabs" role="tablist">
            {tabs.map(t => (
                <button
                    key={t.key}
                    role="tab"
                    aria-selected={active === t.key}
                    className={`top-tabs__tab${active === t.key ? ' active' : ''}`}
                    onClick={() => onChange(t.key)}
                >
                    {t.label}
                </button>
            ))}
        </div>
    )
}
