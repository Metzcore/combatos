/**
 * Checklist.jsx — slot-4 Checklist hub (W21, polished in W22): daily habit
 * tracker.
 *
 * Groups → tasks → daily completions with derived streaks. LOCAL-ONLY:
 * zero webhook/Sheets involvement — data lives in the W21 Dexie stores via
 * hooks/useChecklist.js (deliberately outside DBProvider). One top tab for
 * now, so no TopTabs bar is rendered (the W20 shell already passes no tab
 * props to this hub).
 *
 * W22 additions: toolbar with the RESETS IN countdown (left) + Share/Import
 * (right); group `…` actions sheet + in-sheet group-name input (no prompt()
 * anywhere); configurable daily reset time; JSON export; paste-text import.
 */
import { useState } from 'react'
import { useChecklist } from '../hooks/useChecklist.js'
import { logicalDateStr } from '../utils/checklistDate.js'
import { shareOrDownloadChecklist } from '../utils/checklistShare.js'
import ChecklistGroupCard from './checklist/ChecklistGroupCard.jsx'
import QuickAddBar from './checklist/QuickAddBar.jsx'
import TaskActionsSheet from './checklist/TaskActionsSheet.jsx'
import TaskEditSheet from './checklist/TaskEditSheet.jsx'
import GroupActionsSheet from './checklist/GroupActionsSheet.jsx'
import GroupNameSheet from './checklist/GroupNameSheet.jsx'
import ResetCountdown from './checklist/ResetCountdown.jsx'
import ResetTimeSheet from './checklist/ResetTimeSheet.jsx'
import ImportSheet from './checklist/ImportSheet.jsx'

export default function Checklist() {
    const cl = useChecklist()

    // Which sheet is open (at most one in practice): task … actions, task
    // edit, group … actions, group name (create/rename), reset time, import.
    const [actionsTask, setActionsTask] = useState(null)
    const [editState, setEditState] = useState(null)       // { task } | { group } | null
    const [actionsGroupId, setActionsGroupId] = useState(null)
    const [nameState, setNameState] = useState(null)        // { group } (rename) | {} (create) | null
    const [resetSheetOpen, setResetSheetOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)

    // The group-actions sheet derives its target from the LIVE view model,
    // so Move up/down keeps working across re-renders while the sheet stays
    // open, and the sheet closes itself if the group disappears.
    const actionsGroupIdx = cl.groups.findIndex(g => g.id === actionsGroupId)
    const actionsGroup = actionsGroupIdx === -1 ? null : cl.groups[actionsGroupIdx]

    const handleToggle = (task, done) => {
        cl.setCompletion(task.id, logicalDateStr(new Date(), cl.resetTime), done)
    }

    // W24 — counted tasks: the row's ＋ sends +1, the … sheet's "− 1 today"
    // sends −1. Same logical-day stamp as binary completions.
    const handleIncrement = task => {
        cl.increment(task.id, logicalDateStr(new Date(), cl.resetTime), 1)
    }
    const handleDecrement = task => {
        cl.increment(task.id, logicalDateStr(new Date(), cl.resetTime), -1)
    }

    const handleSaveTask = fields => {
        if (editState?.task) {
            cl.updateTask(editState.task.id, fields)
        } else {
            cl.addTask({ ...fields, groupId: editState?.group?.id })
        }
    }

    const handleSaveGroupName = name => {
        if (nameState?.group) {
            cl.renameGroup(nameState.group.id, name)
        } else {
            cl.addGroup(name)
        }
    }

    const handleShare = async () => {
        const data = await cl.exportData()
        await shareOrDownloadChecklist(data)
    }

    const handleImport = async titles => {
        // Reviewer ruling: loop the hook's quickAdd (option A) — keeps the
        // hook-only layering; N local refreshes are cheap at paste scale.
        for (const title of titles) {
            await cl.quickAdd(title)
        }
    }

    return (
        <div className="app">
            <header className="page-header">
                <h1>☑️ Checklist</h1>
                <div className="subtitle">Daily Standing Orders</div>
            </header>

            <main className="content checklist-content">
                <div className="checklist-toolbar">
                    {/* Gated on loading so the countdown never mounts with the
                        default reset time before the setting has loaded. */}
                    {!cl.loading && (
                        <ResetCountdown
                            resetTime={cl.resetTime}
                            onTap={() => setResetSheetOpen(true)}
                        />
                    )}
                    <div className="checklist-toolbar__actions">
                        <button className="btn-ghost" onClick={handleShare} aria-label="Share checklist export">
                            ⇪ Share
                        </button>
                        <button className="btn-ghost" onClick={() => setImportOpen(true)} aria-label="Import checklist from text">
                            ⇩ Import
                        </button>
                    </div>
                </div>

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
                    cl.groups.map(group => (
                        <ChecklistGroupCard
                            key={group.id}
                            group={group}
                            onAddTask={g => setEditState({ group: g })}
                            onOpenGroupActions={g => setActionsGroupId(g.id)}
                            onToggleTask={handleToggle}
                            onIncrementTask={handleIncrement}
                            onOpenTaskActions={setActionsTask}
                        />
                    ))
                )}

                <button className="btn-secondary" onClick={() => setNameState({})}>
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
                onDecrement={handleDecrement}
            />

            <TaskEditSheet
                task={editState?.task ?? null}
                group={editState?.group ?? null}
                open={!!editState}
                onClose={() => setEditState(null)}
                onSave={handleSaveTask}
            />

            <GroupActionsSheet
                group={actionsGroup}
                isFirst={actionsGroupIdx === 0}
                isLast={actionsGroupIdx === cl.groups.length - 1}
                onClose={() => setActionsGroupId(null)}
                onRename={group => setNameState({ group })}
                onMove={cl.moveGroup}
                onDelete={cl.deleteGroup}
            />

            <GroupNameSheet
                open={!!nameState}
                group={nameState?.group ?? null}
                onClose={() => setNameState(null)}
                onSave={handleSaveGroupName}
            />

            <ResetTimeSheet
                open={resetSheetOpen}
                resetTime={cl.resetTime}
                onClose={() => setResetSheetOpen(false)}
                onSave={cl.updateResetTime}
            />

            <ImportSheet
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onImport={handleImport}
            />
        </div>
    )
}
