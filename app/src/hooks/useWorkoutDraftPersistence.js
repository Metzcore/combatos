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
 * Called from HUD.jsx (the only place legacy `workout` — usePlaybook's
 * resolved day — is available) with its exact original call shape: no
 * `kind`, `day`/`phase`/`hipScore` as top-level props. HUD.jsx is
 * unmodified by A7a, so this hook stays 100% backward compatible for that
 * call — `kind` defaults to `'legacy'` and the cartridge-only params below
 * are simply unused. A future cartridge Today (A7b) calls the SAME hook
 * with `kind: 'cartridge'` and the cartridge identity params instead —
 * there is still only one write path (the module-scope controller), never
 * a second controller or a parallel logging mechanism.
 *
 * Also registers the visibilitychange/pagehide flush guards here, and
 * flushes fresh (not just re-sent stale) data on its own unmount, since a
 * Today tab switch is this app's most common "backgrounding" event.
 */
import { useEffect, useRef, useState } from 'react'
import { workoutDraftController } from '../db/workoutDrafts.js'
import {
    buildLegacyIdentity, buildLegacyDefinitionSnapshot,
    buildCartridgeIdentity, buildCartridgeDefinitionSnapshot,
    buildDraftRow, pickFields, trackedFieldValues,
    LEGACY_STATE_FIELD_KEYS, CARTRIDGE_STATE_FIELD_KEYS,
    isLegacyStateMeaningful, isCartridgeStateMeaningful,
} from '../utils/workoutDraftState.js'

export function useWorkoutDraftPersistence({
    enabled, ownerUserId, workout, fields, immediateTick, initialCreatedAt, lifecycleKey,
    kind = 'legacy',
    // legacy identity (kind === 'legacy', the default — HUD.jsx's existing call shape)
    day, phase, hipScore,
    // cartridge identity (kind === 'cartridge')
    cartridgeId, cartridgeVersion, cartridgeSchemaVersion, cartridgeDay, cartridgePhaseId,
}) {
    const isCartridge = kind === 'cartridge'
    const [status, setStatus] = useState(() => workoutDraftController.getStatus())

    const fieldsRef = useRef(fields)
    fieldsRef.current = fields
    const currentIdentity = isCartridge
        ? { cartridgeId, cartridgeVersion, cartridgeSchemaVersion, day: cartridgeDay, phaseId: cartridgePhaseId, hipScore: null }
        : { day, phase, hipScore }
    const identityRef = useRef(currentIdentity)
    identityRef.current = currentIdentity
    const workoutRef = useRef(workout)
    workoutRef.current = workout
    const createdAtRef = useRef(initialCreatedAt || null)
    const lastLifecycleKey = useRef(lifecycleKey)
    if (lifecycleKey !== lastLifecycleKey.current) {
        lastLifecycleKey.current = lifecycleKey
        createdAtRef.current = initialCreatedAt || null
    }

    const isMeaningful = isCartridge ? isCartridgeStateMeaningful : isLegacyStateMeaningful

    function buildRow() {
        const now = new Date().toISOString()
        if (!createdAtRef.current) createdAtRef.current = now

        if (isCartridge) {
            const liveFields = pickFields(fieldsRef.current, CARTRIDGE_STATE_FIELD_KEYS)
            // Same live-scroll-over-stale-state rationale as the legacy path
            // below — see that comment for why window.scrollY, not the field.
            if (typeof window !== 'undefined') liveFields.scrollY = window.scrollY
            return buildDraftRow({
                ownerUserId,
                workoutIdentity: buildCartridgeIdentity(identityRef.current),
                definitionSnapshot: buildCartridgeDefinitionSnapshot(workoutRef.current),
                state: { kind: 'cartridge-workout-v1', fields: liveFields },
                createdAt: createdAtRef.current,
                updatedAt: now,
            })
        }

        const liveFields = pickFields(fieldsRef.current, LEGACY_STATE_FIELD_KEYS)
        // Read the TRUE current scroll position directly rather than trusting
        // fields.hudScrollY: DBProvider's hudScrollY state is only synced by
        // HUD's own scroll effect on ITS unmount, which is a setState call —
        // during an unmounting component's cleanup that update is discarded
        // (there's no next render to apply it to), so by the time THIS flush
        // runs, fields.hudScrollY can be stale by an entire scroll session.
        // window.scrollY is always live and synchronous, no such gap exists.
        if (typeof window !== 'undefined') {
            liveFields.hudScrollY = window.scrollY
        }
        return buildDraftRow({
            ownerUserId,
            workoutIdentity: buildLegacyIdentity(identityRef.current),
            definitionSnapshot: buildLegacyDefinitionSnapshot(workoutRef.current),
            state: { kind: 'legacy-hud-v1', fields: liveFields },
            createdAt: createdAtRef.current,
            updatedAt: now,
        })
    }

    /**
     * Persist current fields immediately if meaningful; used before guarded
     * context changes, before logging, and on backgrounding/unmount.
     *
     * Resolves `true` if there was nothing to do, or the save succeeded;
     * `false` if a meaningful snapshot existed but failed to persist.
     * saveNow() itself never rejects (a background-flush failure is
     * reported via status, not thrown), so success/failure is read back
     * from the controller's status immediately after — callers that must
     * NOT proceed on a failed flush (logging) check this return value.
     */
    async function flushNow() {
        if (!enabled || !ownerUserId) return true
        const row = buildRow()
        if (!isMeaningful(row.state.fields)) return true
        await workoutDraftController.saveNow(row)
        return workoutDraftController.getStatus().status !== 'error'
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
        if (!isMeaningful(row.state.fields)) return // never create a row for selection/UI-only changes

        if (isImmediate) {
            workoutDraftController.saveNow(row)
        } else {
            workoutDraftController.schedule(row)
        }
        // fields/identity are read fresh via refs inside buildRow(); this
        // effect intentionally fires only when a tracked content field (of
        // WHICHEVER kind this call site uses — a given mounted call site
        // never switches kind, so the deps array length is stable) or an
        // immediate discrete action actually changes. The content-field
        // portion is DERIVED from LEGACY_STATE_FIELD_KEYS/
        // CARTRIDGE_STATE_FIELD_KEYS via trackedFieldValues() rather than
        // hand-listed — the first attempt's hand-written cartridge deps list
        // omitted `sessionDuration` (Phase 0 review finding); deriving from
        // the same canonical key list the draft's own field-picking uses
        // makes that class of bug structurally impossible.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        enabled, ownerUserId,
        day, phase, hipScore,
        cartridgeId, cartridgeVersion, cartridgeSchemaVersion, cartridgeDay, cartridgePhaseId,
        ...trackedFieldValues(fields, isCartridge ? CARTRIDGE_STATE_FIELD_KEYS : LEGACY_STATE_FIELD_KEYS),
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
