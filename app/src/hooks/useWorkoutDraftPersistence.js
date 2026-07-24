/**
 * hooks/useWorkoutDraftPersistence.js — thin React binding for the A6.5
 * draft persistence controller (db/workoutDrafts.js).
 *
 * Owns NO timers, generation or write chain — the module-level controller
 * owns those so signOut() (an AuthProvider ancestor) can invalidate the
 * same writer synchronously. This hook only decides WHEN to call
 * schedule()/saveNow() from React state changes, builds the row to persist
 * (it has access to `workout`, needed for the definitionSnapshot, which
 * DBProvider itself does not), and exposes controller status + a
 * `flushNow` escape hatch for callers that need a synchronous-ish flush
 * before a guarded action (context-conflict preflight, logging).
 *
 * Called from HUD.jsx (the only place `workout` — usePlaybook's resolved
 * day — is available). Also registers the visibilitychange/pagehide flush
 * guards here, and flushes fresh (not just re-sent stale) data on its own
 * unmount, since HUD unmounting on a tab switch is this app's most common
 * "backgrounding" event for Today.
 */
import { useEffect, useRef, useState } from 'react'
import { workoutDraftController } from '../db/workoutDrafts.js'
import {
    buildLegacyIdentity, buildLegacyDefinitionSnapshot, buildDraftRow,
    pickFields, LEGACY_STATE_FIELD_KEYS, isLegacyStateMeaningful,
} from '../utils/workoutDraftState.js'

export function useWorkoutDraftPersistence({
    enabled, ownerUserId, day, phase, hipScore, workout, fields, immediateTick, initialCreatedAt, lifecycleKey,
}) {
    const [status, setStatus] = useState(() => workoutDraftController.getStatus())

    const fieldsRef = useRef(fields)
    fieldsRef.current = fields
    const identityRef = useRef({ day, phase, hipScore })
    identityRef.current = { day, phase, hipScore }
    const workoutRef = useRef(workout)
    workoutRef.current = workout
    const createdAtRef = useRef(initialCreatedAt || null)
    const lastLifecycleKey = useRef(lifecycleKey)
    if (lifecycleKey !== lastLifecycleKey.current) {
        lastLifecycleKey.current = lifecycleKey
        createdAtRef.current = initialCreatedAt || null
    }

    function buildRow() {
        const now = new Date().toISOString()
        if (!createdAtRef.current) createdAtRef.current = now
        return buildDraftRow({
            ownerUserId,
            workoutIdentity: buildLegacyIdentity(identityRef.current),
            definitionSnapshot: buildLegacyDefinitionSnapshot(workoutRef.current),
            state: { kind: 'legacy-hud-v1', fields: pickFields(fieldsRef.current, LEGACY_STATE_FIELD_KEYS) },
            createdAt: createdAtRef.current,
            updatedAt: now,
        })
    }

    /** Persist current fields immediately if meaningful; used before guarded
     *  context changes, before logging, and on backgrounding/unmount. */
    function flushNow() {
        if (!enabled || !ownerUserId) return Promise.resolve()
        const row = buildRow()
        if (!isLegacyStateMeaningful(row.state.fields)) return Promise.resolve()
        return workoutDraftController.saveNow(row)
    }

    useEffect(() => {
        const unsubscribe = workoutDraftController.subscribe(setStatus)
        return unsubscribe
    }, [])

    const lastImmediateTick = useRef(immediateTick)
    useEffect(() => {
        if (!enabled || !ownerUserId) return
        const isImmediate = immediateTick !== lastImmediateTick.current
        lastImmediateTick.current = immediateTick

        const row = buildRow()
        if (!isLegacyStateMeaningful(row.state.fields)) return // never create a row for selection/UI-only changes

        if (isImmediate) {
            workoutDraftController.saveNow(row)
        } else {
            workoutDraftController.schedule(row)
        }
        // fields/day/phase/hipScore are read fresh via refs inside buildRow();
        // this effect intentionally fires only when the tracked content
        // fields (or an immediate discrete action) actually change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        enabled, ownerUserId, day, phase, hipScore,
        fields.mobChecked, fields.clrChecked, fields.strSets, fields.coreSets,
        fields.bagRounds, fields.bagCourse, fields.bagModules, fields.bagWorkouts,
        fields.notes, fields.gymSessionType, fields.altRows, fields.altDuration,
        immediateTick,
    ])

    useEffect(() => {
        if (!enabled) return
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flushNow()
        }
        window.addEventListener('pagehide', flushNow)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            window.removeEventListener('pagehide', flushNow)
            document.removeEventListener('visibilitychange', onVisibility)
            flushNow() // this hook's own unmount — e.g. a Today→Plan/Library tab switch
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ownerUserId])

    return { status, flushNow }
}
