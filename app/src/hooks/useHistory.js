/**
 * useHistory.js — History lookup hook
 *
 * Returns the most recent logged weight and reps for a specific Exercise Key.
 *
 * Key format: e.g. "P1-D1-STR-1"
 * We look up the session db for the most recent session that has data
 * for this exact exercise key and set number.
 */

import { useState, useEffect } from 'react'
import { db } from '../db/index.jsx'
import { calculateE1RM, calculateTargetWeight } from '../utils/math.js'

const _cache = new Map()

export function useHistory(playbookKey, setNum, intensityPct = 0.85) {
    const [history, setHistory] = useState({ lastKg: '', lastReps: '', suggestedKg: '' })

    useEffect(() => {
        if (!playbookKey) return
        const cacheKey = `${playbookKey}-s${setNum}`

        if (_cache.has(cacheKey)) {
            setHistory(_cache.get(cacheKey))
            return
        }

        db.sessions
            .orderBy('id')
            .reverse()
            .limit(10)
            .toArray()
            .then(sessions => {
                for (const session of sessions) {
                    if (!session.strength) continue

                    // Find the exercise in this session matching the unique key
                    const exData = session.strength.find(s => s.key === playbookKey)
                    if (!exData || !exData.sets) continue

                    // sets array is 0-indexed (0 = Set 1)
                    const set = exData.sets[setNum - 1]
                    if (set && (set.kg || set.reps)) {
                        const kgNum = Number(set.kg)
                        const repsNum = Number(set.reps)

                        let suggestedKg = ''
                        if (kgNum > 0 && repsNum > 0) {
                            const e1rm = calculateE1RM(kgNum, repsNum)
                            suggestedKg = calculateTargetWeight(e1rm, intensityPct)
                        }

                        const result = {
                            lastKg: set.kg || '',
                            lastReps: set.reps || '',
                            suggestedKg
                        }

                        _cache.set(cacheKey, result)
                        setHistory(result)
                        return
                    }
                }
            })
            .catch(() => { })
    }, [playbookKey, setNum, intensityPct])

    return history
}
