/**
 * utils/todayRoute.js — A7b Today routing decision.
 *
 * Pure, side-effect free — mirrors utils/cartridgePlan.js's style so Today's
 * account-level gating stays consistent with Plan/Library rather than
 * inventing a new state machine. Never used to decide whether an in-flight
 * DRAFT should resume (that is draftPhase/continueDraft/draftIssue, always
 * checked separately and first by the caller) — this only decides which
 * IDLE surface an account sees: the legacy HUD, a Library nudge, an
 * account-state panel, or the interactive cartridge Today.
 *
 * Deliberately does NOT accept `activeDraftKind` — a corrective-pass finding
 * against the first attempt was routing off that field's default value
 * ('legacy') as if it proved a real legacy draft existed. Whether a live
 * legacy draft should keep the legacy HUD on screen even though this
 * account also has a cartridge active is the CALLER's job, checked via
 * `isLegacyStateMeaningful`/`activeDraftKind` together (real content, not a
 * default), never through this function.
 */

/**
 * @param {object} args
 * @param {boolean} args.loading
 * @param {object|null} args.snapshot
 * @param {boolean} args.offline
 * @param {unknown} args.error
 * @param {object|null} args.activeCartridge
 * @param {Array} args.availableCartridges
 * @returns {'loading'|'offline-empty'|'error'|'update-required'|'choose-program'|'cartridge'|'legacy'|'indeterminate'}
 */
export function resolveTodayRoute({
    loading,
    snapshot,
    offline,
    error,
    activeCartridge,
    availableCartridges,
}) {
    if (loading && !snapshot) return 'loading'

    if (!snapshot) {
        if (offline) return 'offline-empty'
        if (error) return 'error'
        // A7b corrective pass: no snapshot, not loading/offline/error — this
        // is a genuinely UNKNOWN/unreadable state, not a legacy-only
        // account. Silently guessing 'legacy' here would be indistinguishable
        // from "this account has no program access at all" (the real
        // meaning of the 'legacy' branch below) and could route a
        // cartridge-owning account to the wrong surface on a transient
        // resolution gap. The caller shows an explicit safe/issue state
        // instead — never a guessed workout.
        return 'indeterminate'
    }

    if (snapshot.activeId && !activeCartridge) return 'update-required'
    if (snapshot.activeId && activeCartridge) return 'cartridge'

    const hasAvailable = Array.isArray(availableCartridges) && availableCartridges.length > 0
    if (hasAvailable) return 'choose-program' // assigned programs exist, none activated yet
    return 'legacy' // never had any program access — a legacy-only account
}

/**
 * resolveTodaySurface — the FULL Today mounting decision (corrective plan
 * §4/Step 5, finding E/J7), composing three signals that TodayRouter.jsx
 * previously mixed inline:
 *
 * 1. A genuinely meaningful, in-flight CARTRIDGE workout (real state — never
 *    activeDraftKind's inert default alone) must NEVER be stranded, even
 *    when the account-level route degrades to 'update-required' (the
 *    bundled active cartridge becomes unresolvable, e.g. after a PWA
 *    update). `cartridgeFrozenDay` plus the stored identity is the runnable
 *    snapshot regardless of what `activeCartridge` currently resolves to —
 *    this takes priority over every other signal so the user can still
 *    reach Finish/Discard.
 * 2. A genuinely meaningful, live LEGACY draft (real content, checked via
 *    `isLegacyStateMeaningful`, never `activeDraftKind`'s default) always
 *    wins next, so a legacy draft started before this account ever had a
 *    cartridge is never orphaned.
 * 3. Otherwise, the plain account-level route from `resolveTodayRoute`.
 *
 * @returns {'frozen-cartridge-recovery'|'legacy-draft'|ReturnType<typeof resolveTodayRoute>}
 */
export function resolveTodaySurface({
    loading, snapshot, offline, error, activeCartridge, availableCartridges,
    activeDraftKind, cartridgeId, cartridgeFrozenDay,
    isLegacyDraftMeaningful,
}) {
    const hasInFlightCartridgeWorkout = (
        activeDraftKind === 'cartridge' &&
        cartridgeId != null &&
        cartridgeFrozenDay != null && typeof cartridgeFrozenDay === 'object'
    )
    if (hasInFlightCartridgeWorkout) return 'frozen-cartridge-recovery'

    if (activeDraftKind === 'legacy' && isLegacyDraftMeaningful) return 'legacy-draft'

    return resolveTodayRoute({ loading, snapshot, offline, error, activeCartridge, availableCartridges })
}

export default { resolveTodayRoute, resolveTodaySurface }
