/**
 * components/today/GuideCard.jsx — the one first-run pointer to the guide (W39).
 *
 * "New here? Start with the guide." Tapping the card opens More › Guide and
 * removes the card for good on this device; so does the dismiss button. Not a
 * tour and not an overlay: an ordinary card at the top of the idle Today
 * screen, so it can never appear mid-workout (the active-workout view does not
 * render it) and never covers a control.
 */
import { useGuideCard } from '../../hooks/useGuideCard.js'
import { shouldShowGuideCard } from '../../utils/guideCard.js'

export default function GuideCard({ onOpenGuide, workoutActive = false }) {
    const { dismissed, dismiss } = useGuideCard()

    if (!shouldShowGuideCard({ dismissed, workoutActive })) return null

    const open = () => {
        dismiss()
        if (onOpenGuide) onOpenGuide()
    }

    return (
        <div className="guide-card">
            <button type="button" className="guide-card__main" onClick={open}>
                <span className="guide-card__title">New here?</span>
                <span className="guide-card__text">Start with the guide.</span>
            </button>
            <button type="button" className="guide-card__dismiss" onClick={dismiss} aria-label="Dismiss">
                ✕
            </button>
        </div>
    )
}
