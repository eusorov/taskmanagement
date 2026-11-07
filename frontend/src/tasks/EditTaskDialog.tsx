import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, errorMessage, type Priority, type Task } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { PriorityPicker } from './priority'
import { useReloadTasks, useUpdateTask } from './queries'
import { limitName } from './taskName'

interface EditTaskDialogProps {
  task: Task
  onClose: () => void
}

export function EditTaskDialog({ task, onClose }: EditTaskDialogProps) {
  const [name, setName] = useState(task.name)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const updateTask = useUpdateTask()
  const reloadTasks = useReloadTasks()
  const showToast = useToast()
  const status = updateTask.error instanceof ApiError ? updateTask.error.status : undefined
  // Changed (409) or deleted (404) by someone else: saving again can't succeed, only a reload helps
  const conflict = status === 409 || status === 404

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function submit(event: FormEvent) {
    event.preventDefault()
    updateTask.mutate(
      { task, changes: { name: name.trim(), priority } },
      {
        onSuccess: () => {
          showToast('Changes saved')
          onClose()
        },
      },
    )
  }

  function reload() {
    reloadTasks()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center bg-ink/30 px-4 pt-24" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
        onClick={(event) => event.stopPropagation()}
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
            className="rounded-md border border-rule bg-white px-3 py-2 text-lg"
          />
          <PriorityPicker name="edit-task-priority" value={priority} onChange={setPriority} />
          {conflict ? (
            <div role="alert" className="rounded-md border border-red-pencil/40 bg-white p-3 text-sm">
              <p>
                {status === 404
                  ? 'Someone else deleted this task while you were editing.'
                  : 'Someone else changed this task while you were editing. Reload to see the latest version.'}
              </p>
              <button type="button" onClick={reload} className="mt-2 font-bold text-blue-pencil underline">
                {status === 404 ? 'Reload list' : 'Reload task'}
              </button>
            </div>
          ) : (
            updateTask.isError && (
              <p role="alert" className="text-sm text-red-pencil">
                {errorMessage(updateTask.error)}
              </p>
            )
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || updateTask.isPending || conflict}
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
