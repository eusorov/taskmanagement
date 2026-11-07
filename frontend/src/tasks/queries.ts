import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { api, unwrap, type Priority, type Task } from '../api/client'
import { toListQuery, type TaskFilters } from './filters'

const TASKS = ['tasks'] as const
const UPDATE_TASK = [...TASKS, 'update'] as const
const DELETE_TASK = [...TASKS, 'delete'] as const

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: [...TASKS, filters],
    queryFn: async () => unwrap(await api.GET('/api/tasks', { params: { query: toListQuery(filters) } })),
    // Keep showing the current page while the next one loads
    placeholderData: keepPreviousData,
  })
}

/**
 * Callbacks that run for every mutation, even when the component is gone by the time it settles, e.g. a row that a
 * filter drops after its change. Those passed to `mutate` don't run then.
 */
export type TaskMutationCallbacks<V, R> = Pick<UseMutationOptions<R, Error, V>, 'onSuccess' | 'onError'>

function useTaskMutation<V, R>(
  mutationFn: (variables: V) => Promise<R>,
  mutationKey?: readonly string[],
  callbacks?: TaskMutationCallbacks<V, R>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    ...callbacks,
    mutationKey,
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

export function useUpdateTask(callbacks?: TaskMutationCallbacks<TaskUpdate, Task>) {
  return useTaskMutation(
    async ({ task, changes }: TaskUpdate) =>
      unwrap(
        await api.PATCH('/api/tasks/{id}', {
          params: { path: { id: task.id } },
          // The version the user last saw; a stale one is rejected with 409
          body: { ...changes, version: task.version },
        }),
      ),
    UPDATE_TASK,
    callbacks,
  )
}

export function useDeleteTask(callbacks?: TaskMutationCallbacks<Task, void>) {
  return useTaskMutation(
    async (task: Task) => {
      unwrap(await api.DELETE('/api/tasks/{id}', { params: { path: { id: task.id } } }))
    },
    DELETE_TASK,
    callbacks,
  )
}

/**
 * Ids of tasks whose change or delete is still saving, until the list has reloaded, from every component. A click on
 * such a task before that would send a stale version.
 */
export function useSavingTaskIds(): Set<string> {
  const updating = useMutationState({
    filters: { mutationKey: UPDATE_TASK, status: 'pending' },
    select: (mutation) => (mutation.state.variables as TaskUpdate).task.id,
  })
  const deleting = useMutationState({
    filters: { mutationKey: DELETE_TASK, status: 'pending' },
    select: (mutation) => (mutation.state.variables as Task).id,
  })
  return new Set([...updating, ...deleting])
}

/** The latest version of one task, e.g. after a save was rejected as stale. */
export function useLoadTask() {
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.GET('/api/tasks/{id}', { params: { path: { id } } })),
  })
}

export function useReloadTasks() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: TASKS })
}
