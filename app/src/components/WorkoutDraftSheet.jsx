/**
 * components/WorkoutDraftSheet.jsx — A6.5 context-conflict guard (plan v2 §7).
 *
 * Shown only when a MEANINGFUL live draft would be silently reinterpreted by
 * a day/phase/hip-score change or a different cartridge/version activation
 * (see utils/workoutDraftState.js's requiresConflictGuard). Safe-action-
 * first: backdrop tap and the sheet's own close both KEEP the workout —
 * only the explicit "Discard and switch" button invalidates and deletes the
 * draft before applying the change. There is deliberately no third "keep
 * this draft and start another" option (one active draft per owner).
 */
import BottomSheet from './BottomSheet.jsx'

export default function WorkoutDraftSheet({ open, onKeep, onDiscardAndSwitch }) {
    return (
        <BottomSheet open={open} onClose={onKeep} title="Unfinished workout">
            <p className="sheet__copy">
                Switching now would leave your current workout behind. Keep it, or discard it and switch?
            </p>
            <button type="button" className="btn-primary" onClick={onKeep}>
                Keep workout
            </button>
            <button type="button" className="sheet__action destructive" onClick={onDiscardAndSwitch}>
                Discard and switch
            </button>
        </BottomSheet>
    )
}
