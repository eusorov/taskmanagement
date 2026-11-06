import { useState, type FormEvent } from 'react'
import { errorMessage, type Priority } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { PriorityPicker } from './priority'
import { useCreateTask } from './queries'

export function CreateTaskForm() {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Priority>('NORMAL')
  const createTask = useCreateTask()
  const showToast = useToast()

  function submit(event: FormEvent) {
    event.preventDefault()
    createTask.mutate(
      { name: name.trim(), priority },
      {
        onSuccess: () => {
          setName('')
          setPriority('NORMAL')
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
          onChange={(event) => setName(event.target.value)}
          aria-label="Task name"
          placeholder="What needs doing?"
          maxLength={500}
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
      <div className="mt-2">
        <PriorityPicker name="new-task-priority" value={priority} onChange={setPriority} />
      </div>
      {createTask.isError && (
        <p role="alert" className="mt-2 text-sm text-red-pencil">
          {errorMessage(createTask.error)}
        </p>
      )}
    </form>
  )
}
