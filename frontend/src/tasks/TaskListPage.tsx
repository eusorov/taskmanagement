import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError, errorMessage, type Task } from '../api/client'
import { useToast } from '../feedback/toastContext'
import { CreateTaskForm } from './CreateTaskForm'
import { EditTaskDialog } from './EditTaskDialog'
import { FilterBar } from './FilterBar'
import { DEFAULT_FILTERS, isFiltered, PAGE_SIZE, parseFilters, serializeFilters, type TaskFilters } from './filters'
import { useDeleteTask, useReloadTasks, useTasks, useUpdateTask } from './queries'
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
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const reloadTasks = useReloadTasks()
  const showToast = useToast()
  const [editing, setEditing] = useState<Task | null>(null)

  const rowError = updateTask.error ?? deleteTask.error
  const rowConflict = rowError instanceof ApiError && (rowError.status === 409 || rowError.status === 404)

  function dismissRowError() {
    updateTask.reset()
    deleteTask.reset()
  }

  const total = tasks.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-2xl px-4 pt-12 pb-24">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
        {tasks.data && (
          <p className="text-muted">
            {total} {total === 1 ? 'task' : 'tasks'}
            {filtered && ' match'}
          </p>
        )}
      </header>

      <CreateTaskForm />
      <FilterBar filters={filters} onChange={setFilters} />

      {rowError && (
        <div role="alert" className="mt-4 flex items-start justify-between gap-4 rounded-md bg-white p-3 text-sm">
          <p>
            {rowConflict
              ? 'This task was changed or deleted elsewhere. Reload to see the latest list.'
              : errorMessage(rowError)}
          </p>
          <button
            type="button"
            onClick={() => {
              dismissRowError()
              if (rowConflict) reloadTasks()
            }}
            className="shrink-0 font-bold text-blue-pencil underline"
          >
            {rowConflict ? 'Reload' : 'Dismiss'}
          </button>
        </div>
      )}

      {tasks.isPending ? (
        <p className="mt-6 text-muted">Loading tasks…</p>
      ) : tasks.isError ? (
        <div role="alert" className="mt-6">
          <p>{errorMessage(tasks.error)}</p>
          <button type="button" onClick={() => tasks.refetch()} className="mt-2 font-bold text-blue-pencil underline">
            Try again
          </button>
        </div>
      ) : tasks.data.items.length === 0 ? (
        <div className="mt-6 text-muted">
          {filtered ? (
            <>
              <p>No tasks match these filters.</p>
              <button
                type="button"
                // Keeps the chosen order
                onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
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
        <ul aria-label="Tasks">
          {tasks.data.items.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggleDone={(t) => {
                dismissRowError()
                updateTask.mutate(
                  { task: t, changes: { done: !t.done } },
                  { onSuccess: () => showToast(t.done ? `Reopened “${t.name}”` : `Marked “${t.name}” as done`) },
                )
              }}
              onEdit={setEditing}
              onDelete={(t) => {
                dismissRowError()
                deleteTask.mutate(t, { onSuccess: () => showToast(`Deleted “${t.name}”`) })
              }}
            />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={filters.page === 0}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            className="rounded px-3 py-1.5 text-blue-pencil disabled:text-muted disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {filters.page + 1} of {pages}
          </span>
          <button
            type="button"
            disabled={filters.page + 1 >= pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            className="rounded px-3 py-1.5 text-blue-pencil disabled:text-muted disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}

      {editing && <EditTaskDialog task={editing} onClose={() => setEditing(null)} />}
    </main>
  )
}
