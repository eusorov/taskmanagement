import { PRIORITIES, type Priority } from '../api/client'
import { PRIORITY_LABEL } from './priorityLabel'

// Pencil strokes: the more urgent, the heavier the mark
const STROKE: Record<Priority, string> = {
  LOW: 'w-0.5 bg-graphite',
  NORMAL: 'w-1 bg-blue-pencil',
  URGENT: 'w-2 bg-red-pencil',
}

export function PriorityStroke({ priority, faded = false }: { priority: Priority; faded?: boolean }) {
  return <span aria-hidden className={`shrink-0 self-stretch rounded-full ${STROKE[priority]} ${faded ? 'opacity-30' : ''}`} />
}

interface PriorityPickerProps {
  name: string
  value: Priority
  onChange: (priority: Priority) => void
}

export function PriorityPicker({ name, value, onChange }: PriorityPickerProps) {
  return (
    <fieldset className="flex rounded-md border border-rule bg-white p-0.5">
      <legend className="sr-only">Priority</legend>
      {PRIORITIES.map((priority) => (
        <label
          key={priority}
          className="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-muted has-checked:bg-paper has-checked:font-bold has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-blue-pencil"
        >
          <input
            type="radio"
            name={name}
            value={priority}
            checked={value === priority}
            onChange={() => onChange(priority)}
            className="sr-only"
          />
          <PriorityStroke priority={priority} />
          {PRIORITY_LABEL[priority]}
        </label>
      ))}
    </fieldset>
  )
}
