import { useState } from 'react'
import { useDB } from '../db/index.jsx'
import BasicTimer from './BasicTimer.jsx'
import RoundsTimer from './RoundsTimer.jsx'

export default function Timer() {
    const [activeMode, setActiveMode] = useState('basic') // 'basic' | 'rounds'

    return (
        <div className="app" style={{ transition: 'background-color 1s ease-out' }}>
            <header className="page-header" style={{ paddingBottom: 10 }}>
                <h1>⏱️ Timer</h1>
                <div className="subtitle">Stopwatch & Rounds</div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                    <button 
                        className={activeMode === 'basic' ? 'btn-primary' : 'btn-secondary'} 
                        style={{ flex: 1, padding: '10px 0', fontSize: '0.9rem' }}
                        onClick={() => setActiveMode('basic')}
                    >
                        Basic
                    </button>
                    <button 
                        className={activeMode === 'rounds' ? 'btn-primary' : 'btn-secondary'} 
                        style={{ flex: 1, padding: '10px 0', fontSize: '0.9rem' }}
                        onClick={() => setActiveMode('rounds')}
                    >
                        Custom Rounds
                    </button>
                </div>
            </header>

            {activeMode === 'basic' && <BasicTimer />}
            {activeMode === 'rounds' && <RoundsTimer />}
        </div>
    )
}
