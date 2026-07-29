/**
 * components/TodayRouter.jsx — A7b Train -> Today entry point.
 *
 * Mounted by TrainHub in place of a bare <HUD/> for the "today" top tab.
 * Owns the ONE shared draft-resolution gate (hydration / offered Continue /
 * a preserved read-failed/corrupt/unsupported draftIssue) so neither HUD.jsx
 * nor CartridgeToday.jsx duplicates that banner — both are mounted only
 * once this resolves. `resumeDraft()` is already kind-agnostic (it branches
 * on the offered row's own `workoutIdentity.kind` internally), so a single
 * generic Continue button here is correct regardless of which kind gets
 * offered.
 *
 * After resolution, the surface choice is:
 * 1. A genuinely MEANINGFUL live legacy draft (real content, not merely
 *    `activeDraftKind`'s inert 'legacy' default — the exact corrective-pass
 *    finding against the first attempt) always wins, so a legacy draft
 *    started before this account ever had a cartridge is never orphaned.
 * 2. Otherwise, utils/todayRoute.js's `resolveTodayRoute` decides between
 *    the interactive cartridge Today, a Library nudge, an account-state
 *    panel (loading/offline/error/update-required), or the legacy HUD for
 *    an account with no cartridge access at all.
 */
import { useCallback, useState } from 'react'
import { useDB } from '../db/index.jsx'
import { useCartridgeAccess } from '../cartridges/CartridgeAccessProvider.jsx'
import { isLegacyStateMeaningful } from '../utils/workoutDraftState.js'
import { resolveTodaySurface } from '../utils/todayRoute.js'
import HUD from './HUD.jsx'
import CartridgeToday from './today/CartridgeToday.jsx'
import { ProgramStatusPanel } from './ProgramAccessState.jsx'

