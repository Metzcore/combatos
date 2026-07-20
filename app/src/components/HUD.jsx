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
 *
 * Workout session state is now held in DBProvider (db/index.jsx) so it
 * survives tab switches. HUD remains the controller; all child components
 * remain presentational and receive props as before.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePlaybook } from '../hooks/usePlaybook.js'
import { db, useDB } from '../db/index.jsx'
import { nextDay } from '../utils/nextDay.js'
import { PHASE_UNLOCK_THRESHOLD, phaseReady, isPhaseSelectable } from '../utils/phaseUnlock.js'
import MobilityBlock from './MobilityBlock.jsx'
import StrengthBlock from './StrengthBlock.jsx'
import BagBlock from './BagBlock.jsx'
import CoreBlock from './CoreBlock.jsx'
import CooldownBlock from './CooldownBlock.jsx'
import CompletenessBar from './CompletenessBar.jsx'
import FightGymDay from './FightGymDay.jsx'
import PhaseUnlockBanner from './PhaseUnlockBanner.jsx'

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
const HIP_LABELS = ['1 – Critical', '2 – High Alert', '3 – Moderate', '4 – Good', '5 – Excellent']

export default function HUD() {
    const {
        // DB-backed
        phase, setPhase, sessionCount, pendingSync, logSession, appName, appSubtitle,
        // Active workout state
        day, setDay,
        hipScore, setHipScore,
        mobChecked, toggleMobilityCheck,
        strSets, updateStrengthSet,
        coreSets, updateCoreSet,
        clrChecked, toggleCooldownCheck,
        bagRounds, setBagRounds,
        bagCourse, setBagCourse,
        bagModules, setBagModules,
        bagWorkouts, setBagWorkouts,
        notes, setNotes,
        gymSessionType, setGymSessionType,
        altRows, setAltRows, addAltRow, updateAltRow, removeAltRow,
        altDuration, setAltDuration,
        hudScrollY, setHudScrollY,
        bagBlockOpen, setBagBlockOpen,
        coreBlockOpen, setCoreBlockOpen,
        mobBlockOpen, setMobBlockOpen,
        strBlockOpen, setStrBlockOpen,
        clrBlockOpen, setClrBlockOpen,
        resetActiveWorkout
    } = useDB()

    // ── Playbook data ────────────────────────────
    const workout = usePlaybook(phase, day, hipScore)

    // ── Day-7 default session type (D2 / W16) ─────
    // Day 7 is the optional/custom gym day — default the Session Type to
    // Cardio only on the transition INTO day 7 (tracked via a ref), so a
    // manual re-selection while already on day 7 is never clobbered.
    // Days 2/4 keep the existing 'Combat' default behavior.
    const prevDayRef = useRef(day)
    useEffect(() => {
        if (day === 7 && prevDayRef.current !== 7) {
            setGymSessionType('Cardio')
        }
        prevDayRef.current = day
    }, [day, setGymSessionType])

    // ── W10: auto-expand collapsed blocks on first data ──
    // UI-only. Fires ONLY on the empty→non-empty transition (tracked via
    // refs, same idiom as prevDayRef above), so a manual re-collapse while
    // data exists sticks — the effect never fights the user.
    const bagHasData = bagRounds !== '' || bagCourse !== '' || bagModules !== '' || bagWorkouts !== ''
    const prevBagHasDataRef = useRef(bagHasData)
    useEffect(() => {
        if (bagHasData && !prevBagHasDataRef.current) setBagBlockOpen(true)
        prevBagHasDataRef.current = bagHasData
    }, [bagHasData, setBagBlockOpen])

    const coreHasData = Object.values(coreSets).some(
        e => e && ((e.ex && e.ex !== '') || (e.sets && e.sets !== '') || (e.reps && e.reps !== ''))
    )
    const prevCoreHasDataRef = useRef(coreHasData)
    useEffect(() => {
        if (coreHasData && !prevCoreHasDataRef.current) setCoreBlockOpen(true)
        prevCoreHasDataRef.current = coreHasData
    }, [coreHasData, setCoreBlockOpen])

    // ── Phase unlock check ────────────────────────
    // W14: the condition itself moved verbatim to utils/phaseUnlock.js so
    // the signaling surfaces below read the SAME computation — no drift.
    const gymSessionsThisPhase = sessionCount[phase] || 0
    const phaseUnlocked = phaseReady(phase, sessionCount)

    // ── Progress Summary (W27) ────────────────────
    // Store the RAW last session; build the display string in render (below)
    // from the LIVE `phase` state. An effect keyed on sessionCount alone would
    // cache a stale phase when the selector changes without a new log — Touch B
    // requires the phase shown to be the one that WILL be logged. The same
    // lastSession also feeds the stale-phase mismatch badge (Touch C).
    const [lastSession, setLastSession] = useState(null)
    const [progressLoaded, setProgressLoaded] = useState(false)

    useEffect(() => {
        async function loadProgress() {
            try {
                const last = await db.sessions.orderBy('id').reverse().limit(1).first()
                setLastSession(last || null)
                setProgressLoaded(true)
            } catch (err) {
                console.error(err)
            }
        }
        loadProgress()
    }, [sessionCount])

    // Touch B — built in render from the live `phase`, never cached in the effect.
    // Empty state stays on Phase 1 by the selector gating, so this reads correctly.
    const progressSummary = lastSession
        ? `NEXT: PHASE ${phase} · DAY ${nextDay(lastSession.day)}`
        : `START: PHASE ${phase} · DAY 1`

    // Touch C — last logged phase differs from the phase now selected. Number-
    // coerce both sides (sessions.phase may be persisted as a string). Heads-up
    // only: dropping back to an earlier earned phase is legitimate, so this
    // signals, it never gates logging.
    const phaseMismatch = lastSession != null && Number(lastSession.phase) !== phase

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
    // NOTE: logSession in DBProvider now calls resetActiveWorkout() after persisting.
    // The payload shape is identical to the original — no webhook fields changed.
    const handleLog = useCallback(async () => {
        if (!workout) return
        const pct = completeness()

        const finalSessionType = workout.isFightGymDay ? gymSessionType : 'S&C'

        let altString = ''
        if (workout.isFightGymDay && gymSessionType !== 'Combat') {
            altString = altRows.map(r => `${r.name || 'Movement'} — ${r.v1 || ''} | ${r.v2 || ''} | ${r.v3 || ''}`).join('\n')
        }

        const parseNum = (val) => (val === '' || val == null || isNaN(val)) ? '' : Number(val)

        const strength = (workout.strSlots || []).map((s, idx) => ({
            ex: idx + 1,
            key: s.key,
            sets: [1, 2, 3, 4].map(setNum => {
                const entry = strSets[`ex${idx + 1}-s${setNum}`] || {}
                return { kg: parseNum(entry.kg), reps: parseNum(entry.reps), papReps: parseNum(entry.papReps) }
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
                return { ex: entry.ex || '', sets: parseNum(entry.sets), reps: parseNum(entry.reps) }
            }).filter(c => c.ex !== ''),
            altSessionDetails: altString,
            sessionDuration: parseNum(altDuration),
            mobDone: Object.values(mobChecked).filter(Boolean).length,
            clrDone: Object.values(clrChecked).filter(Boolean).length,
            bagRounds: parseNum(bagRounds),
            bagCourse,
            bagModules,
            bagWorkouts,
            notes,
            completeness: pct
        })
        alert(`✅ Session logged!\nDay ${day} | Phase ${phase}\nCompleteness: ${pct}%`)
    }, [workout, completeness, strSets, coreSets, mobChecked, clrChecked, bagRounds, bagCourse, bagModules, bagWorkouts, notes, day, phase, hipScore, logSession, gymSessionType, altRows, altDuration])

    // ── Reset HUD ────────────────────────────────
    // Day is intentionally preserved (matches original behaviour: "Day and Phase are kept")
    const handleReset = useCallback(() => {
        if (!confirm('Clear all inputs for next session? (Day and Phase are kept)')) return
        resetActiveWorkout()
    }, [resetActiveWorkout])

    // ── Scroll Restoration ────────────────────────
    const scrollRef = useRef(hudScrollY)

    // Track scroll and save on unmount
    useEffect(() => {
        let ticking = false
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    scrollRef.current = window.scrollY
                    ticking = false
                })
                ticking = true
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            window.removeEventListener('scroll', handleScroll)
            setHudScrollY(scrollRef.current)
        }
    }, [setHudScrollY])

    // Restore scroll on mount
    useLayoutEffect(() => {
        if (hudScrollY > 0) {
            window.scrollTo(0, hudScrollY)
        }
    }, [hudScrollY])

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
                        // W27 invariant: never call setPhase with a non-selectable
                        // phase. Safe here — this banner only renders when phaseReady
                        // is true, so phase+1 is by definition already earned/selectable.
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
                        {/* W27 invariant: never call setPhase with a non-selectable */}
                        {/* phase. Disabled options can't be picked by the user, so    */}
                        {/* onChange can only ever yield a selectable value.            */}
                        <select value={phase} onChange={e => setPhase(Number(e.target.value))}>
                            <option value={1} disabled={!isPhaseSelectable(1, sessionCount, phase)}>Phase 1</option>
                            <option value={2} disabled={!isPhaseSelectable(2, sessionCount, phase)}>Phase 2</option>
                            <option value={3} disabled={!isPhaseSelectable(3, sessionCount, phase)}>Phase 3</option>
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

                {/* ── Stale-phase mismatch (W27, Touch C) ── */}
                {/* Heads-up only, directly under the Phase selector: the last  */}
                {/* logged session's phase differs from the phase now selected. */}
                {/* Self-clears when the selector matches or a new session logs.*/}
                {phaseMismatch && (
                    <div className="badge badge-amber" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
                        ⚠️ Last logged Phase {lastSession.phase} — you're on Phase {phase}
                    </div>
                )}

                {/* ── Phase progress line (W14) ───────── */}
                {/* Signal only — derives from the SAME sessionCount +      */}
                {/* phaseReady() the unlock check reads. When the phase is  */}
                {/* ready, the PhaseUnlockBanner above already says so, so  */}
                {/* this line only renders while still locked.              */}
                {phase < 3 && !phaseUnlocked && (
                    <div className="badge badge-amber" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
                        🔒 Phase {phase + 1} unlocks after {PHASE_UNLOCK_THRESHOLD - gymSessionsThisPhase} more S&amp;C session{PHASE_UNLOCK_THRESHOLD - gymSessionsThisPhase === 1 ? '' : 's'} ({gymSessionsThisPhase}/{PHASE_UNLOCK_THRESHOLD})
                    </div>
                )}

                {/* ── Next Day indicator ──────────────── */}
                {progressLoaded && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255,165,0,0.12) 0%, rgba(255,100,0,0.08) 100%)',
                        border: '1px solid rgba(255,165,0,0.25)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>📅</span>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,165,0,0.7)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Next Up</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFA500', letterSpacing: '1px' }}>{progressSummary}</div>
                        </div>
                    </div>
                )}

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
                            onCheck={toggleMobilityCheck}
                            open={mobBlockOpen}
                            onToggle={() => setMobBlockOpen(!mobBlockOpen)}
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
                            onSetChange={updateStrengthSet}
                            phase={phase}
                            day={day}
                            open={strBlockOpen}
                            onToggle={() => setStrBlockOpen(!strBlockOpen)}
                        />

                        {/* ── Bag Work ───────────────────── */}
                        <BagBlock
                            slot={workout.bagSlot}
                            open={bagBlockOpen}
                            onToggle={() => setBagBlockOpen(!bagBlockOpen)}
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
                            onSetChange={updateCoreSet}
                            open={coreBlockOpen}
                            onToggle={() => setCoreBlockOpen(!coreBlockOpen)}
                        />

                        {/* ── Cooldown ───────────────────── */}
                        <CooldownBlock
                            slots={workout.clrSlots}
                            checked={clrChecked}
                            onCheck={toggleCooldownCheck}
                            open={clrBlockOpen}
                            onToggle={() => setClrBlockOpen(!clrBlockOpen)}
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
