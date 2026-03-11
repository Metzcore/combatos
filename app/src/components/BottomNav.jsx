export default function BottomNav({ activeTab, onChange }) {
    return (
        <nav className="bottom-nav" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <button
                className={activeTab === 'hud' ? 'active' : ''}
                onClick={() => onChange('hud')}
            >
                <span className="bottom-nav__icon">⚔️</span>
                <span>HUD</span>
            </button>
            <button
                className={activeTab === 'timer' ? 'active' : ''}
                onClick={() => onChange('timer')}
            >
                <span className="bottom-nav__icon">⏱️</span>
                <span>Timer</span>
            </button>
            <button
                className={activeTab === 'calendar' ? 'active' : ''}
                onClick={() => onChange('calendar')}
            >
                <span className="bottom-nav__icon">📅</span>
                <span>Log</span>
            </button>
            <button
                className={activeTab === 'playbook' ? 'active' : ''}
                onClick={() => onChange('playbook')}
            >
                <span className="bottom-nav__icon">📖</span>
                <span>Playbook</span>
            </button>
            <button
                className={activeTab === 'settings' ? 'active' : ''}
                onClick={() => onChange('settings')}
            >
                <span className="bottom-nav__icon">⚙️</span>
                <span>Settings</span>
            </button>
        </nav>
    )
}
