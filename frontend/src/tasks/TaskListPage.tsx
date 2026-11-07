import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage, type Task } from '../api/client'
import { CreateTaskForm } from './CreateTaskForm'
import { EditTaskDialog } from './EditTaskDialog'
import { FilterBar } from './FilterBar'
import { DEFAULT_FILTERS, isFiltered, PAGE_SIZE, parseFilters, serializeFilters, type TaskFilters } from './filters'
import { useSavingTaskIds, useTasks } from './queries'
import { TaskRow } from './TaskRow'

export function TaskListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const setFilters = useCallback(
    (next: TaskFilters) => setSearchParams(serializeFilters(next), { replace: true }),
    [setSearchParams],
  )
  const filtered = isFiltered(filters)

  const tasks = useTasks(filters)
  const savingTaskIds = useSavingTaskIds()
  const [editing, setEditing] = useState<Task | null>(null)
  // The Edit button that opened the dialog, which gets the focus back when it closes
  const editButton = useRef<HTMLElement | null>(null)
  const openEditor = useCallback((task: Task, button: HTMLElement) => {
    editButton.current = button
    setEditing(task)
  }, [])

  // Only once the close has rendered: until then the page behind the dialog is inert, and can't take focus
  useEffect(() => {
    if (editing || !editButton.current) return
    editButton.current.focus()
    editButton.current = null
  }, [editing])

  const total = tasks.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  // Past the end, e.g. after deleting the last task on the last page or from an old URL. Placeholder data still has
  // the previous query's total, so only a fresh result decides
  const pastLastPage = tasks.isSuccess && !tasks.isPlaceholderData && filters.page >= pages

  useEffect(() => {
    if (pastLastPage) setFilters({ ...filters, page: pages - 1 })
  }, [pastLastPage, filters, pages, setFilters])

  return (
    <main data-testid="task-list-page" className="mx-auto max-w-2xl px-4 pt-12 pb-24">
      {/* Out of reach of keyboard, mouse and screen readers while the dialog is open */}
      <div inert={editing !== null}>
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
          {/* Always rendered, so screen readers announce the new count after a search or filter */}
          <p aria-live="polite" data-testid="task-count" className="text-muted">
            {tasks.data && (
              <>
                {total} {total === 1 ? 'task' : 'tasks'}
                {filtered && ' match'}
              </>
            )}
          </p>
        </header>

        <CreateTaskForm />
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Past the last page, keep "Loading" up until the jump instead of a wrong "No tasks yet" */}
        {tasks.isPending || pastLastPage ? (
          <p data-testid="task-list-loading" className="mt-6 text-muted">
            Loading tasks…
          </p>
        ) : tasks.isError ? (
          <div role="alert" data-testid="task-list-error" className="mt-6">
            <p>{errorMessage(tasks.error)}</p>
            <button
              type="button"
              onClick={() => tasks.refetch()}
              data-testid="task-list-retry"
              className="mt-2 font-bold text-blue-pencil underline"
            >
              Try again
            </button>
          </div>
        ) : tasks.data.items.length === 0 ? (
          <div data-testid="task-list-empty" className="mt-6 text-muted">
            {filtered ? (
              <>
                <p>No tasks match these filters.</p>
                <button
                  type="button"
                  // Keeps the chosen order
                  onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
                  data-testid="clear-filters"
                  className="mt-2 font-bold text-blue-pencil underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <p>No tasks yet. Add the first one above.</p>
            )}
          </div>
        ) : (
          <ul aria-label="Tasks" data-testid="task-list">
            {tasks.data.items.map((task) => (
              <TaskRow key={task.id} task={task} saving={savingTaskIds.has(task.id)} onEdit={openEditor} />
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Pages" data-testid="pagination" className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={filters.page === 0}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              data-testid="pagination-previous"
              className="rounded px-3 py-1.5 text-blue-pencil disabled:text-muted disabled:opacity-50"
            >
              Previous
            </button>
            {/* Announced, since the focus stays on Previous or Next */}
            <span aria-live="polite" data-testid="pagination-status" className="text-muted">
              Page {filters.page + 1} of {pages}
            </span>
            <button
              type="button"
              disabled={filters.page + 1 >= pages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              data-testid="pagination-next"
              className="rounded px-3 py-1.5 text-blue-pencil disabled:text-muted disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        )}
      </div>

      {editing && <EditTaskDialog task={editing} onClose={() => setEditing(null)} />}
    </main>
  )
}
