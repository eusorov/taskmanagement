import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ApiError, errorMessage, type Priority, type Task } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { PriorityPicker } from './priority'
import { useLoadTask, useReloadTasks, useUpdateTask } from './queries'
import { limitName, stripName } from './taskName'

interface EditTaskDialogProps {
  task: Task
  onClose: () => void
}

export function EditTaskDialog({ task: initialTask, onClose }: EditTaskDialogProps) {
  // Replaced by the latest version on "Reload task", so the next save sends that version
  const [task, setTask] = useState(initialTask)
  const [name, setName] = useState(task.name)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const updateTask = useUpdateTask()
  const loadTask = useLoadTask()
  const reloadTasks = useReloadTasks()
  const showToast = useToast()
  const error = loadTask.error ?? updateTask.error
  const status = error instanceof ApiError ? error.status : undefined
  // Changed (409) or deleted (404) by someone else: saving again can't succeed, only a reload helps
  const conflict = status === 409 || status === 404
  // Stays open while saving: the save can't be taken back, and closing would hide whether it worked
  const saving = updateTask.isPending

  useEffect(() => {
    if (saving) return
    const closeOnEscape = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  function submit(event: FormEvent) {
    event.preventDefault()
    loadTask.reset()
    updateTask.mutate(
      { task, changes: { name: stripName(name), priority } },
      {
        onSuccess: () => {
          showToast('Changes saved')
          onClose()
        },
      },
    )
  }

  // Shows the other change in the form, discarding this one, which was made on top of an older version
  function reloadTask() {
    loadTask.mutate(task.id, {
      onSuccess: (latest) => {
        setTask(latest)
        setName(latest.name)
        setPriority(latest.priority)
        updateTask.reset()
      },
      // The list shows the latest too, or drops the task if it was deleted
      onSettled: () => reloadTasks(),
    })
  }

  function reloadList() {
    reloadTasks()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center bg-ink/30 px-4 pt-24"
      onClick={saving ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInside}
        className="w-full max-w-lg rounded-lg bg-paper p-6 shadow-xl"
      >
        <h2 id="edit-task-title" className="text-xl font-bold">
          Edit task
        </h2>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(limitName(event.target.value))}
            aria-label="Task name"
            className="rounded-md border border-edge bg-white px-3 py-2 text-lg"
          />
          <PriorityPicker name="edit-task-priority" value={priority} onChange={setPriority} />
          {conflict ? (
            <div role="alert" className="rounded-md border border-red-pencil/40 bg-white p-3 text-sm">
              <p>
                {status === 404
                  ? 'Someone else deleted this task while you were editing.'
                  : 'Someone else changed this task while you were editing. Reload to see the latest version.'}
              </p>
              <button
                type="button"
                onClick={status === 404 ? reloadList : reloadTask}
                disabled={loadTask.isPending}
                className="mt-2 font-bold text-blue-pencil underline disabled:opacity-40"
              >
                {status === 404 ? 'Reload list' : 'Reload task'}
              </button>
            </div>
          ) : (
            error && (
              <p role="alert" className="text-sm text-red-pencil">
                {errorMessage(error)}
              </p>
            )
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md px-4 py-2 text-muted disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripName(name) || saving || conflict}
              className="rounded-md bg-blue-pencil px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])'

/**
 * Tab from the dialog's last control goes to its first, Shift+Tab from the first to its last, so keyboard focus never
 * reaches the page behind it. Tabbing between the controls in between is left to the browser.
 */
function keepFocusInside(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.matches(':disabled'),
  )
  const [first, last] = [focusable[0], focusable.at(-1)]
  const [edge, wrapTo] = event.shiftKey ? [first, last] : [last, first]
  if (wrapTo && document.activeElement === edge) {
    event.preventDefault()
    wrapTo.focus()
  }
}
