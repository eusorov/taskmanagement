import { ApiError, errorMessage, type Task } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { PriorityStroke } from './priority'
import { PRIORITY_LABEL } from './priorityLabel'
import { useDeleteTask, useUpdateTask } from './queries'

interface TaskRowProps {
  task: Task
  /**
   * Being changed or deleted, until the list is reloaded; a click before that would send a stale version, and an edit
   * dialog opened then would start from it
   */
  saving: boolean
  /** Gets the Edit button too, to give the focus back to when the dialog closes */
  onEdit: (task: Task, button: HTMLElement) => void
}

const isStatus = (error: Error | null, status: number) => error instanceof ApiError && error.status === status

export function TaskRow({ task, saving, onEdit }: TaskRowProps) {
  const showToast = useToast()
  // Deleted elsewhere: the reload after the failed save drops this row, so a message in it would vanish too
  const toastIfDeleted = (error: Error, deleted: Task) => {
    if (isStatus(error, 404)) showToast(`“${deleted.name}” was deleted elsewhere`)
  }
  // Each row has its own mutations, so a change to another task can't replace this one's error or confirmation
  const updateTask = useUpdateTask({
    onSuccess: (_, { task: t }) => showToast(t.done ? `Reopened “${t.name}”` : `Marked “${t.name}” as done`),
    onError: (error, { task: t }) => toastIfDeleted(error, t),
  })
  const deleteTask = useDeleteTask({
    onSuccess: (_, t) => showToast(`Deleted “${t.name}”`),
    onError: toastIfDeleted,
  })
  const error = updateTask.error ?? deleteTask.error

  function dismissError() {
    updateTask.reset()
    deleteTask.reset()
  }

  return (
    // data-task-id picks one task's row; the test ids inside it are the same in every row
    <li
      aria-busy={saving}
      data-testid="task-row"
      data-task-id={task.id}
      className="flex gap-3 border-b border-rule py-3"
    >
      <PriorityStroke priority={task.priority} faded={task.done} />
      <input
        type="checkbox"
        checked={task.done}
        disabled={saving}
        onChange={() => {
          dismissError()
          updateTask.mutate({ task, changes: { done: !task.done } })
        }}
        aria-label={`Done: ${task.name}`}
        data-testid="task-done"
        className="mt-1 size-5 shrink-0 accent-blue-pencil"
      />
      <div className="min-w-0 flex-1">
        <p
          data-testid="task-name"
          className={`break-words text-lg leading-snug ${task.done ? 'text-muted line-through' : ''}`}
        >
          {task.name}
        </p>
        <p
          data-testid="task-priority"
          className={`text-sm ${task.priority === 'URGENT' && !task.done ? 'text-red-pencil' : 'text-muted'}`}>
          {PRIORITY_LABEL[task.priority]}
        </p>
        {error && !isStatus(error, 404) && (
          <div role="alert" data-testid="task-error" className="mt-1 flex items-start gap-2 text-sm text-red-pencil">
            <p>
              {/* The list has reloaded after the failed save, so the row already shows the other change */}
              {isStatus(error, 409) ? 'Changed elsewhere, now showing the latest. Try again.' : errorMessage(error)}
            </p>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss"
              data-testid="task-error-dismiss"
              className="shrink-0 px-1 text-muted"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1 text-sm">
        <button
          type="button"
          onClick={(event) => onEdit(task, event.currentTarget)}
          disabled={saving}
          aria-label={`Edit ${task.name}`}
          data-testid="task-edit"
          className="rounded px-2 py-1 text-blue-pencil hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            dismissError()
            deleteTask.mutate(task)
          }}
          disabled={saving}
          aria-label={`Delete ${task.name}`}
          data-testid="task-delete"
          className="rounded px-2 py-1 text-muted hover:text-red-pencil hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
