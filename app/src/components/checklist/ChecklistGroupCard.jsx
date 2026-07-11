/**
 * ChecklistGroupCard.jsx — one group card: header actions + task rows (W21, W22)
 *
 * W22: the header keeps ONLY `+` (add task); rename / move / delete moved
 * into the `…` group-actions bottom sheet (GroupActionsSheet, opened via
 * onOpenGroupActions) — no prompt()/inline buttons survive here.
 */
import ChecklistTaskRow from './ChecklistTaskRow.jsx'

export default function ChecklistGroupCard({
    group,
    onAddTask, onOpenGroupActions,
    onToggleTask, onOpenTaskActions
}) {
    return (
        <div className="card checklist-group">
            <div className="checklist-group__header">
                <div className="checklist-group__name">{group.name}</div>
                <div className="checklist-group__actions">
                    <button className="btn-ghost" onClick={() => onAddTask(group)} aria-label={`Add task to ${group.name}`}>+</button>
                    <button className="btn-ghost" onClick={() => onOpenGroupActions(group)} aria-label={`Actions for ${group.name}`}>…</button>
                </div>
            </div>
            {group.tasks.length === 0 ? (
                <div className="checklist-group__empty">No tasks yet</div>
            ) : (
                group.tasks.map(task => (
                    <ChecklistTaskRow
                        key={task.id}
                        task={task}
                        onToggle={onToggleTask}
                        onOpenActions={onOpenTaskActions}
                    />
                ))
            )}
        </div>
    )
}
