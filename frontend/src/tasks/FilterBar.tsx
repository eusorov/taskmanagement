import { useEffect, useState } from 'react'
import { PRIORITIES, type Priority } from '../api/client'
import { limitQuery, SORT_OPTIONS, type SortOption, type Status, type TaskFilters } from './filters'
import { PriorityStroke } from './priority'
import { PRIORITY_LABEL } from './priorityLabel'

const STATUSES: { value: Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
]

export const SEARCH_DELAY_MS = 250

interface FilterBarProps {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [query, setQuery] = useState(filters.query)
  const [urlQuery, setUrlQuery] = useState(filters.query)
  // Follow the URL when it changes elsewhere, e.g. "Clear filters"
  if (filters.query !== urlQuery) {
    setUrlQuery(filters.query)
    setQuery(filters.query)
  }

  // Search after a short pause in typing, not on every keystroke
  useEffect(() => {
    if (query.trim() === filters.query) return
    const timer = setTimeout(() => onChange({ ...filters, query: query.trim(), page: 0 }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query, filters, onChange])

  function togglePriority(priority: Priority) {
    const priorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority]
    onChange({ ...filters, priorities, page: 0 })
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule pb-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(limitQuery(event.target.value))}
        aria-label="Search tasks"
        placeholder="Search"
        className="w-full rounded-md border border-edge bg-white px-3 py-1.5 sm:w-56"
      />
      <div role="group" aria-label="Filter by status" className="flex gap-1">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filters.status === value}
            onClick={() => onChange({ ...filters, status: value, page: 0 })}
            className="rounded px-2.5 py-1 text-sm text-muted aria-pressed:bg-ink aria-pressed:text-white"
          >
            {label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Filter by priority" className="flex gap-1">
        {PRIORITIES.map((priority) => (
          <button
            key={priority}
            type="button"
            aria-pressed={filters.priorities.includes(priority)}
            onClick={() => togglePriority(priority)}
            className="flex items-center gap-1.5 rounded border border-transparent px-2.5 py-1 text-sm text-muted aria-pressed:border-ink aria-pressed:text-ink"
          >
            <PriorityStroke priority={priority} />
            {PRIORITY_LABEL[priority]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted sm:ml-auto">
        Sort by
        <select
          value={filters.sort}
          onChange={(event) => onChange({ ...filters, sort: event.target.value as SortOption, page: 0 })}
          className="rounded-md border border-edge bg-white px-2 py-1 text-ink"
        >
          {Object.entries(SORT_OPTIONS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
