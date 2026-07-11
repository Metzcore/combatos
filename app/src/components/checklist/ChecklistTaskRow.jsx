/**
 * ChecklistTaskRow.jsx — one task row inside a group card (W21)
 *
 * Checkbox · title (emoji lives in the text) · subtext (scheduled time /
 * Daily / 🔥 streak) · trailing … button opening the row-actions sheet.
 */
export default function ChecklistTaskRow({ task, onToggle, onOpenActions }) {
    const subtext = []
    if (task.scheduledTime) subtext.push(`📅 ${task.scheduledTime}`)
    if (task.repeatDaily) subtext.push('🔁 Daily')

    return (
        <div className={`checklist-task-row${task.doneToday ? ' done' : ''}`}>
            <input
                type="checkbox"
                checked={task.doneToday}
                onChange={e => onToggle(task, e.target.checked)}
                aria-label={`Complete ${task.title}`}
            />
            <div className="checklist-task-row__content">
                <div className="checklist-task-row__title">{task.title}</div>
                {(subtext.length > 0 || (task.repeatDaily && task.streak > 0)) && (
                    <div className="checklist-task-row__meta">
                        {subtext.join(' · ')}
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
