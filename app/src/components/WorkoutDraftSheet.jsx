/**
 * components/WorkoutDraftSheet.jsx — A6.5 context-conflict guard (plan v2 §7).
 *
 * Shown only when a MEANINGFUL live draft would be silently reinterpreted by
 * a day/phase/hip-score change or a different cartridge/version activation
 * (see utils/workoutDraftState.js's requiresConflictGuard). Safe-action-
 * first: backdrop tap and "Keep workout" both KEEP the workout — only the
 * explicit "Discard and switch" button invalidates and deletes the draft
 * before applying the change. There is deliberately no third "keep this
 * draft and start another" option (one active draft per owner).
 *
 * `discardDraft()` can reject on a real delete failure — this must NOT be
 * treated as success. `pending`/`error` let the caller keep the sheet open,
 * disable "Discard and switch" while the attempt is in flight, and show
 * what went wrong so the workout/context is visibly preserved rather than
 * silently switched out from under the user.
 *
 * While `pending`, Keep/backdrop/close are ALL disabled/ignored too — not
 * just Discard and switch. Without this, a user could tap Keep the instant
 * after starting a discard, see the sheet close, and resume working; the
 * already-in-flight discard-and-switch then completes moments later and
 * calls resetActiveWorkout() regardless (its own success path doesn't know
 * the user "changed their mind"), silently wiping whatever they just did
 * post-Keep. Blocking Keep until the in-flight attempt resolves (success or
 * failure) closes that race.
 */
import BottomSheet from './BottomSheet.jsx'

export default function WorkoutDraftSheet({ open, onKeep, onDiscardAndSwitch, pending = false, error = null }) {
    const guardedKeep = () => {
        if (pending) return
        onKeep()
    }

    return (
        <BottomSheet open={open} onClose={guardedKeep} title="Unfinished workout">
            <p className="sheet__copy">
                Switching now would leave your current workout behind. Keep it, or discard it and switch?
            </p>
            {error && (
                <div className="library-activation-sheet__error" role="alert">
                    {error}
                </div>
            )}
            <button type="button" className="btn-primary" disabled={pending} onClick={guardedKeep}>
                Keep workout
            </button>
            <button
                type="button"
                className="sheet__action destructive"
                disabled={pending}
                onClick={onDiscardAndSwitch}
            >
                {pending ? 'Discarding…' : 'Discard and switch'}
            </button>
        </BottomSheet>
    )
}
