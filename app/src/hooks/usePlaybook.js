/**
 * usePlaybook — Fighter's OS Core Data Hook
 * ─────────────────────────────────────────
 * Imports pre-generated ../data/playbook.js (built by scripts/csv_to_js.py from root playbook.csv)
 * and returns a structured workout object for any given Phase + Day + HipScore combination.
 *
 * Key lookup system mirrors the Google Sheets formula:
 *   Key = "P" + phase + "-D" + day + "-" + block + "-" + slot + "-" + variant
 *   e.g. "P1-D1-MOB-1-STD" or "P1-D1-MOB-1-HA"
 *
 * Hip-aware routing:
 *   If hipScore <= 2 AND an HA variant exists → return HA row (flagged with isHighAlert)
 *   Otherwise → return STD row
 *
 * Fight Gym Days (Day 2 and Day 4) have no Playbook entries.
 * The hook returns { isFightGymDay: true } for these.
 */

import { useState, useEffect, useMemo } from 'react'
import PLAYBOOK_DATA from '../data/playbook.js'

// ─── Build lookup index from pre-generated JS data ───────────────────────────
let _index = null

function getIndex() {
    if (_index) return _index
    _index = new Map()
    for (const row of PLAYBOOK_DATA) {
        if (row.Key) _index.set(row.Key, row)
    }
    return _index
}

// ─── Core lookup helpers ──────────────────────────────────────────────────────

/**
 * Look up a row by composite key.
 * If variant is not provided, looks up key without suffix (e.g. P1-D1-STR-1)
 * Returns null if not found.
 */
export function lookup(phase, day, block, slot, variant) {
    const key = variant
        ? `P${phase}-D${day}-${block}-${slot}-${variant}`
        : `P${phase}-D${day}-${block}-${slot}`
    return getIndex().get(key) || null
}

/**
 * Hip-aware lookup for a given block + slot.
 * Returns { row, isHighAlert }
 */
export function hipAwareLookup(phase, day, block, slot, hipScore) {
    const highAlert = Number(hipScore) <= 2
    if (highAlert) {
        const haRow = lookup(phase, day, block, slot, 'HA')
        if (haRow) return { row: haRow, isHighAlert: true }
    }
    const stdRow = lookup(phase, day, block, slot, 'STD')
    return { row: stdRow, isHighAlert: false }
}

// ─── Main workout builder ─────────────────────────────────────────────────────

export function getDailyFocus(day) {
    const focusMap = {
        1: "Lower Body Heavy & Vertical Power",
        3: "Upper Body Push & Rotational Power",
        5: "Lower Body Hinge & Horizontal Power",
        6: "Upper Body Pull & Posterior Chain"
    }
    return focusMap[day] || ""
}

/**
 * Build the full workout object for a given phase/day/hipScore.
 *
 * @param {number|string} phase  - 1, 2, or 3
 * @param {number|string} day    - 1 through 6
 * @param {number|string} hipScore - 1 through 5
 * @returns {WorkoutObject}
 */
export function getWorkout(phase, day, hipScore = 3) {
    const p = Number(phase)
    const d = Number(day)
    const h = Number(hipScore)
    const dailyFocus = getDailyFocus(d)

    // Fight Gym Days — no S&C programming
    if (d === 2 || d === 4) {
        return { isFightGymDay: true, day: d, phase: p, hipScore: h, dailyFocus: "Fight Gym Day — Skills & Sparring" }
    }

    // ── Mobility (up to 5 slots, hip-aware) ──────────────────────────────────
    const mobSlots = []
    for (let slot = 1; slot <= 5; slot++) {
        const { row, isHighAlert } = hipAwareLookup(p, d, 'MOB', slot, h)
        if (row) {
            mobSlots.push({
                slot,
                exercise: row.Exercise || '',
                duration: row.Target_Reps || '',  // used as "duration" for mobility
                cue: row.Cue || '',
                isHighAlert,
                key: row.Key
            })
        }
    }

    // ── Strength (up to 4 slots, STD only — no HA variants) ─────────────────
    const strSlots = []
    for (let slot = 1; slot <= 4; slot++) {
        const row = lookup(p, d, 'STR', slot)
        if (row) {
            strSlots.push({
                slot,
                label: `[${String.fromCharCode(64 + slot)}]`, // [A], [B], [C], [D]
                exercise: row.Exercise || '',
                sets: Number(row.Sets) || 4,
                targetReps: row.Target_Reps || '',
                loadNote: row.Load_Note || '',
                cue: row.Cue || '',
                pap: {
                    exercise: row.PAP_Exercise || '',
                    sets: row.PAP_Sets || '',
                    reps: row.PAP_Reps || ''
                },
                key: row.Key
            })
        }
    }

    // ── Bag Work (slot 1) ────────────────────────────────────────────────────
    const bagRow = lookup(p, d, 'BAG', 1)
    const bagSlot = bagRow ? {
        exercise: bagRow.Exercise || '',
        targetRounds: bagRow.Target_Reps || '',
        comboFocus: bagRow.Combo_Focus || '',
        cue: bagRow.Cue || '',
        key: bagRow.Key
    } : null

    // ── Cooldown (up to 5 slots) ─────────────────────────────────────────────
    const clrSlots = []
    for (let slot = 1; slot <= 5; slot++) {
        const row = lookup(p, d, 'CLR', slot)
        if (row) {
            clrSlots.push({
                slot,
                exercise: row.Exercise || '',
                duration: row.Target_Reps || '',
                note: row.Load_Note || '',
                key: row.Key
            })
        }
    }

    return {
        isFightGymDay: false,
        day: d,
        phase: p,
        hipScore: h,
        hipAlert: h <= 2,
        dailyFocus,
        mobSlots,
        strSlots,
        bagSlot,
        clrSlots
    }
}

// ─── React hook ──────────────────────────────────────────────────────────────

/**
 * usePlaybook — React hook wrapping getWorkout.
 * Re-computes whenever phase, day, or hipScore changes.
 */
export function usePlaybook(phase, day, hipScore) {
    const workout = useMemo(
        () => getWorkout(phase, day, hipScore),
        [phase, day, hipScore]
    )
    return workout
}

export default usePlaybook
