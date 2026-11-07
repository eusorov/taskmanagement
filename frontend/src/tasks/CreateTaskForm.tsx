import { useId, useState, type FormEvent } from 'react'
import { ApiError, errorMessage, type Priority } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { PriorityPicker } from './priority'
import { useCreateTask } from './queries'
import { limitName, stripName } from './taskName'

export function CreateTaskForm() {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Priority>('NORMAL')
  const [done, setDone] = useState(false)
  const createTask = useCreateTask()
  const showToast = useToast()
  const nameId = useId()
  const errorId = useId()
  // Only a rejected name makes the field invalid; a server or network error isn't the input's fault
  const invalid = createTask.error instanceof ApiError && createTask.error.status === 400

  function submit(event: FormEvent) {
    event.preventDefault()
    createTask.mutate(
      { name: stripName(name), priority, done },
      {
        onSuccess: () => {
          setName('')
          setPriority('NORMAL')
          setDone(false)
          showToast('Task added')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mt-8">
      {/* Visible, unlike the placeholder, which is gone as soon as typing starts */}
      <label htmlFor={nameId} className="text-sm text-muted">
        Task name
      </label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          id={nameId}
          value={name}
          onChange={(event) => setName(limitName(event.target.value))}
          aria-invalid={invalid || undefined}
          aria-describedby={createTask.isError ? errorId : undefined}
          placeholder="What needs doing?"
          className="min-w-0 flex-1 rounded-md border border-edge bg-white px-3 py-2 text-lg placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!stripName(name) || createTask.isPending}
          className="rounded-md bg-blue-pencil px-4 py-2 font-bold text-white disabled:opacity-40"
        >
          Add task
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <PriorityPicker name="new-task-priority" value={priority} onChange={setPriority} />
        {/* For logging something that's already finished */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={done}
            onChange={(event) => setDone(event.target.checked)}
            className="size-4 accent-blue-pencil"
          />
          Already done
        </label>
      </div>
      {createTask.isError && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-pencil">
          {errorMessage(createTask.error)}
        </p>
      )}
    </form>
  )
}
