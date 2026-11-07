import { useState, type FormEvent } from 'react'
import { errorMessage, type Priority } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { PriorityPicker } from './priority'
import { useCreateTask } from './queries'
import { limitName } from './taskName'

export function CreateTaskForm() {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Priority>('NORMAL')
  const [done, setDone] = useState(false)
  const createTask = useCreateTask()
  const showToast = useToast()

  function submit(event: FormEvent) {
    event.preventDefault()
    createTask.mutate(
      { name: name.trim(), priority, done },
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(limitName(event.target.value))}
          aria-label="Task name"
          placeholder="What needs doing?"
          className="min-w-0 flex-1 rounded-md border border-rule bg-white px-3 py-2 text-lg placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!name.trim() || createTask.isPending}
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
        <p role="alert" className="mt-2 text-sm text-red-pencil">
          {errorMessage(createTask.error)}
        </p>
      )}
    </form>
  )
}
