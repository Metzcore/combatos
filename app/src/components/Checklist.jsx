/**
 * Checklist.jsx — slot-4 Checklist hub v1 (W21): daily habit tracker.
 *
 * Groups → tasks → daily completions with derived streaks. LOCAL-ONLY:
 * zero webhook/Sheets involvement — data lives in the W21 Dexie stores via
 * hooks/useChecklist.js (deliberately outside DBProvider). One top tab in
 * v1, so no TopTabs bar is rendered (the W20 shell already passes no tab
 * props to this hub).
 */
import { useState } from 'react'
import { useChecklist } from '../hooks/useChecklist.js'
import { localDateStr } from '../utils/checklistDate.js'
import ChecklistGroupCard from './checklist/ChecklistGroupCard.jsx'
import QuickAddBar from './checklist/QuickAddBar.jsx'
import TaskActionsSheet from './checklist/TaskActionsSheet.jsx'
import TaskEditSheet from './checklist/TaskEditSheet.jsx'

export default function Checklist() {
    const cl = useChecklist()

    // Which sheet is open (at most one): the … actions sheet targets a task;
    // the edit sheet targets either an existing task or a group to add into.
    const [actionsTask, setActionsTask] = useState(null)
    const [editState, setEditState] = useState(null) // { task } | { group } | null

    const handleToggle = (task, done) => {
        cl.setCompletion(task.id, localDateStr(), done)
    }

    const handleCreateGroup = () => {
        const name = prompt('Group name:')
        if (name && name.trim()) cl.addGroup(name.trim())
    }

    const handleSaveTask = fields => {
        if (editState?.task) {
            cl.updateTask(editState.task.id, fields)
        } else {
            cl.addTask({ ...fields, groupId: editState?.group?.id })
        }
    }

    return (
        <div className="app">
            <header className="page-header">
                <h1>☑️ Checklist</h1>
                <div className="subtitle">Daily Standing Orders</div>
            </header>

            <main className="content checklist-content">
                {cl.loading ? (
                    <div className="checklist-empty text-dim">Loading…</div>
                ) : cl.groups.length === 0 ? (
                    <div className="card checklist-empty">
                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>☑️</div>
                        <div className="checklist-empty__title">No standing orders yet</div>
                        <div className="text-dim text-sm">
                            Type a task below to get started — it lands in a General group.
                        </div>
                    </div>
                ) : (
                    cl.groups.map((group, i) => (
                        <ChecklistGroupCard
                            key={group.id}
                            group={group}
                            isFirst={i === 0}
                            isLast={i === cl.groups.length - 1}
                            onAddTask={g => setEditState({ group: g })}
                            onRename={cl.renameGroup}
                            onMove={cl.moveGroup}
                            onDelete={cl.deleteGroup}
                            onToggleTask={handleToggle}
                            onOpenTaskActions={setActionsTask}
                        />
                    ))
                )}

                <button className="btn-secondary" onClick={handleCreateGroup}>
                    + Create Group
                </button>
            </main>

            <QuickAddBar onSubmit={cl.quickAdd} />

            <TaskActionsSheet
                task={actionsTask}
                groups={cl.groups}
                onClose={() => setActionsTask(null)}
                onEdit={task => setEditState({ task })}
                onStopRepeating={cl.stopRepeating}
                onMoveToGroup={cl.moveTask}
                onDelete={cl.deleteTask}
            />

            <TaskEditSheet
                task={editState?.task ?? null}
                group={editState?.group ?? null}
                open={!!editState}
                onClose={() => setEditState(null)}
                onSave={handleSaveTask}
            />
        </div>
    )
}