export default function TodayRouter({ onOpenLibrary }) {
    const { loading, snapshot, offline, error, activeCartridge, availableCartridges, refresh } = useCartridgeAccess()
    const {
        draftPhase, continueDraft, draftIssue, resumeDraft, discardCurrentDraft, retryHydration,
        activeDraftKind, cartridgeId, cartridgeFrozenDay,
        mobChecked, clrChecked, strSets, coreSets, bagRounds, bagCourse, bagModules, bagWorkouts,
        notes, gymSessionType, altRows, altDuration, hudScrollY,
        bagBlockOpen, coreBlockOpen, mobBlockOpen, strBlockOpen, clrBlockOpen,
    } = useDB()

    const [offerDiscardPending, setOfferDiscardPending] = useState(false)
    const [offerDiscardError, setOfferDiscardError] = useState(null)

    const handleDiscardOffered = useCallback(async () => {
        setOfferDiscardError(null)
        setOfferDiscardPending(true)
        try {
            await discardCurrentDraft()
        } catch (err) {
            console.error('discard failed', err)
            setOfferDiscardError('Could not discard. Try again.')
        } finally {
            setOfferDiscardPending(false)
        }
    }, [discardCurrentDraft])

    const hydrationPending = draftPhase !== 'ready'

    if (hydrationPending) {
        return (
            <div className="app"><main className="content">
                <div className="draft-banner"><div className="draft-banner__title">Loading your workout…</div></div>
            </main></div>
        )
    }

    if (draftIssue) {
        return (
            <div className="app"><main className="content">
                <div className="draft-banner">
                    <div className="draft-banner__title">
                        {draftIssue.reason === 'read-failed'
                            ? "Couldn't load your saved workout"
                            : draftIssue.reason === 'corrupt'
                                ? 'Saved workout unavailable'
                                : 'Saved workout needs an app update'}
                    </div>
                    {offerDiscardError && <div className="library-activation-sheet__error" role="alert">{offerDiscardError}</div>}
                    <div className="draft-banner__actions">
                        {draftIssue.reason === 'read-failed' ? (
                            <button type="button" className="btn-primary" onClick={retryHydration}>Retry</button>
                        ) : (
                            <button type="button" className="btn-secondary" onClick={handleDiscardOffered} disabled={offerDiscardPending}>
                                {offerDiscardPending ? 'Discarding…' : 'Discard'}
                            </button>
                        )}
                    </div>
                </div>
            </main></div>
        )
    }

    if (continueDraft) {
        return (
            <div className="app"><main className="content">
                <div className="draft-banner">
                    <div className="draft-banner__title">Unfinished workout</div>
                    <div>Resume where you left off, or start fresh.</div>
                    {offerDiscardError && <div className="library-activation-sheet__error" role="alert">{offerDiscardError}</div>}
                    <div className="draft-banner__actions">
                        <button type="button" className="btn-primary" onClick={resumeDraft} disabled={offerDiscardPending}>
                            Continue
                        </button>
                        <button type="button" className="btn-secondary" onClick={handleDiscardOffered} disabled={offerDiscardPending}>
                            {offerDiscardPending ? 'Discarding…' : 'Discard'}
                        </button>
                    </div>
                </div>
            </main></div>
        )
    }

    // A real, resumed/in-progress legacy draft always wins — checked via
    // actual content, never activeDraftKind's default value alone.
    const legacyFields = {
        mobChecked, clrChecked, strSets, coreSets, bagRounds, bagCourse, bagModules, bagWorkouts,
        notes, gymSessionType, altRows, altDuration, hudScrollY,
        bagBlockOpen, coreBlockOpen, mobBlockOpen, strBlockOpen, clrBlockOpen,
    }

    // A7b corrective pass (finding E/J7): resolveTodaySurface composes the
    // in-flight-legacy-draft check above, an in-flight-CARTRIDGE-draft
    // recovery check (never stranded behind an 'update-required' dead end
    // when the bundled active cartridge becomes unresolvable mid-workout),
    // and the plain account-level route — in that priority order.
    const surface = resolveTodaySurface({
        loading, snapshot, offline, error, activeCartridge, availableCartridges,
        activeDraftKind, cartridgeId, cartridgeFrozenDay,
        isLegacyDraftMeaningful: isLegacyStateMeaningful(legacyFields),
    })

    if (surface === 'legacy-draft') return <HUD />

    // Frozen-cartridge recovery: cartridgeFrozenDay + the stored cartridge
    // identity/version/day/phase (already live in DBProvider) is the
    // runnable snapshot regardless of what activeCartridge currently
    // resolves to. CartridgeToday itself already tolerates a null
    // activeCartridge once a workout is genuinely active (it only reads
    // activeCartridge for the pre-Start idle surface and the optional phase
    // label) — no separate "recovery mode" prop is needed.
    if (surface === 'frozen-cartridge-recovery' || surface === 'cartridge') return <CartridgeToday />

    if (surface === 'loading') {
        return <div className="app"><main className="content"><ProgramStatusPanel title="Loading your workout…" /></main></div>
    }
    if (surface === 'offline-empty') {
        return (
            <div className="app"><main className="content">
                <ProgramStatusPanel title="Connect once to load your plan">
                    This device does not have a saved active program yet.
                </ProgramStatusPanel>
            </main></div>
        )
    }
    if (surface === 'error') {
        return (
            <div className="app"><main className="content">
                <ProgramStatusPanel title="Couldn't load your plan" action={refresh}>
                    Check your connection and try again.
                </ProgramStatusPanel>
            </main></div>
        )
    }
    if (surface === 'indeterminate') {
        return (
            <div className="app"><main className="content">
                <ProgramStatusPanel title="Couldn't confirm your program" action={refresh}>
                    We couldn't determine your program status. Try again — nothing has been changed or guessed.
                </ProgramStatusPanel>
            </main></div>
        )
    }
    if (surface === 'update-required') {
        return (
            <div className="app"><main className="content">
                <ProgramStatusPanel title="Update Combat OS to run this program">
                    Your active program needs a newer version of the app.
                </ProgramStatusPanel>
            </main></div>
        )
    }
    if (surface === 'choose-program') {
        return (
            <div className="app"><main className="content">
                <ProgramStatusPanel title="Choose an active program" action={onOpenLibrary} actionLabel="Open Library">
                    Pick one of the programs available to you.
                </ProgramStatusPanel>
            </main></div>
        )
    }

    // surface === 'legacy' — a legacy-only account with no cartridge access at all.
    return <HUD />
}
