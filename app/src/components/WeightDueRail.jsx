/**
 * WeightDueRail.jsx — the weekly weight check-in prompt (W30).
 *
 * Lives at AppShell level, immediately above the bottom nav, for two reasons:
 * it must be visible without opening the More hub (a user who never goes there
 * would never see it), and TodayRouter selects between two different Today
 * implementations, so putting it inside Today would mean maintaining the same
 * signal in two places — exactly the drift the pure predicate exists to avoid.
 *
 * ── TONE IS A REQUIREMENT, NOT A PREFERENCE ──────────────────────────────
 * This is information, never pressure or reproach:
 *   - one line, one action, one dismiss;
 *   - no alarm colour, no red, no icon implying failure;
 *   - no overdue-day count — that number invites a scoreboard, and this is a
 *     reminder, not a judgement;
 *   - no streak, no target, no celebration on completion.
 * "Later" is a bounded seven-day snooze, labelled so the user understands its
 * lifetime; an unexplained ✕ would imply "never again" and quietly kill the
 * feature for anyone who taps it.
 *
 * Body weight in a combat sport sits close to weight cutting. A prompt that
 * nags, scores, or moralises is genuinely harmful here, which is why the copy
 * states a fact and offers an action, and nothing else.
 *
 * POSITIONING: fixed, anchored directly above the bottom nav, one z-index
 * below it. It cannot be an in-flow sibling — `.bottom-nav` is itself
 * `position: fixed`, so a static sibling lands at the end of the document,
 * off-screen. (That was the first implementation; browser verification caught
 * it rendering at y=864 in an 812px viewport.) Content areas in this app
 * already carry generous bottom padding for the fixed nav, which the rail
 * shares.
 */
export default function WeightDueRail({ onLog, onSnooze }) {
    return (
        <div className="weight-due-rail" role="status">
            <span className="weight-due-rail__text">Weekly weight check-in</span>
            <div className="weight-due-rail__actions">
                <button
                    type="button"
                    className="weight-due-rail__primary"
                    onClick={onLog}
                >
                    Log it
                </button>
                <button
                    type="button"
                    className="weight-due-rail__dismiss"
                    onClick={onSnooze}
                >
                    Later
                </button>
            </div>
        </div>
    )
}
