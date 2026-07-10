// Bottom-nav hub buttons, in slot order (W19 §6 rulings / W20 shell).
const HUB_BUTTONS = [
    { key: 'train', icon: '⚔️', label: 'Train' },
    { key: 'timer', icon: '⏱️', label: 'Timer' },
    { key: 'log', icon: '📅', label: 'Log' },
    { key: 'checklist', icon: '☑️', label: 'Checklist' },
    { key: 'settings', icon: '⚙️', label: 'Settings' }
]

export default function BottomNav({ activeHub, onChange }) {
    return (
        <nav className="bottom-nav" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {HUB_BUTTONS.map(b => (
                <button
                    key={b.key}
                    className={activeHub === b.key ? 'active' : ''}
                    onClick={() => onChange(b.key)}
                >
                    <span className="bottom-nav__icon">{b.icon}</span>
                    <span>{b.label}</span>
                </button>
            ))}
        </nav>
    )
}
