/**
 * ChecklistTaskRow.jsx — one task row inside a group card (W21, W24)
 *
 * Checkbox · title (emoji lives in the text) · subtext (scheduled time /
 * Daily / 🔥 streak) · trailing … button opening the row-actions sheet.
 *
 * W24: a COUNTED task replaces the checkbox with a ＋ tally button in the
 * same left slot (one tap = +1; decrement lives in the … actions sheet so
 * an accidental decrement is impossible) and shows today's count as an
 * amber ×N badge in the meta line.
 */
export default function ChecklistTaskRow({ task, onToggle, onIncrement, onOpenActions }) {
    const subtext = []
    if (task.scheduledTime) subtext.push(`📅 ${task.scheduledTime}`)
    if (task.repeatDaily) subtext.push('🔁 Daily')

    const hasMeta = subtext.length > 0
        || (task.repeatDaily && task.streak > 0)
        || (task.counted && task.countToday > 0)

    return (
        <div className={`checklist-task-row${task.doneToday ? ' done' : ''}`}>
            {task.counted ? (
                <button
                    className="checklist-count-btn"
                    onClick={() => onIncrement(task)}
                    aria-label={`Add one to ${task.title}`}
                >
                    ＋
                </button>
            ) : (
                <input
                    type="checkbox"
                    checked={task.doneToday}
                    onChange={e => onToggle(task, e.target.checked)}
                    aria-label={`Complete ${task.title}`}
                />
            )}
            <div className="checklist-task-row__content">
                <div className="checklist-task-row__title">{task.title}</div>
                {hasMeta && (
                    <div className="checklist-task-row__meta">
                        {subtext.join(' · ')}
                        {task.counted && task.countToday > 0 && (
                            <span className="badge badge-amber checklist-count">×{task.countToday}</span>
                        )}
                        {task.repeatDaily && task.streak > 0 && (
                            <span className="badge badge-amber checklist-streak">🔥 {task.streak}</span>
                        )}
                    </div>
                )}
            </div>
            <button
                className="btn-ghost checklist-task-row__more"
                onClick={() => onOpenActions(task)}
                aria-label={`Actions for ${task.title}`}
            >
                …
            </button>
        </div>
    )
}
