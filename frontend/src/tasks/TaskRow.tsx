import type { Task } from '../api/client'
import { PriorityStroke } from './priority'
import { PRIORITY_LABEL } from './priorityLabel'

interface TaskRowProps {
  task: Task
  onToggleDone: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskRow({ task, onToggleDone, onEdit, onDelete }: TaskRowProps) {
  return (
    <li className="flex gap-3 border-b border-rule py-3">
      <PriorityStroke priority={task.priority} faded={task.done} />
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => onToggleDone(task)}
        aria-label={`Done: ${task.name}`}
        className="mt-1 size-5 shrink-0 accent-blue-pencil"
      />
      <div className="min-w-0 flex-1">
        <p className={`break-words text-lg leading-snug ${task.done ? 'text-muted line-through' : ''}`}>{task.name}</p>
        <p className={`text-sm ${task.priority === 'URGENT' && !task.done ? 'text-red-pencil' : 'text-muted'}`}>
          {PRIORITY_LABEL[task.priority]}
        </p>
      </div>
      <div className="flex shrink-0 items-start gap-1 text-sm">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.name}`}
          className="rounded px-2 py-1 text-blue-pencil hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.name}`}
          className="rounded px-2 py-1 text-muted hover:text-red-pencil hover:underline"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
