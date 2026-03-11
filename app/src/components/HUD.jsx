/**
 * HUD.jsx — Main Fighter's OS Screen
 *
 * Renders the full workout HUD:
 *  - Selector row (Day, Phase, Hip Score)
 *  - Hip Alert banner
 *  - Mobility block
 *  - Strength + PAP block
 *  - Bag Work block
 *  - Cooldown block
 *  - Completeness % + Actions
 */

import { useState, useCallback } from 'react'
import { usePlaybook } from '../hooks/usePlaybook.js'
import { useDB } from '../db/index.jsx'
import MobilityBlock from './MobilityBlock.jsx'
import StrengthBlock from './StrengthBlock.jsx'
import BagBlock from './BagBlock.jsx'
import CoreBlock from './CoreBlock.jsx'
import CooldownBlock from './CooldownBlock.jsx'
import CompletenessBar from './CompletenessBar.jsx'
import FightGymDay from './FightGymDay.jsx'
import PhaseUnlockBanner from './PhaseUnlockBanner.jsx'

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6']
const HIP_LABELS = ['1 – Critical', '2 – High Alert', '3 – Moderate', '4 – Good', '5 – Excellent']
const PHASE_UNLOCK_THRESHOLD = 12

export default function HUD() {
    const { phase, setPhase, sessionCount, pendingSync, logSession, resetSession, appName, appSubtitle } = useDB()

    // ── Selectors ────────────────────────────────
    const [day, setDay] = useState(1)
    const [hipScore, setHipScore] = useState(3)

    // ── Workout state ────────────────────────────
    const [mobChecked, setMobChecked] = useState({})   // { slot: bool }
    const [strSets, setStrSets] = useState({})   // { 'ex1-s1': { kg:'', reps:'', papReps:'' } }
    const [coreSets, setCoreSets] = useState({})       // { 1: {ex, sets, reps}, ...}
    const [clrChecked, setClrChecked] = useState({})   // { slot: bool }
    const [bagRounds, setBagRounds] = useState('')
    const [bagCourse, setBagCourse] = useState('')
    const [bagModules, setBagModules] = useState('')
    const [bagWorkouts, setBagWorkouts] = useState('')
    const [notes, setNotes] = useState('')

    // ── Dynamic Gym Day state ────────────────────
    const [gymSessionType, setGymSessionType] = useState('Combat')
    const [altRows, setAltRows] = useState([])
    const [altDuration, setAltDuration] = useState('')

    // ── Playbook data ────────────────────────────
    const workout = usePlaybook(phase, day, hipScore)

    // ── Phase unlock check ────────────────────────
    const gymSessionsThisPhase = sessionCount[phase] || 0
    const phaseUnlocked = gymSessionsThisPhase >= PHASE_UNLOCK_THRESHOLD && phase < 3

    // ── Completeness calculation ─────────────────
    const completeness = useCallback(() => {
        if (!workout || workout.isFightGymDay) return 0
        const mobDone = workout.mobSlots.filter((_, i) => mobChecked[i + 1]).length
        const clrDone = workout.clrSlots.filter((_, i) => clrChecked[i + 1]).length
        const maxMob = workout.mobSlots.length
        const maxClr = workout.clrSlots.length

        const strTotal = workout.strSlots.reduce((acc, s) => acc + s.sets * 2, 0)
        let strFilled = 0
        for (const key in strSets) {
            const { kg, reps, papReps } = strSets[key] || {}
            if (kg && kg !== '') strFilled++
            if (reps && reps !== '') strFilled++
            if (papReps && papReps !== '') strFilled++
        }

        const maxBag = 6
        const bagDone = Math.min(Number(bagRounds) || 0, maxBag)

        const total = maxMob + maxClr + strTotal + maxBag
        const done = mobDone + clrDone + strFilled + bagDone
        if (total === 0) return 0
        return Math.round((done / total) * 100 * 10) / 10
    }, [workout, mobChecked, clrChecked, strSets, bagRounds])

    // ── Log Session ──────────────────────────────
    const handleLog = useCallback(async () => {
        if (!workout) return
        const pct = completeness()

        const finalSessionType = workout.isFightGymDay ? gymSessionType : 'S&C'

        let altString = ''
        if (workout.isFightGymDay && gymSessionType !== 'Combat') {
            altString = altRows.map(r => `${r.name || 'Movement'} — ${r.v1 || ''} | ${r.v2 || ''} | ${r.v3 || ''}`).join('\n')
        }

        const strength = (workout.strSlots || []).map((s, idx) => ({
            ex: idx + 1,
            key: s.key,
            sets: [1, 2, 3, 4].map(setNum => {
                const entry = strSets[`ex${idx + 1}-s${setNum}`] || {}
                return { kg: Number(entry.kg) || '', reps: Number(entry.reps) || '', papReps: Number(entry.papReps) || '' }
            })
        }))
        await logSession({
            date: new Date().toISOString().slice(0, 10),
            day,
            phase,
            hipScore,
            sessionType: finalSessionType,
            strength,
            core: [1, 2, 3].map(rowNum => {
                const entry = coreSets[rowNum] || {}
                return { ex: entry.ex || '', sets: Number(entry.sets) || '', reps: Number(entry.reps) || '' }
            }).filter(c => c.ex !== ''),
            altSessionDetails: altString,
            sessionDuration: Number(altDuration) || 0,
            mobDone: Object.values(mobChecked).filter(Boolean).length,
            clrDone: Object.values(clrChecked).filter(Boolean).length,
            bagRounds: Number(bagRounds) || 0,
            bagCourse,
            bagModules,
            bagWorkouts,
            notes,
            completeness: pct
        })
        alert(`✅ Session logged!\nDay ${day} | Phase ${phase}\nCompleteness: ${pct}%`)
    }, [workout, completeness, strSets, coreSets, mobChecked, clrChecked, bagRounds, bagCourse, bagModules, bagWorkouts, notes, day, phase, hipScore, logSession])

    // ── Reset HUD ────────────────────────────────
    const handleReset = useCallback(() => {
        if (!confirm('Clear all inputs for next session? (Day and Phase are kept)')) return
        setMobChecked({})
        setStrSets({})
        setCoreSets({})
        setClrChecked({})
        setBagRounds('')
        setBagCourse('')
        setBagModules('')
        setBagWorkouts('')
        setNotes('')
        setHipScore(3)
        setGymSessionType('Combat')
        setAltRows([])
        setAltDuration('')
    }, [])

    return (
        <div className="app">
            {/* ── Header ──────────────────────────── */}
            <header className="page-header">
                <h1>⚔️ {appName}</h1>
                <div className="subtitle">{appSubtitle}</div>
            </header>

            <main className="content">
                {/* ── Phase unlock banner ────────────── */}
                {phaseUnlocked && (
                    <PhaseUnlockBanner
                        currentPhase={phase}
                        sessionsDone={gymSessionsThisPhase}
                        threshold={PHASE_UNLOCK_THRESHOLD}
                        onAdvance={() => setPhase(phase + 1)}
                    />
                )}

                {/* ── Selector row ───────────────────── */}
                <div className="selector-row">
                    <div className="selector-group">
                        <label>Day</label>
                        <select value={day} onChange={e => setDay(Number(e.target.value))}>
                            {DAY_LABELS.map((l, i) => (
                                <option key={i + 1} value={i + 1}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div className="selector-group">
                        <label>Phase</label>
                        <select value={phase} onChange={e => setPhase(Number(e.target.value))}>
                            <option value={1}>Phase 1</option>
                            <option value={2}>Phase 2</option>
                            <option value={3}>Phase 3</option>
                        </select>
                    </div>
                    <div className="selector-group">
                        <label>Hip Score</label>
                        <select value={hipScore} onChange={e => setHipScore(Number(e.target.value))}>
                            {HIP_LABELS.map((l, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Hip score status ────────────────── */}
                {hipScore <= 2 && (
                    <div className="hip-alert-banner">
                        🔴 HIGH ALERT — Hip protocol active. mobility exercises adjusted.
                    </div>
                )}
                {hipScore === 3 && (
                    <div className="badge badge-amber" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
                        🟡 MODERATE — Monitor closely
                    </div>
                )}
                {hipScore >= 4 && (
                    <div className="badge badge-green" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
                        🟢 GOOD — Standard protocol active
                    </div>
                )}

                {/* ── Fight Gym Day ────────────────────── */}
                {workout.isFightGymDay ? (
                    <FightGymDay
                        day={day}
                        sessionType={gymSessionType}
                        onSessionTypeChange={setGymSessionType}
                        bagRounds={bagRounds}
                        onBagRoundsChange={setBagRounds}
                        altRows={altRows}
                        onAltRowsChange={setAltRows}
                        altDuration={altDuration}
                        onAltDurationChange={setAltDuration}
                        notes={notes}
                        onNotesChange={setNotes}
                        onLog={handleLog}
                    />
                ) : (
                    <>
                        {/* ── Mobility ───────────────────── */}
                        <MobilityBlock
                            slots={workout.mobSlots}
                            checked={mobChecked}
                            onCheck={(slot, val) => setMobChecked(prev => ({ ...prev, [slot]: val }))}
                        />

                        {/* ── Strength + PAP ─────────────── */}
                        {workout.dailyFocus && (
                            <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.5px' }}>
                                🔥 {workout.dailyFocus}
                            </div>
                        )}
                        <StrengthBlock
                            slots={workout.strSlots}
                            sets={strSets}
                            onSetChange={(key, field, val) =>
                                setStrSets(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
                            }
                            phase={phase}
                            day={day}
                        />

                        {/* ── Bag Work ───────────────────── */}
                        <BagBlock
                            slot={workout.bagSlot}
                            bagRounds={bagRounds}
                            onBagRoundsChange={setBagRounds}
                            bagCourse={bagCourse}
                            onBagCourseChange={setBagCourse}
                            bagModules={bagModules}
                            onBagModulesChange={setBagModules}
                            bagWorkouts={bagWorkouts}
                            onBagWorkoutsChange={setBagWorkouts}
                            notes={notes}
                            onNotesChange={setNotes}
                        />

                        {/* ── Core & Accessories ─────────── */}
                        <CoreBlock
                            sets={coreSets}
                            onSetChange={(rowNum, field, val) =>
                                setCoreSets(prev => ({ ...prev, [rowNum]: { ...prev[rowNum], [field]: val } }))
                            }
                        />

                        {/* ── Cooldown ───────────────────── */}
                        <CooldownBlock
                            slots={workout.clrSlots}
                            checked={clrChecked}
                            onCheck={(slot, val) => setClrChecked(prev => ({ ...prev, [slot]: val }))}
                        />

                        {/* ── Completeness ───────────────── */}
                        <CompletenessBar pct={completeness()} />
                    </>
                )}

                {/* ── Pending sync indicator ──────────── */}
                {pendingSync > 0 && (
                    <div className="sync-indicator">
                        ⏳ {pendingSync} session{pendingSync > 1 ? 's' : ''} pending sync to Google Sheets
                    </div>
                )}

                {/* ── Actions ─────────────────────────── */}
                <div className="actions-bar">
                    <button className="btn-primary" onClick={handleLog}>▶ LOG SESSION</button>
                    <button className="btn-secondary" onClick={handleReset}>↺ RESET HUD</button>
                </div>
            </main>
        </div>
    )
}
