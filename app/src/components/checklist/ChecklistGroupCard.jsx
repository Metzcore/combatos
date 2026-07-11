/**
 * ChecklistGroupCard.jsx — one group card: header actions + task rows (W21)
 *
 * Header actions: + (add task) · rename · ↑ ↓ (reorder) · ✕ (delete, with
 * native confirm — reviewer ruling #4 — whose text states that the group's
 * tasks are deleted too, per ruling #1's cascade).
 */
import ChecklistTaskRow from './ChecklistTaskRow.jsx'

export default function ChecklistGroupCard({
    group, isFirst, isLast,
    onAddTask, onRename, onMove, onDelete,
    onToggleTask, onOpenTaskActions
}) {
    const handleRename = () => {
        const name = prompt('Rename group:', group.name)
        if (name && name.trim()) onRename(group.id, name.trim())
    }

    const handleDelete = () => {
        if (confirm(`Delete group "${group.name}"?\n\nAll tasks inside this group will be deleted too.`)) {
            onDelete(group.id)
        }
    }

    return (
        <div className="card checklist-group">
            <div className="checklist-group__header">
                <div className="checklist-group__name">{group.name}</div>
                <div className="checklist-group__actions">
                    <button className="btn-ghost" onClick={() => onAddTask(group)} aria-label={`Add task to ${group.name}`}>+</button>
                    <button className="btn-ghost" onClick={handleRename} aria-label={`Rename ${group.name}`}>✎</button>
                    <button className="btn-ghost" onClick={() => onMove(group.id, -1)} disabled={isFirst} aria-label={`Move ${group.name} up`}>↑</button>
                    <button className="btn-ghost" onClick={() => onMove(group.id, 1)} disabled={isLast} aria-label={`Move ${group.name} down`}>↓</button>
                    <button className="btn-ghost" onClick={handleDelete} aria-label={`Delete ${group.name}`}>✕</button>
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
