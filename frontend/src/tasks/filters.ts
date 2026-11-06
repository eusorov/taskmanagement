import { PRIORITIES, type Priority } from '../api/client'

export const PAGE_SIZE = 20

export type Status = 'all' | 'open' | 'done'

/** List state kept in the URL, so a filtered view can be reloaded and shared. */
export interface TaskFilters {
  status: Status
  priorities: Priority[]
  query: string
  page: number
}

export const DEFAULT_FILTERS: TaskFilters = { status: 'all', priorities: [], query: '', page: 0 }

/** Reads filters from the URL, ignoring anything invalid. */
export function parseFilters(params: URLSearchParams): TaskFilters {
  const status = params.get('status')
  const page = Number(params.get('page'))
  return {
    status: status === 'open' || status === 'done' ? status : 'all',
    priorities: (params.get('priority') ?? '')
      .split(',')
      .filter((p): p is Priority => (PRIORITIES as string[]).includes(p)),
    query: params.get('q')?.trim() ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 0,
  }
}

/** Writes filters to the URL, leaving out defaults to keep it short. */
export function serializeFilters(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.priorities.length) params.set('priority', filters.priorities.join(','))
  if (filters.query) params.set('q', filters.query)
  if (filters.page > 0) params.set('page', String(filters.page))
  return params
}

/** The query parameters of GET /api/tasks for these filters. */
export function toListQuery(filters: TaskFilters) {
  return {
    done: filters.status === 'all' ? undefined : filters.status === 'done',
    priority: filters.priorities.length ? filters.priorities : undefined,
    q: filters.query || undefined,
    page: filters.page,
    size: PAGE_SIZE,
  }
}
