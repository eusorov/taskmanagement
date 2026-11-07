import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Priority, type Task } from '../api/client'
import { toListQuery, type TaskFilters } from './filters'

const TASKS = ['tasks'] as const

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: [...TASKS, filters],
    queryFn: async () => unwrap(await api.GET('/api/tasks', { params: { query: toListQuery(filters) } })),
    // Keep showing the current page while the next one loads
    placeholderData: keepPreviousData,
  })
}

function useTaskMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS }),
  })
}

export function useCreateTask() {
  return useTaskMutation(async (task: { name: string; priority: Priority; done: boolean }) =>
    unwrap(await api.POST('/api/tasks', { body: task })),
  )
}

export interface TaskUpdate {
  task: Task
  changes: { name?: string; priority?: Priority; done?: boolean }
}

export function useUpdateTask() {
  return useTaskMutation(async ({ task, changes }: TaskUpdate) =>
    unwrap(
      await api.PATCH('/api/tasks/{id}', {
        params: { path: { id: task.id } },
        // The version the user last saw; a stale one is rejected with 409
        body: { ...changes, version: task.version },
      }),
    ),
  )
}

export function useDeleteTask() {
  return useTaskMutation(async (task: Task) => {
    unwrap(await api.DELETE('/api/tasks/{id}', { params: { path: { id: task.id } } }))
  })
}

export function useReloadTasks() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: TASKS })
}
